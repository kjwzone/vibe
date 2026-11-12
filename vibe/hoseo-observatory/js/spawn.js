// 처음 접속할 때 관측소 안에서 망원경을 피해 무작위 시작 위치를 고르는 순수 함수
// world.js의 OBSERVATORY.radius(6), TELESCOPE_POSITION(0, 0, -2.5)과 같은 값이다.
// world.js는 three.js를 불러와 node 테스트에서 쓰기 어려워 숫자만 옮겨 적는다.
const OBSERVATORY_RADIUS = 6;
const TELESCOPE_XZ = { x: 0, z: -2.5 };

// 관측소 벽에서 1.5m 안쪽까지, 망원경에서 1.2m 떨어진 곳만 고른다.
export const SPAWN_MAX_RADIUS = OBSERVATORY_RADIUS - 1.5;
export const SPAWN_TELESCOPE_GAP = 1.2;

// rand는 0 이상 1 미만의 수를 돌려주는 함수(테스트에서 바꿔 넣는다). 원 안에서 고르게 뽑는다.
export function pickStartPosition(rand = Math.random) {
  for (let i = 0; i < 50; i++) {
    const r = SPAWN_MAX_RADIUS * Math.sqrt(rand());
    const a = rand() * Math.PI * 2;
    const x = r * Math.sin(a);
    const z = r * Math.cos(a);
    if (Math.hypot(x - TELESCOPE_XZ.x, z - TELESCOPE_XZ.z) >= SPAWN_TELESCOPE_GAP) return { x, z };
  }
  // 50번 모두 망원경 곁이면(사실상 없는 일) 남쪽 문 쪽 자리로 둔다.
  return { x: 0, z: 2 };
}
