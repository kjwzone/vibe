// astro.js의 천체 위치 계산을 기준값과 비교하는 node 테스트 (실행: node hoseo-observatory/tests/run-tests.js)
import { computeBodyPosition, computeStarPosition, computeRingOpening, computeSeparation, toCompassName, UMYEONSAN } from '../js/astro.js';
import { POLARIS } from '../js/data/stars.js';
import { NAMES, pickName, shouldYieldName } from '../js/names.js';
import { sortByVisibility, sortByMeridian, computeHoursToTransit, groupByZodiac, ZODIAC_ORDER } from '../js/constellation-order.js';
import { CONSTELLATIONS } from '../js/data/stars.js';
import { computeOverviewPose, OVERVIEW_HOLD, OVERVIEW_END } from '../js/overview.js';
import { pickStartPosition, SPAWN_MAX_RADIUS, SPAWN_TELESCOPE_GAP } from '../js/spawn.js';

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
  // 이름을 고른 시각(nameAt)이 있으면 들어온 시각보다 먼저 본다: 먼저 들어왔어도 나중에 고른 쪽이 양보한다.
  const earlyJoinerPickedLate = { name: '베라 루빈', joinedAt: 100, nameAt: 900, id: 'a' };
  const lateJoinerHadItFirst = { name: '베라 루빈', joinedAt: 200, nameAt: 200, id: 'b' };
  checkEqual('yield_laterPickerYields', shouldYieldName(earlyJoinerPickedLate, lateJoinerHadItFirst), true);
  checkEqual('yield_earlierHolderKeeps', shouldYieldName(lateJoinerHadItFirst, earlyJoinerPickedLate), false);
}

// 토성 고리: 2025-03-23 지구가 고리면을 지나 고리가 선처럼 보였고, 2017년 무렵은 가장 크게 열렸다(약 26~27°).
function testRingOpening() {
  checkNear('saturnRing_edgeOnMarch2025', computeRingOpening('saturn', new Date('2025-03-23T12:00:00Z')), 0, 1);
  checkNear('saturnRing_wideOpenOctober2017', computeRingOpening('saturn', new Date('2017-10-16T12:00:00Z')), 26.5, 1.5);
}

// 각거리: 같은 방향은 0°, 천정과 지평선은 90°.
function testSeparation() {
  checkNear('separation_same', computeSeparation({ az: 10, alt: 20 }, { az: 10, alt: 20 }), 0, 0.001);
  checkNear('separation_zenithToHorizon', computeSeparation({ az: 0, alt: 90 }, { az: 123, alt: 0 }), 90, 0.001);
}

// 별자리 정렬: 잘 보이는 순은 고도 내림차순, 자오선 순은 남중까지 남은 시간 순, 묶음 순은 황도 12궁을 양자리부터.
function testConstellationOrder() {
  const list = [
    { name: 'A', abbr: 'Ori', alt: 10, ra: 90 },
    { name: 'B', abbr: 'UMa', alt: 60, ra: 180 },
    { name: 'C', abbr: 'Ari', alt: -20, ra: 40 },
  ];
  checkEqual('visible_highestFirst', sortByVisibility(list).map((c) => c.name).join(''), 'BAC');
  // 항성시 85°: 오리온(90°)이 곧 남중, 그다음 큰곰(180°), 양(40°)은 거의 하루 뒤
  checkEqual('meridian_nextTransitFirst', sortByMeridian(list, 85).map((c) => c.name).join(''), 'ABC');
  checkNear('meridian_hoursToTransit', computeHoursToTransit(90, 85), 1 / 3, 0.001);
  checkNear('meridian_justPassedStaysFirst', computeHoursToTransit(80, 85), -1 / 3, 0.001);
  const groups = groupByZodiac(CONSTELLATIONS);
  checkEqual('zodiac_twoGroups', groups.map((g) => `${g.title}:${g.items.length}`).join(','), '대표 별자리:8,황도 12궁:12');
  checkEqual('zodiac_startsWithAries', groups[1].items.map((c) => c.abbr).join(','), ZODIAC_ORDER.join(','));
}

// 입장 조망: 4초 동안 높은 곳에 머물며 돌고, 5.5초에 평소 카메라 자리에 정확히 닿는다.
function testOverviewPose() {
  const end = { position: { x: 1, y: 2.2, z: 6.5 }, look: { x: 1, y: 2.8, z: 5.7 } };
  const start = computeOverviewPose(0, end);
  checkNear('overview_startHigh', start.position.y, 12, 0.001);
  checkNear('overview_startDistance', Math.hypot(start.position.x, start.position.z), 18, 0.001);
  const hold = computeOverviewPose(OVERVIEW_HOLD, end);
  checkNear('overview_stillHighAtHoldEnd', hold.position.y, 12, 0.001);
  checkEqual('overview_turnsDuringHold', start.position.x < 0 && hold.position.x > 0, true);
  const mid = computeOverviewPose((OVERVIEW_HOLD + OVERVIEW_END) / 2, end);
  checkEqual('overview_descendingMidway', mid.position.y < 12 && mid.position.y > end.position.y, true);
  const done = computeOverviewPose(OVERVIEW_END, end);
  checkNear('overview_endsAtCamera', Math.hypot(done.position.x - 1, done.position.y - 2.2, done.position.z - 6.5), 0, 1e-9);
  checkNear('overview_endsLookingAtSky', done.look.y, 2.8, 1e-9);
}

// 시작 위치: 1000번 뽑아도 모두 관측소 안, 망원경에서 떨어진 곳이고, 서로 겹치지 않게 흩어진다.
function testStartPosition() {
  let seed = 12345;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  const points = Array.from({ length: 1000 }, () => pickStartPosition(rand));
  checkEqual('spawn_insideObservatory', points.every((p) => Math.hypot(p.x, p.z) <= SPAWN_MAX_RADIUS + 1e-9), true);
  checkEqual('spawn_awayFromTelescope', points.every((p) => Math.hypot(p.x, p.z + 2.5) >= SPAWN_TELESCOPE_GAP), true);
  const distinct = new Set(points.map((p) => `${p.x.toFixed(1)},${p.z.toFixed(1)}`)).size;
  checkEqual('spawn_spreadOut', distinct > 500, true);
  // 처음 뽑힌 자리가 망원경 위(반지름 2.5m, 각도 180° → (0, -2.5))면 버리고 다음 자리(가운데)를 쓴다.
  const draws = [(2.5 / SPAWN_MAX_RADIUS) ** 2, 0.5, 0, 0];
  const p = pickStartPosition(() => draws.shift());
  checkNear('spawn_skipsTelescopeSpot', Math.hypot(p.x, p.z), 0, 1e-9);
}

testStartPosition();
testOverviewPose();
testConstellationOrder();
testRingOpening();
testSeparation();
testPickName();
testShouldYieldName();
testPolarisAltitudeNearLatitude();
testEquinoxNoonSunAltitude();
testAgainstStellariumWeb();
testCompassNames();

console.log(`\n통과 ${passed}개, 실패 ${failed}개`);
if (failed > 0) process.exit(1);
