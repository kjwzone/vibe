// 천문대 앱의 시작점: 렌더러를 만들고 인트로에서 천문대 화면으로 넘기며, 함께 있는 사람들을 잇는다
import * as THREE from '../vendor/three.module.min.js';
import { createWorld } from './world.js';
import { createSky } from './sky.js';
import { createIntro } from './intro.js';
import { createUi } from './ui.js';
import { createCharacter, CHARACTER_COLORS } from './character.js';
import { createControls, NAKED_FOV } from './controls.js';
import { connectRoom } from './net.js';
import { NAMES, pickName, shouldYieldName } from './names.js';
import { createSound } from './sound.js';
import { createPhotoViewer, hasPhoto } from './photo.js';
import { computeSeparation } from './astro.js';

const SKY_UPDATE_MS = 10000;
const POSE_SEND_MS = 200;
const POSE_HEARTBEAT_MS = 2000;
const PEER_TIMEOUT_MS = 8000;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.append(renderer.domElement);

const camera = new THREE.PerspectiveCamera(NAKED_FOV, 1, 0.1, 3000);
const world = createWorld();
const sky = createSky(world.scene);
sky.update(new Date());

// 나: 전에 고른 이름이 이 브라우저에 있으면 그 이름으로, 없으면 무작위로 시작한다.
const NAME_KEY = 'hoseo-observatory-name';
function loadSavedName() {
  try {
    const saved = localStorage.getItem(NAME_KEY);
    return NAMES.includes(saved) ? saved : null;
  } catch {
    return null;
  }
}
function saveName(name) {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    // 저장이 막혀 있어도 이번 접속에서는 고른 이름을 그대로 쓴다.
  }
}
const me = {
  name: loadSavedName() || pickName([]),
  joinedAt: Date.now(),
  nameAt: Date.now(),
  color: CHARACTER_COLORS[Math.floor(Math.random() * CHARACTER_COLORS.length)],
};
const myCharacter = createCharacter({ color: me.color, name: me.name });
world.scene.add(myCharacter.root);
const controls = createControls({ camera, dom: renderer.domElement, character: myCharacter, scene: world.scene });

// 함께 있는 사람들
const peers = new Map();
let lastSent = { t: 0, key: '' };

function getPose() {
  const p = controls.position;
  return { x: +p.x.toFixed(2), z: +p.z.toFixed(2), yaw: +myCharacter.root.rotation.y.toFixed(2), name: me.name, joinedAt: me.joinedAt, nameAt: me.nameAt, color: me.color };
}

function removePeer(peerId) {
  const peer = peers.get(peerId);
  if (!peer) return;
  world.scene.remove(peer.character.root);
  peers.delete(peerId);
}

function getUsedNames() {
  return [...peers.values()].map((p) => p.name);
}

// 내 이름을 바꾸고 바로 모두에게 알린다.
function setMyName(name) {
  me.name = name;
  me.nameAt = Date.now();
  myCharacter.setName(name);
  net.sendPose(getPose());
}

// 목록에서 고른 이름: 이 브라우저에 기억해 두고 다음 접속에도 쓴다.
function chooseName(name) {
  if (getUsedNames().includes(name)) return;
  saveName(name);
  setMyName(name);
}

// 상대와 이름이 겹치면 규칙에 따라 내가 다시 뽑고 바로 알린다.
function resolveNameConflict(peerId, data) {
  const other = { name: data.name, joinedAt: data.joinedAt, nameAt: data.nameAt, id: peerId };
  if (!shouldYieldName({ ...me, id: net.selfId }, other)) return;
  setMyName(pickName(getUsedNames()));
}

function receivePose(peerId, data) {
  let peer = peers.get(peerId);
  if (!peer) {
    peer = { character: createCharacter({ color: data.color, name: data.name }), name: data.name };
    peer.character.root.position.set(data.x, 0, data.z);
    world.scene.add(peer.character.root);
    peers.set(peerId, peer);
  }
  if (peer.name !== data.name) {
    peer.name = data.name;
    peer.character.setName(data.name);
  }
  peer.target = data;
  peer.lastSeen = performance.now();
  resolveNameConflict(peerId, data);
}

const net = connectRoom({
  onPose: receivePose,
  onGreet: (peerId) => peers.get(peerId)?.character.bow(),
  onLeave: removePeer,
  onJoin: (peerId) => net.sendPose(getPose(), peerId),
});

function sendPoseIfNeeded(now) {
  const pose = getPose();
  const key = `${pose.x},${pose.z},${pose.yaw},${pose.name}`;
  const due = key !== lastSent.key ? POSE_SEND_MS : POSE_HEARTBEAT_MS;
  if (now - lastSent.t < due) return;
  net.sendPose(pose);
  lastSent = { t: now, key };
}

// 위치 보내기와 소식 끊긴 사람 지우기는 화면 그리기와 떼어 타이머로 돌린다.
// 뒤에 있는 탭은 화면 그리기가 멈춰도 타이머는 돌아서, 다른 사람 화면에서 사라지지 않는다.
function tickNetwork() {
  const now = performance.now();
  sendPoseIfNeeded(now);
  peers.forEach((peer, peerId) => {
    if (now - peer.lastSeen > PEER_TIMEOUT_MS) removePeer(peerId);
  });
}
setInterval(tickNetwork, POSE_SEND_MS);

function updatePeers(dt) {
  const k = 1 - Math.exp(-10 * dt);
  peers.forEach((peer) => {
    const root = peer.character.root;
    root.position.x += (peer.target.x - root.position.x) * k;
    root.position.z += (peer.target.z - root.position.z) * k;
    const dYaw = Math.atan2(Math.sin(peer.target.yaw - root.rotation.y), Math.cos(peer.target.yaw - root.rotation.y));
    root.rotation.y += dYaw * k;
    peer.character.update(dt);
  });
}

// 화면
let mode = 'intro';
let ui = null;

// 소리: 접속 뒤 첫 클릭이나 키 입력 때 시작한다(D7). 인트로 중이면 천문대 화면에 들어올 때 시작한다.
const sound = createSound();

function refreshSoundUi() {
  if (ui) ui.setSoundState({ playing: sound.started && sound.enabled, waiting: !sound.unlocked });
}

function startSoundIfReady() {
  if (sound.unlocked && mode === 'observatory') sound.start();
  refreshSoundUi();
}

function unlockSoundOnGesture(e) {
  // 소리 버튼은 자기 동작으로 처리한다(첫 클릭이 이 버튼이어도 소리가 켜지게).
  if (e.target.closest && e.target.closest('.ui-sound')) return;
  if (sound.unlocked) return;
  sound.unlock();
  startSoundIfReady();
}
window.addEventListener('pointerdown', unlockSoundOnGesture, true);
window.addEventListener('keydown', unlockSoundOnGesture, true);

function toggleSound() {
  if (!sound.unlocked) {
    sound.unlock();
    startSoundIfReady();
    return;
  }
  sound.setEnabled(!sound.enabled);
  refreshSoundUi();
}

function pickTarget(pick) {
  const target = pick.kind === 'body'
    ? sky.bodies.find((b) => b.id === pick.id)
    : sky.constellations.find((c) => c.name === pick.name);
  controls.turnTo(target.az, target.alt);
  // 망원경 보기에서 별자리를 고르면 별자리 전체가 화면 안에 들어오도록 시야를 맞춘다.
  // 화면 아래 버튼 줄에 가리지 않도록 여유(1.6배)를 둔다.
  if (pick.kind === 'constellation' && controls.mode === 'telescope') {
    const margin = 1.6;
    const fitByHeight = target.radius * 2 * margin;
    const fitByWidth = (2 * Math.atan(Math.tan((target.radius * margin * Math.PI) / 180) / camera.aspect) * 180) / Math.PI;
    controls.setTelescopeFov(Math.max(fitByHeight, fitByWidth));
  }
}

// 망원경 보기: 천체를 빛 점 대신 원반 그림으로 보이고, 내 캐릭터와 망원경 모형은 숨긴다
// (망원경 자리에서 낮게 내려다보면 모형이 시야를 가리기 때문이다).
function enterTelescope() {
  controls.enterTelescope();
  sky.setTelescopeMode(true);
  myCharacter.root.visible = false;
  world.telescope.visible = false;
}

function leaveTelescope() {
  controls.exitTelescope();
  sky.setTelescopeMode(false);
  photoViewer.show(null);
  myCharacter.root.visible = true;
  world.telescope.visible = true;
}

// 가장 크게 확대했을 때 화면 가운데(0.4° 안)에 사진이 있는 천체가 있으면 그 사진을 띄운다.
const photoViewer = createPhotoViewer();
const PHOTO_FOV = 0.85;
const viewDir = new THREE.Vector3();
function updatePhoto() {
  if (controls.mode !== 'telescope' || camera.fov > PHOTO_FOV) {
    photoViewer.show(null);
    return;
  }
  camera.getWorldDirection(viewDir);
  const view = { alt: Math.asin(viewDir.y) * (180 / Math.PI), az: (Math.atan2(viewDir.x, -viewDir.z) * (180 / Math.PI) + 360) % 360 };
  const hit = sky.bodies.find((b) => hasPhoto(b.id) && computeSeparation(view, b) < 0.4);
  photoViewer.show(hit ? hit.id : null);
}

// 인트로가 끝나면 천문대 화면으로 들어온다. UI는 처음 한 번만 만들고, 다시 볼 때는 보이게만 한다.
function startObservatory() {
  mode = 'observatory';
  sound.setSuspended(false);
  if (ui) {
    ui.setVisible(true);
  } else {
    ui = createUi({
      sky,
      onPick: pickTarget,
      onTelescope: enterTelescope,
      onNakedEye: leaveTelescope,
      onZoom: (factor) => controls.zoomTelescope(factor),
      onGreet: () => {
        myCharacter.bow();
        net.sendGreet();
      },
      onSound: toggleSound,
      getNames: () => ({ all: NAMES, used: getUsedNames(), mine: me.name }),
      onChooseName: chooseName,
      onReplayIntro: replayIntro,
    });
  }
  startSoundIfReady();
}

let intro = createIntro({ worldCamera: camera, world, onDone: startObservatory });

// 천문대 화면에서 인트로를 처음부터 다시 본다. 끝나면 있던 자리로 돌아온다.
function replayIntro() {
  if (controls.mode === 'telescope') leaveTelescope();
  // 소리는 천문대 장소에서만 들린다. 인트로 동안 멈추고 돌아오면 다시 켠다.
  sound.setSuspended(true);
  ui.setVisible(false);
  mode = 'intro';
  intro = createIntro({ worldCamera: camera, world, onDone: startObservatory });
}

setInterval(() => {
  sky.update(new Date());
  if (ui) ui.refresh();
}, SKY_UPDATE_MS);

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

const timer = new THREE.Timer();
function renderFrame(timestamp) {
  timer.update(timestamp);
  const dt = Math.min(timer.getDelta(), 0.1);
  let target = { scene: world.scene, camera };
  if (mode === 'intro') {
    target = intro.update(dt, camera.aspect) || target;
  } else {
    controls.update(dt);
    ui.setViewState({ mode: controls.mode });
    sky.setLabelScale(Math.tan((camera.fov * Math.PI) / 360) / Math.tan(Math.PI / 6));
    if (controls.mode === 'telescope') sky.orientMoon(camera);
    updatePhoto();
  }
  myCharacter.update(dt);
  updatePeers(dt);
  sky.group.position.copy(camera.position);
  renderer.render(target.scene, target.camera);
}
renderer.setAnimationLoop(renderFrame);
