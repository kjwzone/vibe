// 내 캐릭터 걷기, 마우스로 시점 돌리기, 3인칭 카메라, 망원경 보기, 고른 대상으로 시선 돌리기
import * as THREE from '../vendor/three.module.min.js';
import { toSkyVector } from './sky.js';
import { OBSERVATORY, TELESCOPE_POSITION } from './world.js';
import { computeOverviewPose, OVERVIEW_HOLD, OVERVIEW_END } from './overview.js';

const WALK_SPEED = 2.2;
const PLAZA_RADIUS = 28;
const BODY_RADIUS = 0.3;
const EYE_HEIGHT = 1.6;
const CAMERA_DISTANCE = 5.5;
const CAMERA_LIFT = 0.6;
const PITCH_MIN = -85;
const PITCH_MAX = 85;
// 맨눈 보기는 하늘과 광장이 넓게 보이도록 75°로 둔다(R59).
export const NAKED_FOV = 75;
// 망원경 시야각: 들어갈 때 8°, 축소는 별자리 전체가 들어오는 50°까지, 확대는 0.8°까지
const TELESCOPE_FOV_START = 8;
const TELESCOPE_FOV_MAX = 50;
const TELESCOPE_FOV_MIN = 0.8;
const TURN_SECONDS = 0.8;
const CLICK_SLOP = 6;
const ARRIVE_DIST = 0.15;
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
export function createControls({ camera, dom, character, scene, start = new THREE.Vector3(0, 0, 1) }) {
  const pressed = new Set();
  const pos = start.clone();
  let az = 0;
  let alt = 35;
  let mode = 'walk';
  let turn = null;
  let drag = null;
  let walkTarget = null;
  // 입장 조망(CCTV) 중이면 { t: 지난 초 }. 조망 동안에는 걷기와 시점 돌리기를 받지 않는다.
  let overview = null;
  const dir = new THREE.Vector3();
  const head = new THREE.Vector3();
  const raycaster = new THREE.Raycaster();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();

  // 클릭한 도착점에 잠깐 보이는 작은 고리
  const marker = new THREE.Mesh(
    new THREE.RingGeometry(0.22, 0.32, 32),
    new THREE.MeshBasicMaterial({ color: '#ffd98a', transparent: true, opacity: 0, depthWrite: false }),
  );
  marker.rotation.x = -Math.PI / 2;
  marker.position.y = 0.04;
  marker.renderOrder = 6;
  scene.add(marker);

  // 화면의 한 점을 땅 위 좌표로 바꿔 걸어갈 곳으로 정한다. 하늘을 누르면 아무 일도 없다.
  function setWalkTarget(clientX, clientY) {
    const rect = dom.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    if (!raycaster.ray.intersectPlane(groundPlane, hit)) return;
    const r = Math.hypot(hit.x, hit.z);
    if (r > PLAZA_RADIUS - 0.5) hit.multiplyScalar((PLAZA_RADIUS - 0.5) / r);
    walkTarget = hit.clone().setY(0);
    marker.position.x = walkTarget.x;
    marker.position.z = walkTarget.z;
    marker.material.opacity = 0.9;
  }

  // 조망 중 클릭이나 키를 누르면 기다리지 않고 바로 내 캐릭터 뒤로 내려온다.
  function skipOverview() {
    if (overview && overview.t < OVERVIEW_HOLD) overview.t = OVERVIEW_HOLD;
  }

  window.addEventListener('keydown', (e) => {
    if (overview) {
      skipOverview();
      return;
    }
    if (KEYS[e.code]) {
      pressed.add(KEYS[e.code]);
      if (e.code.startsWith('Arrow')) e.preventDefault();
    }
  });
  window.addEventListener('keyup', (e) => pressed.delete(KEYS[e.code]));
  window.addEventListener('blur', () => pressed.clear());

  // 짧게 누르면 그 자리로 걷고, CLICK_SLOP 픽셀 넘게 끌면 시점을 돌린다.
  dom.addEventListener('pointerdown', (e) => {
    if (overview) {
      skipOverview();
      return;
    }
    drag ={ x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, moved: false };
    dom.setPointerCapture(e.pointerId);
  });
  dom.addEventListener('pointermove', (e) => {
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < CLICK_SLOP) return;
    drag.moved = true;
    const scale = (camera.fov / NAKED_FOV) * 0.25;
    az = normalizeAz(az - (e.clientX - drag.x) * scale);
    alt = Math.min(PITCH_MAX, Math.max(PITCH_MIN, alt + (e.clientY - drag.y) * scale));
    drag.x = e.clientX;
    drag.y = e.clientY;
    turn = null;
  });
  dom.addEventListener('pointerup', (e) => {
    if (drag && !drag.moved && mode === 'walk') setWalkTarget(e.clientX, e.clientY);
    drag = null;
  });
  dom.addEventListener('pointercancel', () => { drag = null; });

  function walk(dt) {
    let f = 0;
    let s = 0;
    if (pressed.has('forward')) f += 1;
    if (pressed.has('back')) f -= 1;
    if (pressed.has('right')) s += 1;
    if (pressed.has('left')) s -= 1;
    let dx = 0;
    let dz = 0;
    if (f !== 0 || s !== 0) {
      // 키보드로 걸으면 클릭으로 정한 도착점은 취소한다.
      walkTarget = null;
      const yaw = az * (Math.PI / 180);
      const step = (WALK_SPEED * dt) / Math.hypot(f, s);
      dx = (Math.sin(yaw) * f + Math.cos(yaw) * s) * step;
      dz = (-Math.cos(yaw) * f + Math.sin(yaw) * s) * step;
    } else if (walkTarget) {
      const rx = walkTarget.x - pos.x;
      const rz = walkTarget.z - pos.z;
      const dist = Math.hypot(rx, rz);
      if (dist < ARRIVE_DIST) {
        walkTarget = null;
        return;
      }
      const step = Math.min(WALK_SPEED * dt, dist);
      dx = (rx / dist) * step;
      dz = (rz / dist) * step;
    } else {
      return;
    }
    // 한 축씩 움직여 벽을 따라 미끄러지게 한다. 두 축 모두 막히면 클릭 이동을 멈춘다.
    const movedX = !checkBlocked(pos.x + dx, pos.z);
    if (movedX) pos.x += dx;
    const movedZ = !checkBlocked(pos.x, pos.z + dz);
    if (movedZ) pos.z += dz;
    if (!movedX && !movedZ) walkTarget = null;
    character.root.rotation.y = Math.atan2(-dx, -dz);
  }

  function fadeMarker(dt) {
    const m = marker.material;
    if (m.opacity <= 0) return;
    m.opacity = walkTarget ? Math.max(0.35, m.opacity - dt * 0.8) : Math.max(0, m.opacity - dt * 2);
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

  // 평소 3인칭 카메라 자리를 먼저 구하고, 그 자리를 끝점으로 삼아 조망 카메라를 놓는다.
  function placeOverviewCamera(dt) {
    overview.t += dt;
    const end = { position: camera.position.clone(), look: camera.position.clone().add(dir) };
    const p = computeOverviewPose(overview.t, end);
    camera.position.set(p.position.x, p.position.y, p.position.z);
    camera.lookAt(p.look.x, p.look.y, p.look.z);
    if (overview.t >= OVERVIEW_END) overview = null;
  }

  function update(dt) {
    if (mode === 'walk' && !overview) walk(dt);
    fadeMarker(dt);
    updateTurn(dt);
    character.root.position.copy(pos);
    placeCamera();
    if (overview) placeOverviewCamera(dt);
  }

  function setFov(fov) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }

  // 망원경 보기의 시야각을 정한다(50°~0.8°). 0.8°면 행성이 달처럼 크게 보인다.
  function setTelescopeFov(fov) {
    if (mode !== 'telescope') return;
    setFov(Math.min(TELESCOPE_FOV_MAX, Math.max(TELESCOPE_FOV_MIN, fov)));
  }

  function zoomTelescope(factor) {
    setTelescopeFov(camera.fov * factor);
  }

  dom.addEventListener('wheel', (e) => {
    if (mode !== 'telescope') return;
    e.preventDefault();
    zoomTelescope(e.deltaY > 0 ? 1.15 : 1 / 1.15);
  }, { passive: false });

  return {
    update,
    zoomTelescope,
    setTelescopeFov,
    get mode() { return mode; },
    get isOverview() { return Boolean(overview); },
    // 천문대에 들어올 때 광장을 높은 곳에서 4초 보여 준 뒤 내 캐릭터 뒤로 내려온다(R60).
    startOverview() {
      overview = { t: 0 };
      pressed.clear();
      walkTarget = null;
      drag = null;
    },
    get position() { return pos; },
    // 망원경 보기는 어디서든 고를 수 있고, 시점은 관측소 망원경 자리로 옮겨 간다.
    enterTelescope() {
      mode = 'telescope';
      pressed.clear();
      walkTarget = null;
      setFov(TELESCOPE_FOV_START);
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
