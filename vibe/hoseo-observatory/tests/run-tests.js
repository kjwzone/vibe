// astro.js의 천체 위치 계산을 기준값과 비교하는 node 테스트 (실행: node hoseo-observatory/tests/run-tests.js)
import { computeBodyPosition, computeStarPosition, toCompassName, UMYEONSAN } from '../js/astro.js';
import { POLARIS } from '../js/data/stars.js';
import { NAMES, pickName, shouldYieldName } from '../js/names.js';

let passed = 0;
let failed = 0;

function checkNear(name, actual, expected, tolerance) {
  const ok = Math.abs(actual - expected) <= tolerance;
  if (ok) passed++;
  else failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: ${actual.toFixed(2)} (기준 ${expected.toFixed(2)} ± ${tolerance})`);
}

function checkEqual(name, actual, expected) {
  const ok = actual === expected;
  if (ok) passed++;
  else failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: ${actual} (기준 ${expected})`);
}

// 북극성 고도는 관측지 위도와 거의 같다(북극성은 천구 북극에서 약 0.7° 떨어져 있다).
function testPolarisAltitudeNearLatitude() {
  const p = computeStarPosition(POLARIS[0], POLARIS[1], new Date('2026-11-11T12:00:00Z'));
  checkNear('polaris_altitudeNearLatitude', p.alt, UMYEONSAN.lat, 1);
}

// 춘분날 태양의 가장 높은 고도는 90° - 위도와 거의 같다.
function testEquinoxNoonSunAltitude() {
  let maxAlt = -90;
  const start = Date.parse('2026-03-20T00:00:00Z');
  for (let m = 0; m < 12 * 60; m += 2) {
    maxAlt = Math.max(maxAlt, computeBodyPosition('sun', new Date(start + m * 60000)).alt);
  }
  checkNear('sun_equinoxNoonAltitude', maxAlt, 90 - UMYEONSAN.lat, 1);
}

// Stellarium Web(우면산 좌표, 2026-11-11 브라우저 비교)에서 읽은 값과 0.5° 안으로 같다.
function testAgainstStellariumWeb() {
  const moon = computeBodyPosition('moon', new Date('2026-11-11T14:23:49Z'));
  checkNear('moon_azimuthMatchesStellarium', moon.az, 275.39, 0.5);
  checkNear('moon_altitudeMatchesStellarium', moon.alt, -55.91, 0.5);
  const jupiter = computeBodyPosition('jupiter', new Date('2026-11-11T14:23:30Z'));
  checkNear('jupiter_azimuthMatchesStellarium', jupiter.az, 64.0, 0.5);
  checkNear('jupiter_altitudeMatchesStellarium', jupiter.alt, -10.0, 0.5);
  const betelgeuse = computeStarPosition(88.793, 7.407, new Date('2026-11-11T14:25:30Z'));
  checkNear('betelgeuse_azimuthMatchesStellarium', betelgeuse.az, 106.49, 0.5);
  checkNear('betelgeuse_altitudeMatchesStellarium', betelgeuse.alt, 31.83, 0.5);
}

// 방위각을 8방위 이름으로 바꾼다.
function testCompassNames() {
  checkEqual('compass_north', toCompassName(359), '북');
  checkEqual('compass_east', toCompassName(92), '동');
  checkEqual('compass_southWest', toCompassName(225), '남서');
}

// 이름은 SPEC 목록 20개 중에서, 쓰이지 않은 것으로 고른다(R35, R36).
function testPickName() {
  checkEqual('names_listHasTwenty', NAMES.length, 20);
  checkEqual('pickName_returnsListedName', NAMES.includes(pickName([])), true);
  const allButOne = NAMES.slice(1);
  checkEqual('pickName_avoidsUsedNames', pickName(allButOne), NAMES[0]);
  checkEqual('pickName_numbersWhenAllUsed', pickName(NAMES, () => 0), `${NAMES[0]} 2`);
  checkEqual('pickName_skipsTakenNumber', pickName([...NAMES, `${NAMES[0]} 2`], () => 0), `${NAMES[0]} 3`);
}

// 이름이 겹치면 나중에 들어온 쪽이, 시각이 같으면 ID가 큰 쪽이 양보한다.
function testShouldYieldName() {
  const early = { name: '베라 루빈', joinedAt: 100, id: 'b' };
  const late = { name: '베라 루빈', joinedAt: 200, id: 'a' };
  checkEqual('yield_laterJoinerYields', shouldYieldName(late, early), true);
  checkEqual('yield_earlierJoinerKeeps', shouldYieldName(early, late), false);
  checkEqual('yield_sameTimeLargerIdYields', shouldYieldName({ ...early, id: 'z' }, { ...early, id: 'a' }), true);
  checkEqual('yield_sameTimeSmallerIdKeeps', shouldYieldName({ ...early, id: 'a' }, { ...early, id: 'z' }), false);
  checkEqual('yield_differentNamesKeep', shouldYieldName(late, { ...early, name: '칼 세이건' }), false);
}

testPickName();
testShouldYieldName();
testPolarisAltitudeNearLatitude();
testEquinoxNoonSunAltitude();
testAgainstStellariumWeb();
testCompassNames();

console.log(`\n통과 ${passed}개, 실패 ${failed}개`);
if (failed > 0) process.exit(1);
