// 내 캐릭터 걷기, 마우스로 시점 돌리기, 3인칭 카메라, 망원경 보기, 고른 대상으로 시선 돌리기
import * as THREE from '../vendor/three.module.min.js';
import { toSkyVector } from './sky.js';
import { OBSERVATORY, TELESCOPE_POSITION } from './world.js';

const WALK_SPEED = 2.2;
const PLAZA_RADIUS = 28;
const BODY_RADIUS = 0.3;
const EYE_HEIGHT = 1.6;
const CAMERA_DISTANCE = 4.5;
const CAMERA_LIFT = 0.6;
const PITCH_MIN = -85;
const PITCH_MAX = 85;
const NAKED_FOV = 60;
const TELESCOPE_FOV = 8;
const TELESCOPE_REACH = 2;
const TURN_SECONDS = 0.8;
const HALL = { x: -15, z: -9, r: 4.4 };
const KEYS = {
  KeyW: 'forward', ArrowUp: 'forward', KeyS: 'back', ArrowDown: 'back',
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
};

function normalizeAz(a) {
  return ((a % 360) + 360) % 360;
}

// 관측소 벽(남쪽 문 제외), 본관, 망원경 받침, 광장 가장자리에 부딪히는지 본다.
function checkBlocked(x, z) {
  const r = Math.hypot(x, z);
  if (r > PLAZA_RADIUS) return true;
  const fromSouth = Math.abs(Math.atan2(x, z)) * (180 / Math.PI);
  const inDoor = fromSouth < OBSERVATORY.doorDeg / 2 - 4;
  if (Math.abs(r - OBSERVATORY.radius) < BODY_RADIUS + 0.1 && !inDoor) return true;
  if (Math.hypot(x - TELESCOPE_POSITION.x, z - TELESCOPE_POSITION.z) < 0.25 + BODY_RADIUS) return true;
  if (Math.hypot(x - HALL.x, z - HALL.z) < HALL.r + BODY_RADIUS) return true;
  return false;
}

// 조작기를 만든다. az(방위각)와 alt(고도)는 지금 바라보는 방향이다.
export function createControls({ camera, dom, character, start = new THREE.Vector3(0, 0, 1) }) {
  const pressed = new Set();
  const pos = start.clone();
  let az = 0;
  let alt = 35;
  let mode = 'walk';
  let turn = null;
  let drag = null;
  const dir = new THREE.Vector3();
  const head = new THREE.Vector3();

  window.addEventListener('keydown', (e) => {
    if (KEYS[e.code]) {
      pressed.add(KEYS[e.code]);
      if (e.code.startsWith('Arrow')) e.preventDefault();
    }
  });
  window.addEventListener('keyup', (e) => pressed.delete(KEYS[e.code]));
  window.addEventListener('blur', () => pressed.clear());

  dom.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY };
    dom.setPointerCapture(e.pointerId);
  });
  dom.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const scale = (camera.fov / NAKED_FOV) * 0.25;
    az = normalizeAz(az - (e.clientX - drag.x) * scale);
    alt = Math.min(PITCH_MAX, Math.max(PITCH_MIN, alt + (e.clientY - drag.y) * scale));
    drag = { x: e.clientX, y: e.clientY };
    turn = null;
  });
  dom.addEventListener('pointerup', () => { drag = null; });
  dom.addEventListener('pointercancel', () => { drag = null; });

  function walk(dt) {
    let f = 0;
    let s = 0;
    if (pressed.has('forward')) f += 1;
    if (pressed.has('back')) f -= 1;
    if (pressed.has('right')) s += 1;
    if (pressed.has('left')) s -= 1;
    if (f === 0 && s === 0) return;
    const yaw = az * (Math.PI / 180);
    const len = Math.hypot(f, s);
    const step = (WALK_SPEED * dt) / len;
    const dx = (Math.sin(yaw) * f + Math.cos(yaw) * s) * step;
    const dz = (-Math.cos(yaw) * f + Math.sin(yaw) * s) * step;
    // 한 축씩 움직여 벽을 따라 미끄러지게 한다.
    if (!checkBlocked(pos.x + dx, pos.z)) pos.x += dx;
    if (!checkBlocked(pos.x, pos.z + dz)) pos.z += dz;
    character.root.rotation.y = Math.atan2(-dx, -dz);
  }

  function updateTurn(dt) {
    if (!turn) return;
    turn.t += dt;
    const k = Math.min(turn.t / TURN_SECONDS, 1);
    const e = k * k * (3 - 2 * k);
    az = normalizeAz(turn.fromAz + turn.dAz * e);
    alt = turn.fromAlt + (turn.toAlt - turn.fromAlt) * e;
    if (k >= 1) turn = null;
  }

  function placeCamera() {
    toSkyVector(az, alt, 1, dir);
    if (mode === 'telescope') {
      camera.position.copy(TELESCOPE_POSITION).setY(1.5);
    } else {
      // 카메라는 머리보다 조금 높은 뒤쪽에 둔다. 올려다보면 캐릭터가 화면 아래로 빠지고,
      // 내려다볼 때만 그만큼 위로 올라간다.
      head.set(pos.x, EYE_HEIGHT + CAMERA_LIFT, pos.z);
      const flat = Math.hypot(dir.x, dir.z) || 1;
      camera.position.set(head.x - (dir.x / flat) * CAMERA_DISTANCE, head.y, head.z - (dir.z / flat) * CAMERA_DISTANCE);
      if (dir.y < 0) camera.position.y -= dir.y * CAMERA_DISTANCE;
    }
    camera.lookAt(head.copy(camera.position).add(dir));
  }

  function update(dt) {
    if (mode === 'walk') walk(dt);
    updateTurn(dt);
    character.root.position.copy(pos);
    placeCamera();
  }

  function setFov(fov) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }

  return {
    update,
    get mode() { return mode; },
    get position() { return pos; },
    isNearTelescope() {
      return Math.hypot(pos.x - TELESCOPE_POSITION.x, pos.z - TELESCOPE_POSITION.z) <= TELESCOPE_REACH;
    },
    enterTelescope() {
      mode = 'telescope';
      pressed.clear();
      setFov(TELESCOPE_FOV);
    },
    exitTelescope() {
      mode = 'walk';
      setFov(NAKED_FOV);
    },
    // 지정한 방위각·고도가 화면 가운데에 오도록 부드럽게 돈다.
    turnTo(toAz, toAlt) {
      const dAz = ((toAz - az + 540) % 360) - 180;
      turn = { t: 0, fromAz: az, dAz, fromAlt: alt, toAlt: Math.min(PITCH_MAX, Math.max(PITCH_MIN, toAlt)) };
    },
  };
}
