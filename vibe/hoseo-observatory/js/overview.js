// 천문대 입장 때 광장을 높은 곳에서 내려다보는 CCTV 조망 카메라 위치를 시간에 따라 계산하는 순수 함수
export const OVERVIEW_HOLD = 4;
export const OVERVIEW_DESCEND = 1.5;
export const OVERVIEW_END = OVERVIEW_HOLD + OVERVIEW_DESCEND;
// 광장 남쪽 높은 곳에서 관측소와 그 둘레(사람들이 모이는 곳)를 내려다보며 20° 천천히 돈다.
// 30m·20m에서는 사람이 너무 작아 몇 명인지 세기 어려워 18m·12m로 당겼다.
const RADIUS = 18;
const HEIGHT = 12;
const START_DEG = -10;
const SWEEP_DEG = 20;

function smooth(k) {
  return k * k * (3 - 2 * k);
}

function lerp(a, b, k) {
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k };
}

// t초일 때 카메라 위치와 바라보는 점. end는 조망이 끝나고 돌아갈 평소 3인칭 카메라 {position, look}.
// 0~4초는 높은 곳에서 돌며 내려다보고, 4~5.5초에 end로 부드럽게 내려온다.
export function computeOverviewPose(t, end) {
  const hold = Math.min(Math.max(t, 0), OVERVIEW_HOLD);
  const angle = ((START_DEG + (SWEEP_DEG * hold) / OVERVIEW_HOLD) * Math.PI) / 180;
  const high = {
    position: { x: RADIUS * Math.sin(angle), y: HEIGHT, z: RADIUS * Math.cos(angle) },
    look: { x: 0, y: 0, z: 0 },
  };
  if (t <= OVERVIEW_HOLD) return high;
  const k = smooth(Math.min((t - OVERVIEW_HOLD) / OVERVIEW_DESCEND, 1));
  return { position: lerp(high.position, end.position, k), look: lerp(high.look, end.look, k) };
}
