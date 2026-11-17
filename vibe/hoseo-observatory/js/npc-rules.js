// NPC 규칙(순수 함수): 시각으로 정해지는 걷기·하늘 보기 일정, 먼저 인사·답례 판단. NPC는 늘 3명이다.
// 일정은 현재 시각(초)과 고정된 씨앗으로만 정해지므로, 모든 접속자 화면에서 같은 NPC가 같은 자리에 있다.

export const NPC_ROLES = [
  { name: '관측소 안내원', color: '#7fa7d9', home: { x: 7.5, z: 7 } },
  { name: '별 보러 온 학생', color: '#f0b46a', home: { x: -9, z: 9 } },
  { name: '동네 등산객', color: '#8cc48e', home: { x: 10, z: -9 } },
];
export const NPC_SPEED = 1.1;
export const NPC_CYCLE_S = 600;
const LOOK_MIN_S = 20;
const LOOK_MAX_S = 60;
const SPOT_MIN_R = 8;
const SPOT_MAX_R = 24;
// 피해야 할 곳: 관측소 둥근 벽(남쪽 문 빼고), 망원경 받침, 본관. 걸음이 가장자리를 스치지 않게 여유를 둔다.
const WALL_R = 6;
const WALL_MARGIN = 0.8;
const DOOR_HALF_DEG = 12;
const TELESCOPE = { x: 0, z: -2.5, r: 0.9 };
const HALL = { x: -15, z: -9, r: 5.4 };
// 관측소 구경: 문 밖 자리 → 문 안 자리 → 안쪽 한 자리. 나올 때는 거꾸로 걷는다.
const DOOR_OUT = { x: 0, z: 8.5 };
const DOOR_IN = { x: 0, z: 4.5 };
const INSIDE_MIN_R = 2;
const INSIDE_MAX_R = 4.5;
const VISIT_CHANCE = 0.35;
export const GREET_FIRST_DIST = 4;
export const RETURN_BOW_DIST = 10;

// 같은 씨앗이면 같은 수열을 내는 난수(mulberry32)
export function createRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 한 점이 벽(문 빼고)·망원경 받침·본관에 걸리는지 본다.
function checkPointBlocked(p) {
  const r = Math.hypot(p.x, p.z);
  const fromSouth = Math.abs(Math.atan2(p.x, p.z)) * (180 / Math.PI);
  if (Math.abs(r - WALL_R) < WALL_MARGIN && fromSouth > DOOR_HALF_DEG) return true;
  if (Math.hypot(p.x - TELESCOPE.x, p.z - TELESCOPE.z) < TELESCOPE.r) return true;
  return Math.hypot(p.x - HALL.x, p.z - HALL.z) < HALL.r;
}

// 두 점을 잇는 직선 길이 벽·망원경 받침·본관에 걸리지 않는지 0.1m 간격으로 본다. 관측소는 남쪽 문으로만 드나든다.
export function isPathClear(a, b) {
  const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.1));
  for (let i = 0; i <= steps; i++) {
    const k = i / steps;
    if (checkPointBlocked({ x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k })) return false;
  }
  return true;
}

// 두 점 사이를 곧장 갈 수 없으면 관측소 둘레(반지름 9m)의 한 점을 거쳐 간다. 거칠 점 목록(없으면 빈 목록), 길이 없으면 null.
function findWay(a, b) {
  if (isPathClear(a, b)) return [];
  for (let k = 0; k < 24; k++) {
    const angle = (k / 24) * Math.PI * 2;
    const p = { x: 9 * Math.sin(angle), z: 9 * Math.cos(angle) };
    if (isPathClear(a, p) && isPathClear(p, b)) return [p];
  }
  return null;
}

// 관측소 안에서 하늘을 볼 자리를 고른다. 문 안 자리에서 곧장 걸어갈 수 있어야 한다.
function pickInsideSpot(rand) {
  for (let i = 0; i < 20; i++) {
    const r = INSIDE_MIN_R + rand() * (INSIDE_MAX_R - INSIDE_MIN_R);
    const a = rand() * Math.PI * 2;
    const spot = { x: r * Math.sin(a), z: r * Math.cos(a) };
    if (isPathClear(DOOR_IN, spot)) return spot;
  }
  return null;
}

function pickSpot(rand, from) {
  for (let i = 0; i < 40; i++) {
    const r = SPOT_MIN_R + rand() * (SPOT_MAX_R - SPOT_MIN_R);
    const a = rand() * Math.PI * 2;
    const spot = { x: r * Math.sin(a), z: r * Math.cos(a) };
    if (isPathClear(from, spot)) return spot;
  }
  return null;
}

function walkSeconds(a, b) {
  return Math.hypot(b.x - a.x, b.z - a.z) / NPC_SPEED;
}

// NPC 하나의 한 주기(10분) 일정. 집에서 출발해 걷기와 하늘 보기를 되풀이하고, 주기 끝에는 집에 돌아와 있다.
// 각 구간: { type: 'walk' | 'look', t0, t1, from, to, yaw }
export function buildCycle(index, cycle) {
  const home = NPC_ROLES[index].home;
  const rand = createRandom((index + 1) * 1000003 + cycle * 7919);
  const legs = [];
  let t = 0;
  let at = home;
  const addLook = (seconds) => {
    legs.push({ type: 'look', t0: t, t1: t + seconds, from: at, to: at, yaw: rand() * Math.PI * 2 });
    t += seconds;
  };
  const addWalk = (to) => {
    const go = walkSeconds(at, to);
    legs.push({ type: 'walk', t0: t, t1: t + go, from: at, to, yaw: Math.atan2(-(to.x - at.x), -(to.z - at.z)) });
    t += go;
    at = to;
  };
  // 처음에는 집에서 잠깐 하늘을 본다.
  addLook(5 + rand() * 20);
  for (let guard = 0; guard < 20; guard++) {
    // 가끔 남쪽 문으로 관측소에 들어가 하늘을 보고 같은 문으로 나온다.
    if (rand() < VISIT_CHANCE) {
      const inside = pickInsideSpot(rand);
      const look = LOOK_MIN_S + rand() * (LOOK_MAX_S - LOOK_MIN_S);
      const wayIn = findWay(at, DOOR_OUT);
      const wayHome = findWay(DOOR_OUT, home);
      if (inside && wayIn && wayHome) {
        const goIn = [...wayIn, DOOR_OUT, DOOR_IN, inside];
        const goOut = [DOOR_IN, DOOR_OUT, ...wayHome, home];
        const routeSeconds = (start, points) => points.reduce((sum, p, k) => sum + walkSeconds(k ? points[k - 1] : start, p), 0);
        // 다녀와 집까지 가는 시간을 다 셈해도 주기 안에 들어올 때만 간다. 나와서는 집으로 곧장 갈 수 있는 자리까지만 걷는다.
        if (t + routeSeconds(at, goIn) + look + routeSeconds(inside, goOut) <= NPC_CYCLE_S) {
          goIn.forEach(addWalk);
          addLook(look);
          goOut.slice(0, -1).forEach(addWalk);
          continue;
        }
      }
    }
    const spot = pickSpot(rand, at);
    if (!spot) break;
    const go = walkSeconds(at, spot);
    const look = LOOK_MIN_S + rand() * (LOOK_MAX_S - LOOK_MIN_S);
    const back = isPathClear(spot, home) ? walkSeconds(spot, home) : Infinity;
    // 이 자리에 다녀와도 주기 안에 집으로 돌아올 수 있을 때만 간다.
    if (t + go + look + back > NPC_CYCLE_S) break;
    legs.push({ type: 'walk', t0: t, t1: t + go, from: at, to: spot, yaw: Math.atan2(-(spot.x - at.x), -(spot.z - at.z)) });
    t += go;
    at = spot;
    addLook(look);
  }
  if (at !== home) {
    const go = walkSeconds(at, home);
    legs.push({ type: 'walk', t0: t, t1: t + go, from: at, to: home, yaw: Math.atan2(-(home.x - at.x), -(home.z - at.z)) });
    t += go;
    at = home;
  }
  // 남은 시간은 집에서 하늘을 본다.
  if (t < NPC_CYCLE_S) addLook(NPC_CYCLE_S - t);
  return legs;
}

// 시각(초)에 NPC가 있는 자리와 방향, 하는 일. cache는 같은 주기를 다시 만들지 않도록 쓰는 Map(선택).
export function computeNpcPose(index, seconds, cache) {
  const cycle = Math.floor(seconds / NPC_CYCLE_S);
  const local = seconds - cycle * NPC_CYCLE_S;
  const key = `${index}:${cycle}`;
  let legs = cache?.get(key);
  if (!legs) {
    legs = buildCycle(index, cycle);
    cache?.set(key, legs);
  }
  const leg = legs.find((l) => local >= l.t0 && local < l.t1) || legs[legs.length - 1];
  const k = leg.t1 > leg.t0 ? Math.min(1, (local - leg.t0) / (leg.t1 - leg.t0)) : 1;
  return {
    x: leg.from.x + (leg.to.x - leg.from.x) * k,
    z: leg.from.z + (leg.to.z - leg.from.z) * k,
    yaw: leg.yaw,
    state: leg.type,
  };
}

// 내가 4m 안으로 다가오면, 아직 인사하지 않은 NPC가 절반 확률로 먼저 인사한다.
export function shouldGreetFirst(distance, alreadyDecided, roll) {
  return !alreadyDecided && distance <= GREET_FIRST_DIST && roll < 0.5;
}

// 내가 인사하면 10m 안의 NPC가 70% 확률로 답례한다.
export function shouldReturnBow(distance, roll) {
  return distance <= RETURN_BOW_DIST && roll < 0.7;
}
