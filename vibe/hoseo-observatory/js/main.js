// 천문대 앱의 시작점: 렌더러를 만들고 인트로에서 천문대 화면으로 넘기며, 함께 있는 사람들을 잇는다
import * as THREE from '../vendor/three.module.min.js';
import { createWorld } from './world.js';
import { createSky } from './sky.js';
import { createIntro } from './intro.js';
import { createUi } from './ui.js';
import { createCharacter, CHARACTER_COLORS } from './character.js';
import { createControls } from './controls.js';
import { connectRoom } from './net.js';
import { pickName, shouldYieldName } from './names.js';
import { createSound } from './sound.js';

const SKY_UPDATE_MS = 10000;
const POSE_SEND_MS = 200;
const POSE_HEARTBEAT_MS = 2000;
const PEER_TIMEOUT_MS = 8000;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.append(renderer.domElement);

const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 3000);
const world = createWorld();
const sky = createSky(world.scene);
sky.update(new Date());

// 나
const me = {
  name: pickName([]),
  joinedAt: Date.now(),
  color: CHARACTER_COLORS[Math.floor(Math.random() * CHARACTER_COLORS.length)],
};
const myCharacter = createCharacter({ color: me.color, name: me.name });
world.scene.add(myCharacter.root);
const controls = createControls({ camera, dom: renderer.domElement, character: myCharacter });

// 함께 있는 사람들
const peers = new Map();
let lastSent = { t: 0, key: '' };

function getPose() {
  const p = controls.position;
  return { x: +p.x.toFixed(2), z: +p.z.toFixed(2), yaw: +myCharacter.root.rotation.y.toFixed(2), name: me.name, joinedAt: me.joinedAt, color: me.color };
}

function removePeer(peerId) {
  const peer = peers.get(peerId);
  if (!peer) return;
  world.scene.remove(peer.character.root);
  peers.delete(peerId);
}

// 상대와 이름이 겹치면 규칙에 따라 내가 다시 뽑고 바로 알린다.
function resolveNameConflict(peerId, data) {
  if (!shouldYieldName({ ...me, id: net.selfId }, { name: data.name, joinedAt: data.joinedAt, id: peerId })) return;
  me.name = pickName([...peers.values()].map((p) => p.name));
  myCharacter.setName(me.name);
  net.sendPose(getPose());
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
}

function startObservatory() {
  mode = 'observatory';
  ui = createUi({
    sky,
    onPick: pickTarget,
    onTelescope: () => {
      controls.enterTelescope();
      myCharacter.root.visible = false;
    },
    onNakedEye: () => {
      controls.exitTelescope();
      myCharacter.root.visible = true;
    },
    onGreet: () => {
      myCharacter.bow();
      net.sendGreet();
    },
    onSound: toggleSound,
  });
  startSoundIfReady();
}

const intro = createIntro({ worldCamera: camera, world, onDone: startObservatory });

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
    ui.setViewState({ near: controls.isNearTelescope(), mode: controls.mode });
    sky.setLabelScale(Math.tan((camera.fov * Math.PI) / 360) / Math.tan(Math.PI / 6));
  }
  myCharacter.update(dt);
  updatePeers(dt);
  sky.group.position.copy(camera.position);
  renderer.render(target.scene, target.camera);
}
renderer.setAnimationLoop(renderFrame);
