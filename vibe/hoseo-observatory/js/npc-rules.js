// NPC 규칙(순수 함수): 몇 명 둘지, 시각으로 정해지는 걷기·하늘 보기 일정, 먼저 인사·답례 판단
// 일정은 현재 시각(초)과 고정된 씨앗으로만 정해지므로, 모든 접속자 화면에서 같은 NPC가 같은 자리에 있다.

export const NPC_ROLES = [
  { name: '관측소 안내원', color: '#7fa7d9', home: { x: 7.5, z: 7 } },
  { name: '별 보러 온 학생', color: '#f0b46a', home: { x: -9, z: 9 } },
  { name: '동네 등산객', color: '#8cc48e', home: { x: 10, z: -9 } },
];
export const NPC_TOTAL_WITH_PEOPLE = 4;
export const NPC_SPEED = 1.1;
export const NPC_CYCLE_S = 600;
const LOOK_MIN_S = 20;
const LOOK_MAX_S = 60;
const SPOT_MIN_R = 8;
const SPOT_MAX_R = 24;
// 피해야 할 곳: 관측소 둘레(벽), 본관. 걸음이 가장자리를 스치지 않게 여유를 둔다.
const OBSTACLES = [
  { x: 0, z: 0, r: 7 },
  { x: -15, z: -9, r: 5.4 },
];
export const GREET_FIRST_DIST = 4;
export const RETURN_BOW_DIST = 10;

// 실제 사람과 합쳐 4명이 되도록 NPC를 0~3명 둔다.
export function computeNpcCount(people) {
  return Math.max(0, Math.min(NPC_ROLES.length, NPC_TOTAL_WITH_PEOPLE - people));
}

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

// 점과 선분 사이의 가장 가까운 거리
function distanceToSegment(p, a, b) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / len2));
  return Math.hypot(a.x + t * dx - p.x, a.z + t * dz - p.z);
}

// 두 점을 잇는 직선 길이 관측소와 본관을 피하는지 본다.
export function isPathClear(a, b) {
  return OBSTACLES.every((o) => distanceToSegment(o, a, b) > o.r);
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
  // 처음에는 집에서 잠깐 하늘을 본다.
  addLook(5 + rand() * 20);
  for (let guard = 0; guard < 20; guard++) {
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
