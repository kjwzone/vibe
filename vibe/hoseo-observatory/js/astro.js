// 시각과 관측 좌표로 태양·달·행성·별의 방위각과 고도를 계산하는 순수 함수 모음
// 계산식: Paul Schlyter, "How to compute planetary positions" (근사 궤도 요소, 분점은 관측 시각 기준)

export const UMYEONSAN = { lat: 37.465, lon: 127.013, heightM: 293 };

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

function normalizeDeg(x) {
  return ((x % 360) + 360) % 360;
}
function sinD(x) { return Math.sin(x * RAD); }
function cosD(x) { return Math.cos(x * RAD); }

// 1970-01-01 기준 밀리초를 율리우스일로 바꾼다.
export function toJulianDay(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

// Schlyter의 일 수 d (2000-01-00.0 UT 기준)
function toDayNumber(jd) {
  return jd - 2451543.5;
}

const ELEMENTS = {
  sun: (d) => ({ N: 0, i: 0, w: 282.9404 + 4.70935e-5 * d, a: 1, e: 0.016709 - 1.151e-9 * d, M: 356.047 + 0.9856002585 * d }),
  moon: (d) => ({ N: 125.1228 - 0.0529538083 * d, i: 5.1454, w: 318.0634 + 0.1643573223 * d, a: 60.2666, e: 0.0549, M: 115.3654 + 13.0649929509 * d }),
  mercury: (d) => ({ N: 48.3313 + 3.24587e-5 * d, i: 7.0047 + 5.0e-8 * d, w: 29.1241 + 1.01444e-5 * d, a: 0.387098, e: 0.205635 + 5.59e-10 * d, M: 168.6562 + 4.0923344368 * d }),
  venus: (d) => ({ N: 76.6799 + 2.4659e-5 * d, i: 3.3946 + 2.75e-8 * d, w: 54.891 + 1.38374e-5 * d, a: 0.72333, e: 0.006773 - 1.302e-9 * d, M: 48.0052 + 1.6021302244 * d }),
  mars: (d) => ({ N: 49.5574 + 2.11081e-5 * d, i: 1.8497 - 1.78e-8 * d, w: 286.5016 + 2.92961e-5 * d, a: 1.523688, e: 0.093405 + 2.516e-9 * d, M: 18.6021 + 0.5240207766 * d }),
  jupiter: (d) => ({ N: 100.4542 + 2.76854e-5 * d, i: 1.303 - 1.557e-7 * d, w: 273.8777 + 1.64505e-5 * d, a: 5.20256, e: 0.048498 + 4.469e-9 * d, M: 19.895 + 0.0830853001 * d }),
  saturn: (d) => ({ N: 113.6634 + 2.3898e-5 * d, i: 2.4886 - 1.081e-7 * d, w: 339.3939 + 2.97661e-5 * d, a: 9.55475, e: 0.055546 - 9.499e-9 * d, M: 316.967 + 0.0334442282 * d }),
  uranus: (d) => ({ N: 74.0005 + 1.3978e-5 * d, i: 0.7733 + 1.9e-8 * d, w: 96.6612 + 3.0565e-5 * d, a: 19.18171 - 1.55e-8 * d, e: 0.047318 + 7.45e-9 * d, M: 142.5905 + 0.011725806 * d }),
  neptune: (d) => ({ N: 131.7806 + 3.0173e-5 * d, i: 1.77 - 2.55e-7 * d, w: 272.8461 - 6.027e-6 * d, a: 30.05826 + 3.313e-8 * d, e: 0.008606 + 2.15e-9 * d, M: 260.2471 + 0.005995147 * d }),
};

export const PLANET_IDS = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

// 궤도 요소로 궤도면 위치를 풀고 황도 직교 좌표(x, y, z)와 거리를 돌려준다.
function solveOrbit(el) {
  const M = normalizeDeg(el.M);
  let E = M + el.e * DEG * sinD(M) * (1 + el.e * cosD(M));
  for (let k = 0; k < 8; k++) {
    E = E - (E - el.e * DEG * sinD(E) - M) / (1 - el.e * cosD(E));
  }
  const xv = el.a * (cosD(E) - el.e);
  const yv = el.a * Math.sqrt(1 - el.e * el.e) * sinD(E);
  const v = Math.atan2(yv, xv) * DEG;
  const r = Math.hypot(xv, yv);
  const vw = v + el.w;
  return {
    x: r * (cosD(el.N) * cosD(vw) - sinD(el.N) * sinD(vw) * cosD(el.i)),
    y: r * (sinD(el.N) * cosD(vw) + cosD(el.N) * sinD(vw) * cosD(el.i)),
    z: r * sinD(vw) * sinD(el.i),
    r,
  };
}

function toLonLat(p) {
  return { lon: normalizeDeg(Math.atan2(p.y, p.x) * DEG), lat: Math.atan2(p.z, Math.hypot(p.x, p.y)) * DEG, r: Math.hypot(p.x, p.y, p.z) };
}
function fromLonLat(lon, lat, r) {
  return { x: r * cosD(lon) * cosD(lat), y: r * sinD(lon) * cosD(lat), z: r * sinD(lat) };
}

// 목성·토성·천왕성의 서로 끌어당김에 의한 황경·황위 보정(도)
function correctOuterPlanet(id, pos, d) {
  const Mj = ELEMENTS.jupiter(d).M;
  const Ms = ELEMENTS.saturn(d).M;
  const Mu = ELEMENTS.uranus(d).M;
  const ll = toLonLat(pos);
  let dLon = 0;
  let dLat = 0;
  if (id === 'jupiter') {
    dLon = -0.332 * sinD(2 * Mj - 5 * Ms - 67.6) - 0.056 * sinD(2 * Mj - 2 * Ms + 21) + 0.042 * sinD(3 * Mj - 5 * Ms + 21)
      - 0.036 * sinD(Mj - 2 * Ms) + 0.022 * cosD(Mj - Ms) + 0.023 * sinD(2 * Mj - 3 * Ms + 52) - 0.016 * sinD(Mj - 5 * Ms - 69);
  } else if (id === 'saturn') {
    dLon = 0.812 * sinD(2 * Mj - 5 * Ms - 67.6) - 0.229 * cosD(2 * Mj - 4 * Ms - 2) + 0.119 * sinD(Mj - 2 * Ms - 3)
      + 0.046 * sinD(2 * Mj - 6 * Ms - 69) + 0.014 * sinD(Mj - 3 * Ms + 32);
    dLat = -0.02 * cosD(2 * Mj - 4 * Ms - 2) + 0.018 * sinD(2 * Mj - 6 * Ms - 49);
  } else if (id === 'uranus') {
    dLon = 0.04 * sinD(Ms - 2 * Mu + 6) + 0.035 * sinD(Ms - 3 * Mu + 33) - 0.015 * sinD(Mj - Mu + 20);
  } else {
    return pos;
  }
  return fromLonLat(ll.lon + dLon, ll.lat + dLat, ll.r);
}

// 태양 중심 황도 좌표(AU). 지구는 태양 위치를 뒤집어 얻는다. 인트로의 행성 배치에 쓴다.
export function computeHeliocentric(id, jd) {
  const d = toDayNumber(jd);
  if (id === 'earth') {
    const s = solveOrbit(ELEMENTS.sun(d));
    return { x: -s.x, y: -s.y, z: 0 };
  }
  return correctOuterPlanet(id, solveOrbit(ELEMENTS[id](d)), d);
}

function computeMoonGeocentric(d) {
  const moon = toLonLat(solveOrbit(ELEMENTS.moon(d)));
  const sunEl = ELEMENTS.sun(d);
  const moonEl = ELEMENTS.moon(d);
  const Ms = sunEl.M;
  const Mm = moonEl.M;
  const Ls = sunEl.M + sunEl.w;
  const Lm = moonEl.M + moonEl.w + moonEl.N;
  const D = Lm - Ls;
  const F = Lm - moonEl.N;
  const lon = moon.lon - 1.274 * sinD(Mm - 2 * D) + 0.658 * sinD(2 * D) - 0.186 * sinD(Ms) - 0.059 * sinD(2 * Mm - 2 * D)
    - 0.057 * sinD(Mm - 2 * D + Ms) + 0.053 * sinD(Mm + 2 * D) + 0.046 * sinD(2 * D - Ms) + 0.041 * sinD(Mm - Ms)
    - 0.035 * sinD(D) - 0.031 * sinD(Mm + Ms) - 0.015 * sinD(2 * F - 2 * D) + 0.011 * sinD(Mm - 4 * D);
  const lat = moon.lat - 0.173 * sinD(F - 2 * D) - 0.055 * sinD(Mm - F - 2 * D) - 0.046 * sinD(Mm + F - 2 * D)
    + 0.033 * sinD(F + 2 * D) + 0.017 * sinD(2 * Mm + F);
  const r = moon.r - 0.58 * cosD(Mm - 2 * D) - 0.46 * cosD(2 * D);
  return fromLonLat(lon, lat, r);
}

// 지구 중심 황도 좌표를 적경·적위(도)로 바꾼다.
function toEquatorial(p, d) {
  const ecl = 23.4393 - 3.563e-7 * d;
  const ye = p.y * cosD(ecl) - p.z * sinD(ecl);
  const ze = p.y * sinD(ecl) + p.z * cosD(ecl);
  return { ra: normalizeDeg(Math.atan2(ye, p.x) * DEG), dec: Math.atan2(ze, Math.hypot(p.x, ye)) * DEG, r: Math.hypot(p.x, p.y, p.z) };
}

// 천체 하나의 적경·적위(관측 시각 분점). id는 sun, moon, mercury … neptune.
export function computeEquatorial(id, jd) {
  const d = toDayNumber(jd);
  const sun = solveOrbit(ELEMENTS.sun(d));
  if (id === 'sun') return toEquatorial(sun, d);
  if (id === 'moon') return toEquatorial(computeMoonGeocentric(d), d);
  const h = computeHeliocentric(id, jd);
  return toEquatorial({ x: h.x + sun.x, y: h.y + sun.y, z: h.z + sun.z }, d);
}

// J2000 적경·적위를 관측 시각 분점으로 세차 보정한다(IAU 1976).
export function precessFromJ2000(ra, dec, jd) {
  const T = (jd - 2451545) / 36525;
  const zeta = (2306.2181 * T + 0.30188 * T * T + 0.017998 * T ** 3) / 3600;
  const z = (2306.2181 * T + 1.09468 * T * T + 0.018203 * T ** 3) / 3600;
  const theta = (2004.3109 * T - 0.42665 * T * T - 0.041833 * T ** 3) / 3600;
  const A = cosD(dec) * sinD(ra + zeta);
  const B = cosD(theta) * cosD(dec) * cosD(ra + zeta) - sinD(theta) * sinD(dec);
  const C = sinD(theta) * cosD(dec) * cosD(ra + zeta) + cosD(theta) * sinD(dec);
  return { ra: normalizeDeg(Math.atan2(A, B) * DEG + z), dec: Math.asin(C) * DEG };
}

// 그리니치 평균 항성시(도)
function computeGmst(jd) {
  return normalizeDeg(280.46061837 + 360.98564736629 * (jd - 2451545));
}

// 관측지의 지방 항성시(도). 남쪽 자오선에 걸린 적경과 같다.
export function computeLocalSiderealTime(date, site = UMYEONSAN) {
  return normalizeDeg(computeGmst(toJulianDay(date)) + site.lon);
}

// 겉보기 고도를 높이는 대기 굴절(도, Saemundsson 식)
function computeRefraction(alt) {
  if (alt < -1) return 0;
  return 1.02 / Math.tan((alt + 10.3 / (alt + 5.11)) * RAD) / 60;
}

// 적경·적위를 관측지의 방위각(북=0°, 동=90°)과 고도로 바꾼다. parallaxDeg는 달의 지평 시차.
export function toHorizontal(ra, dec, jd, site = UMYEONSAN, parallaxDeg = 0) {
  const H = computeGmst(jd) + site.lon - ra;
  const sinAlt = sinD(site.lat) * sinD(dec) + cosD(site.lat) * cosD(dec) * cosD(H);
  let alt = Math.asin(sinAlt) * DEG;
  const az = normalizeDeg(Math.atan2(-cosD(dec) * sinD(H), sinD(dec) * cosD(site.lat) - cosD(dec) * cosD(H) * sinD(site.lat)) * DEG);
  alt -= parallaxDeg * cosD(alt);
  alt += computeRefraction(alt);
  return { az, alt };
}

// 천체 하나의 방위각·고도
export function computeBodyPosition(id, date, site = UMYEONSAN) {
  const jd = toJulianDay(date);
  const eq = computeEquatorial(id, jd);
  const parallax = id === 'moon' ? Math.asin(1 / eq.r) * DEG : 0;
  return toHorizontal(eq.ra, eq.dec, jd, site, parallax);
}

// J2000 별 좌표의 방위각·고도
export function computeStarPosition(raJ2000, decJ2000, date, site = UMYEONSAN) {
  const jd = toJulianDay(date);
  const p = precessFromJ2000(raJ2000, decJ2000, jd);
  return toHorizontal(p.ra, p.dec, jd, site);
}

// 행성 자전축 북극의 적경·적위(도, IAU). 고리가 보이는 기울기를 계산할 때 쓴다.
const POLES = {
  saturn: { ra: 40.589, dec: 83.537 },
  uranus: { ra: 257.311, dec: -15.175 },
  neptune: { ra: 299.36, dec: 43.46 },
};

// 지구에서 본 고리 기울기(도). 0이면 고리가 옆으로 누워 선처럼, 90이면 동그랗게 보인다.
export function computeRingOpening(id, date) {
  const pole = POLES[id];
  if (!pole) return 0;
  const eq = computeEquatorial(id, toJulianDay(date));
  const s = sinD(pole.dec) * sinD(eq.dec) + cosD(pole.dec) * cosD(eq.dec) * cosD(pole.ra - eq.ra);
  return Math.asin(Math.abs(s)) * DEG;
}

// 두 방향(방위각·고도) 사이의 각거리(도). 달의 위상과 망원경 가운데 판정에 쓴다.
export function computeSeparation(a, b) {
  const c = sinD(a.alt) * sinD(b.alt) + cosD(a.alt) * cosD(b.alt) * cosD(a.az - b.az);
  return Math.acos(Math.min(1, Math.max(-1, c))) * DEG;
}

// 방위각을 8방위 한글 이름으로 바꾼다.
export function toCompassName(az) {
  const names = ['북', '북동', '동', '남동', '남', '남서', '서', '북서'];
  return names[Math.round(normalizeDeg(az) / 45) % 8];
}
