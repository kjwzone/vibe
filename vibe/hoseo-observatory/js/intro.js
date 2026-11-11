// 인트로: 태양계 → 지구 → 대한민국 → 서울 → 서초구 → 우면산 → 우면산 호서 천문대 → 관측소 → 하늘로 천천히 줌 인하는 장면
import * as THREE from '../vendor/three.module.min.js';
import { computeHeliocentric, toJulianDay, PLANET_IDS, UMYEONSAN } from './astro.js';
import { toSkyVector } from './sky.js';
import { TELESCOPE_POSITION } from './world.js';
import { WORLD_LAND, KOREA_LAND, SEOUL, SEOCHO } from './data/geo.js';

// 장면 시각표(초). 15초와 26초에 장면이 바뀐다(태양계 → 지도 → 3D 산).
const T = {
  zoomEarth: 6, korea: 11, toMap: 15,
  seoul: 19, seocho: 23, mountain: 26,
  inside: 30, tilt: 32.5, end: 35,
};
const FADES = [T.toMap, T.mountain];
const CAPTIONS = [
  { text: '지구', from: 7, to: 11 },
  { text: '대한민국', from: 11.5, to: 15.2 },
  { text: '서울', from: 16, to: 19.5 },
  { text: '서초구', from: 20, to: 23.5 },
  { text: '우면산', from: 24, to: 26.2 },
  { text: '우면산 호서 천문대', from: 27, to: 30 },
  { text: '관측소', from: 30.5, to: 33 },
];

// 보여 주기용 크기와 궤도 반지름(실제 비율 아님, 8개를 셀 수 있게 정함)
const PLANETS = {
  mercury: { r: 0.5, orbit: 7, color: '#b8a999' },
  venus: { r: 0.8, orbit: 10, color: '#f1dca6' },
  earth: { r: 1.0, orbit: 13.5, color: '#2f5f9e' },
  mars: { r: 0.7, orbit: 17, color: '#d9704a' },
  jupiter: { r: 2.0, orbit: 25, color: '#d8b48a' },
  saturn: { r: 1.7, orbit: 33, color: '#e3cf98' },
  uranus: { r: 1.3, orbit: 40, color: '#9fdbe6' },
  neptune: { r: 1.3, orbit: 46, color: '#5f86e8' },
};
const AU = { mercury: 0.387, venus: 0.723, earth: 1, mars: 1.524, jupiter: 5.2, saturn: 9.55, uranus: 19.2, neptune: 30.1 };
const EARTH_PERIOD_S = 24;
const MOON_PERIOD_S = 4;
const KOREA = { lat: 36.3, lon: 127.8 };

// 지도 장면의 카메라 길목: 바라볼 경위도와 높이(km). 높이는 로그 비율로 줄여 단계마다 비슷한 빠르기로 내려간다.
const MAP_KEYS = [
  { t: T.toMap, lon: 127.8, lat: 36.3, h: 1100 },
  { t: T.seoul, lon: 126.99, lat: 37.55, h: 70 },
  { t: T.seocho, lon: 127.03, lat: 37.47, h: 16 },
  { t: T.mountain, lon: UMYEONSAN.lon, lat: UMYEONSAN.lat, h: 2.5 },
];

function easeInOut(x) {
  const t = Math.min(Math.max(x, 0), 1);
  return t * t * (3 - 2 * t);
}
function getProgress(t, from, to) {
  return easeInOut((t - from) / (to - from));
}

// 경위도를 지구본(반지름 r) 위 좌표로 바꾼다.
function toGlobe(lon, lat, r, target = new THREE.Vector3()) {
  const la = (lat * Math.PI) / 180;
  const lo = (lon * Math.PI) / 180;
  return target.set(r * Math.cos(la) * Math.cos(lo), r * Math.sin(la), -r * Math.cos(la) * Math.sin(lo));
}

// 경위도를 우면산 중심 평면 지도(km, 북=-z) 좌표로 바꾼다.
function toMap(lon, lat) {
  const kx = 111.32 * Math.cos((UMYEONSAN.lat * Math.PI) / 180);
  return [(lon - UMYEONSAN.lon) * kx, -(lat - UMYEONSAN.lat) * 110.57];
}

function createGlobeLines(rings, radius, color, opacity) {
  const group = new THREE.Group();
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
  rings.forEach((ring) => {
    const pts = [];
    for (let i = 0; i < ring.length; i += 2) pts.push(toGlobe(ring[i], ring[i + 1], radius));
    group.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), material));
  });
  return group;
}

function createSolarScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#010208');
  scene.add(new THREE.AmbientLight('#ffffff', 0.35));
  scene.add(new THREE.PointLight('#fff2d6', 3, 0, 0));

  const sun = new THREE.Mesh(new THREE.SphereGeometry(3.5, 32, 16), new THREE.MeshBasicMaterial({ color: '#ffcf6b' }));
  scene.add(sun);

  const jd = toJulianDay(new Date());
  const planets = PLANET_IDS.map((id) => {
    const p = PLANETS[id];
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(p.r, 48, 24), new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.8 }));
    const holder = new THREE.Group();
    holder.add(mesh);
    scene.add(holder);
    if (id === 'saturn') {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(p.r * 1.4, p.r * 2.2, 48),
        new THREE.MeshBasicMaterial({ color: '#cdb98a', side: THREE.DoubleSide, transparent: true, opacity: 0.7 }),
      );
      ring.rotation.x = -Math.PI / 2.4;
      holder.add(ring);
    }
    const orbitPts = [];
    for (let a = 0; a <= 128; a++) {
      const th = (a / 128) * Math.PI * 2;
      orbitPts.push(new THREE.Vector3(Math.cos(th) * p.orbit, 0, -Math.sin(th) * p.orbit));
    }
    scene.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(orbitPts),
      new THREE.LineBasicMaterial({ color: '#2b3550', transparent: true, opacity: 0.6 }),
    ));
    // 처음 각도는 오늘 실제 행성의 태양 중심 황경으로 정한다.
    const h = computeHeliocentric(id, jd);
    const angle0 = Math.atan2(h.y, h.x);
    const omega = (Math.PI * 2) / (EARTH_PERIOD_S * AU[id] ** 0.6);
    return { id, holder, mesh, orbit: p.orbit, angle: angle0, omega };
  });

  // 지구본: 공공 영역 지도(Natural Earth)의 대륙 윤곽과 한반도 정밀 윤곽
  const earth = planets.find((p) => p.id === 'earth');
  earth.holder.add(createGlobeLines(WORLD_LAND, 1.003, '#8fc6a0', 0.55));
  earth.holder.add(createGlobeLines(KOREA_LAND, 1.004, '#d7f0dc', 0.9));
  const koreaDir = toGlobe(KOREA.lon, KOREA.lat, 1);

  const moon = new THREE.Mesh(new THREE.SphereGeometry(0.27, 16, 8), new THREE.MeshStandardMaterial({ color: '#d8d6cf' }));
  scene.add(moon);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.005, 1000);
  return { scene, camera, planets, earth, moon, koreaDir, moonAngle: 0 };
}

// 지도 장면: 바다 위 한반도 육지, 서울과 서초구 경계, 우면산 표시. 평면이라 깊이 대신 그리기 순서로 겹친다.
function createMapScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#081426');
  const flatMat = (color, order, opacity = 1) => {
    const m = new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthTest: false, side: THREE.DoubleSide });
    return { m, order };
  };
  const lineMat = (color, opacity) => new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthTest: false });

  function addRings(rings, fill, line) {
    const group = new THREE.Group();
    rings.forEach((ring) => {
      const pts = [];
      for (let i = 0; i < ring.length; i += 2) {
        const [x, z] = toMap(ring[i], ring[i + 1]);
        pts.push(new THREE.Vector2(x, -z));
      }
      if (fill) {
        const mesh = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(pts)), fill.m);
        mesh.rotation.x = -Math.PI / 2;
        mesh.renderOrder = fill.order;
        group.add(mesh);
      }
      if (line) {
        const loop = new THREE.LineLoop(
          new THREE.BufferGeometry().setFromPoints(pts.map((p) => new THREE.Vector3(p.x, 0, -p.y))),
          line,
        );
        loop.renderOrder = fill ? fill.order + 1 : 10;
        group.add(loop);
      }
    });
    scene.add(group);
    return group;
  }

  addRings(KOREA_LAND, flatMat('#1b3324', 1), lineMat('#6fa383', 0.8));
  const seoulFill = flatMat('#2c5a43', 3, 0);
  const seoulLine = lineMat('#cfe9d6', 0);
  addRings(SEOUL, seoulFill, seoulLine);
  const seochoFill = flatMat('#4c8a63', 5, 0);
  const seochoLine = lineMat('#f3e6b8', 0);
  addRings(SEOCHO, seochoFill, seochoLine);

  // 우면산 표시: 가운데 점과 천천히 숨 쉬는 고리
  const dot = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({ color: '#ffd98a', depthTest: false, transparent: true, opacity: 0 }));
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.6, 1.9, 48), new THREE.MeshBasicMaterial({ color: '#ffd98a', depthTest: false, transparent: true, opacity: 0 }));
  [dot, ring].forEach((m) => {
    m.rotation.x = -Math.PI / 2;
    m.renderOrder = 20;
    scene.add(m);
  });

  const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 10000);
  return { scene, camera, seoulFill, seoulLine, seochoFill, seochoLine, dot, ring };
}

function createOverlay(onSkip) {
  const caption = document.createElement('div');
  caption.className = 'intro-caption';
  const fade = document.createElement('div');
  fade.className = 'intro-fade';
  const skip = document.createElement('button');
  skip.className = 'intro-skip';
  skip.type = 'button';
  skip.textContent = '건너뛰기';
  skip.addEventListener('click', onSkip);
  document.body.append(caption, fade, skip);
  return { caption, fade, skip };
}

// 인트로를 만든다. update(dt)는 이번 프레임에 그릴 장면과 카메라를 돌려준다.
export function createIntro({ worldCamera, world, onDone }) {
  const solar = createSolarScene();
  const map = createMapScene();
  let t = 0;
  let finished = false;
  const overlay = createOverlay(() => { t = T.end; });
  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();
  const lookAt = new THREE.Vector3();
  world.mountain.visible = true;

  function updateSolar(dt) {
    const speed = t < T.zoomEarth ? 1 : 1 - 0.95 * getProgress(t, T.zoomEarth, T.zoomEarth + 2);
    solar.planets.forEach((p) => {
      p.angle += p.omega * dt * speed;
      p.holder.position.set(Math.cos(p.angle) * p.orbit, 0, -Math.sin(p.angle) * p.orbit);
    });
    solar.moonAngle += ((Math.PI * 2) / MOON_PERIOD_S) * dt * speed;
    const e = solar.earth.holder.position;
    solar.moon.position.set(e.x + Math.cos(solar.moonAngle) * 2, 0.2, e.z - Math.sin(solar.moonAngle) * 2);

    const cam = solar.camera;
    const camAngle = 0.6 + t * 0.03;
    // 좁은 화면에서도 해왕성 궤도까지 들어오도록 화면 비율에 맞춰 물러선다.
    const fit = Math.max(1, 1.5 / cam.aspect);
    const overview = tmpA.set(Math.sin(camAngle) * 82 * fit, 44 * fit, Math.cos(camAngle) * 82 * fit);
    if (t < T.zoomEarth) {
      cam.position.copy(overview);
      cam.lookAt(0, 0, 0);
      return;
    }
    const outward = tmpB.copy(overview).sub(e).normalize();
    if (t < T.korea) {
      // 높이를 로그 비율로 줄여 천천히 다가간다.
      const k = getProgress(t, T.zoomEarth, T.korea);
      const dist = overview.distanceTo(e) * Math.pow(4 / overview.distanceTo(e), k);
      cam.position.copy(e).addScaledVector(outward, dist);
      lookAt.set(0, 0, 0).lerp(e, Math.min(1, k * 1.5));
      cam.lookAt(lookAt);
      return;
    }
    const k = getProgress(t, T.korea, T.toMap);
    const dir = outward.clone().lerp(solar.koreaDir, k).normalize();
    cam.position.copy(e).addScaledVector(dir, 4 * Math.pow(1.18 / 4, k));
    lookAt.copy(e).addScaledVector(solar.koreaDir, k);
    cam.lookAt(lookAt);
  }

  function updateMap() {
    let i = 0;
    while (i < MAP_KEYS.length - 2 && t > MAP_KEYS[i + 1].t) i++;
    const a = MAP_KEYS[i];
    const b = MAP_KEYS[i + 1];
    const k = getProgress(t, a.t, b.t);
    const lon = a.lon + (b.lon - a.lon) * k;
    const lat = a.lat + (b.lat - a.lat) * k;
    const h = a.h * Math.pow(b.h / a.h, k);
    const [x, z] = toMap(lon, lat);
    const cam = map.camera;
    cam.position.set(x, h, z + h * 0.35);
    cam.near = h * 0.01;
    cam.far = h * 50;
    cam.updateProjectionMatrix();
    cam.lookAt(x, 0, z);

    // 단계에 맞춰 서울, 서초구, 우면산 표시를 서서히 밝힌다.
    const seoulOn = getProgress(t, T.toMap + 1.5, T.seoul - 1);
    map.seoulFill.m.opacity = 0.55 * seoulOn;
    map.seoulLine.opacity = seoulOn;
    const seochoOn = getProgress(t, T.seoul + 0.5, T.seocho - 1);
    map.seochoFill.m.opacity = 0.6 * seochoOn;
    map.seochoLine.opacity = seochoOn;
    const markOn = getProgress(t, T.seocho, T.mountain - 1.5);
    const size = h * 0.03;
    map.dot.scale.setScalar(size);
    map.ring.scale.setScalar(size * (1 + 0.15 * Math.sin(t * 3)));
    map.dot.material.opacity = markOn;
    map.ring.material.opacity = 0.8 * markOn;
  }

  function updateWorld() {
    const cam = worldCamera;
    if (t < T.inside) {
      const k = getProgress(t, T.mountain, T.inside);
      cam.position.set(60, 260, 220).lerp(tmpA.set(8, 22, 26), k);
      cam.lookAt(0, 0, 0);
      return;
    }
    const eye = tmpA.set(0, 1.6, 4.5);
    const scope = tmpB.copy(TELESCOPE_POSITION).setY(1.3);
    if (t < T.tilt) {
      const k = getProgress(t, T.inside, T.tilt);
      cam.position.set(8, 22, 26).lerp(eye, k);
      lookAt.set(0, 0, 0).lerp(scope, k);
      cam.lookAt(lookAt);
      return;
    }
    const k = getProgress(t, T.tilt, T.end - 0.5);
    cam.position.copy(eye);
    const skyPoint = toSkyVector(0, 35, 100).add(eye);
    lookAt.copy(scope).lerp(skyPoint, k);
    cam.lookAt(lookAt);
  }

  function updateOverlay() {
    const c = CAPTIONS.find((x) => t >= x.from && t < x.to);
    if (c) overlay.caption.textContent = c.text;
    overlay.caption.classList.toggle('is-visible', Boolean(c));
    overlay.fade.classList.toggle('is-visible', FADES.some((f) => t > f - 0.4 && t < f));
  }

  function finish() {
    finished = true;
    world.mountain.visible = false;
    overlay.caption.remove();
    overlay.fade.remove();
    overlay.skip.remove();
    onDone();
  }

  function update(dt, aspect) {
    if (finished) return null;
    t += dt;
    if (t >= T.end) {
      finish();
      return null;
    }
    updateOverlay();
    if (t < T.toMap) {
      solar.camera.aspect = aspect;
      solar.camera.updateProjectionMatrix();
      updateSolar(dt);
      return { scene: solar.scene, camera: solar.camera };
    }
    if (t < T.mountain) {
      map.camera.aspect = aspect;
      updateMap();
      return { scene: map.scene, camera: map.camera };
    }
    updateWorld();
    return { scene: world.scene, camera: worldCamera };
  }

  return { update };
}
