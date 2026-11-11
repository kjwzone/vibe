// 우면산에서 올려다본 천구: 방위 글자, 태양·달·행성, 별, 별자리 선을 그리고 시각에 맞춰 옮긴다
import * as THREE from '../vendor/three.module.min.js';
import { computeBodyPosition, computeStarPosition, computeRingOpening, computeSeparation } from './astro.js';
import { CONSTELLATIONS, STARS } from './data/stars.js';
import { createTextSprite, createGlowTexture, createDiscTexture } from './labels.js';
import { createBodyTexture, getDiscRadius } from './planet-art.js';

export const SKY_RADIUS = 500;
const RAD = Math.PI / 180;
const BELOW_COLOR = new THREE.Color('#8a8f99');

export const BODIES = [
  { id: 'sun', name: '태양', color: '#ffd77a', size: 16 },
  { id: 'moon', name: '달', color: '#f2f0e6', size: 14 },
  { id: 'mercury', name: '수성', color: '#c9b8a6', size: 4 },
  { id: 'venus', name: '금성', color: '#fff3c8', size: 5.5 },
  { id: 'mars', name: '화성', color: '#ff9a6b', size: 4.5 },
  { id: 'jupiter', name: '목성', color: '#ffe2b0', size: 5.5 },
  { id: 'saturn', name: '토성', color: '#f0d9a0', size: 5 },
  { id: 'uranus', name: '천왕성', color: '#a8e6f0', size: 4 },
  { id: 'neptune', name: '해왕성', color: '#8fb0ff', size: 4 },
];

// 방위각(북=0°, 동=90°)과 고도를 three.js 좌표(북=-z, 동=+x, 위=+y)로 바꾼다.
export function toSkyVector(az, alt, r = 1, target = new THREE.Vector3()) {
  const ca = Math.cos(alt * RAD);
  return target.set(r * ca * Math.sin(az * RAD), r * Math.sin(alt * RAD), -r * ca * Math.cos(az * RAD));
}

function createCompass(group) {
  [['북', 0], ['동', 90], ['남', 180], ['서', 270]].forEach(([text, az]) => {
    const sprite = createTextSprite(text, { height: 20, weight: 500 });
    sprite.material.color.set(text === '북' ? '#ff9c8a' : '#d8deeb');
    sprite.position.copy(toSkyVector(az, 3, SKY_RADIUS * 0.98));
    sprite.renderOrder = 1;
    group.add(sprite);
  });
  const pts = [];
  for (let a = 0; a <= 360; a += 2) pts.push(toSkyVector(a, 0, SKY_RADIUS * 0.99));
  const ring = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color: '#3a4a5e', transparent: true, opacity: 0.6, depthWrite: false }),
  );
  group.add(ring);
}

function createStarLayer(group, texture) {
  const bins = [
    { max: 1.5, size: 7 },
    { max: 2.5, size: 5.2 },
    { max: 3.5, size: 3.8 },
    { max: 4.6, size: 2.8 },
  ];
  return bins.map((bin, k) => {
    const stars = STARS.filter((s) => s[2] <= bin.max && (k === 0 || s[2] > bins[k - 1].max));
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(stars.length * 3), 3));
    const material = new THREE.PointsMaterial({
      size: bin.size, sizeAttenuation: false, map: texture, color: '#e8eefc',
      transparent: true, depthWrite: false,
    });
    const points = new THREE.Points(geometry, material);
    group.add(points);
    return { stars, points };
  });
}

function createConstellations(group) {
  return CONSTELLATIONS.map((c) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(c.lines.length * 6), 3));
    const lines = new THREE.LineSegments(
      geometry,
      new THREE.LineBasicMaterial({ color: '#6f8cc9', transparent: true, opacity: 0.5, depthWrite: false }),
    );
    const label = createTextSprite(c.name, { height: 13 });
    label.material.color.set('#8ea3cf');
    label.material.opacity = 0.75;
    group.add(lines, label);
    return { name: c.name, data: c, lines, label, az: 0, alt: 0 };
  });
}

function createBodies(group) {
  const glow = createGlowTexture();
  const disc = createDiscTexture();
  return BODIES.map((b) => {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: b.id === 'moon' ? disc : glow, color: b.color, transparent: true, depthWrite: false,
    }));
    sprite.scale.set(b.size, b.size, 1);
    const label = createTextSprite(b.name, { height: 12 });
    // 망원경 모습: 원반 지름이 size가 되도록 캔버스 전체 크기를 맞춘다(고리는 그 바깥으로 그려진다).
    const detail = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
    const span = (b.size * 512) / (2 * getDiscRadius(b.id));
    detail.scale.set(span, span, 1);
    detail.visible = false;
    group.add(sprite, label, detail);
    return { ...b, sprite, label, detail, az: 0, alt: 0, below: false };
  });
}

// 천구를 만들어 장면에 넣는다. group은 매 프레임 카메라 위치로 옮겨 무한히 먼 하늘처럼 보이게 한다.
export function createSky(scene) {
  const group = new THREE.Group();
  group.renderOrder = 0;
  scene.add(group);
  const starTexture = createGlowTexture(0.2);
  createCompass(group);
  const starLayers = createStarLayer(group, starTexture);
  const constellations = createConstellations(group);
  const bodies = createBodies(group);
  const tmp = new THREE.Vector3();

  function updateStars(date) {
    starLayers.forEach(({ stars, points }) => {
      const arr = points.geometry.attributes.position.array;
      stars.forEach((s, i) => {
        const p = computeStarPosition(s[0], s[1], date);
        toSkyVector(p.az, p.alt, SKY_RADIUS, tmp).toArray(arr, i * 3);
      });
      points.geometry.attributes.position.needsUpdate = true;
    });
  }

  function updateConstellations(date) {
    constellations.forEach((c) => {
      const vecs = c.data.stars.map((s) => {
        const p = computeStarPosition(s[0], s[1], date);
        return toSkyVector(p.az, p.alt, SKY_RADIUS * 0.995);
      });
      const arr = c.lines.geometry.attributes.position.array;
      c.data.lines.forEach(([a, b], i) => {
        vecs[a].toArray(arr, i * 6);
        vecs[b].toArray(arr, i * 6 + 3);
      });
      c.lines.geometry.attributes.position.needsUpdate = true;
      c.lines.geometry.computeBoundingSphere();
      const center = vecs.reduce((acc, v) => acc.add(v), new THREE.Vector3()).normalize();
      c.alt = Math.asin(center.y) / RAD;
      c.az = ((Math.atan2(center.x, -center.z) / RAD) + 360) % 360;
      c.label.position.copy(center.multiplyScalar(SKY_RADIUS * 0.99));
    });
  }

  function updateBodies(date) {
    bodies.forEach((b) => {
      const p = computeBodyPosition(b.id, date);
      b.az = p.az;
      b.alt = p.alt;
      b.below = p.alt < 0;
      toSkyVector(p.az, p.alt, SKY_RADIUS * 0.97, b.sprite.position);
      toSkyVector(p.az, p.alt - b.size / 18 - 1.8, SKY_RADIUS * 0.97, b.label.position);
      // 지평선 아래 천체는 반투명 땅 위에 겹쳐 그려, 회색으로 비쳐 보이게 한다(D11).
      b.sprite.material.color.set(b.below ? BELOW_COLOR : b.color);
      b.label.material.color.set(b.below ? BELOW_COLOR : '#d8deeb');
      b.sprite.renderOrder = b.below ? 5 : 0;
      b.label.renderOrder = b.below ? 5 : 0;
      b.sprite.material.opacity = b.below ? 0.8 : 1;
      b.label.material.opacity = b.below ? 0.8 : 1;
    });
  }

  // 망원경 모습: 달의 위상과 고리 기울기가 눈에 띄게 바뀌었을 때만 텍스처를 다시 그린다.
  function updateDetails(date) {
    const sun = bodies.find((b) => b.id === 'sun');
    bodies.forEach((b) => {
      const opening = computeRingOpening(b.id, date);
      let lit = 1;
      if (b.id === 'moon') {
        lit = (1 - Math.cos((computeSeparation(b, sun) * Math.PI) / 180)) / 2;
        // 달에서 태양 쪽을 가리키는 하늘 위 방향: 화면에서 밝은 쪽을 돌릴 때 쓴다.
        const m = toSkyVector(b.az, b.alt, 1);
        const s = toSkyVector(sun.az, sun.alt, 1);
        b.sunward = s.sub(m.clone().multiplyScalar(m.dot(s))).normalize();
      }
      if (!b.detailState || Math.abs(b.detailState.opening - opening) > 0.5 || Math.abs(b.detailState.lit - lit) > 0.01) {
        if (b.detail.material.map) b.detail.material.map.dispose();
        b.detail.material.map = createBodyTexture(b.id, { opening, lit });
        b.detail.material.needsUpdate = true;
        b.detailState = { opening, lit };
      }
      b.detail.position.copy(b.sprite.position);
      b.detail.material.color.set(b.below ? BELOW_COLOR : '#ffffff');
      b.detail.renderOrder = b.below ? 5 : 0;
    });
  }

  function update(date) {
    updateStars(date);
    updateConstellations(date);
    updateBodies(date);
    updateDetails(date);
  }

  // 망원경 보기에서는 빛 점 대신 원반 그림을 보인다.
  function setTelescopeMode(on) {
    bodies.forEach((b) => {
      b.sprite.visible = !on;
      b.detail.visible = on;
    });
  }

  // 달의 밝은 쪽이 화면에서 태양 쪽을 향하도록 돌린다(매 프레임).
  const pA = new THREE.Vector3();
  const pB = new THREE.Vector3();
  function orientMoon(camera) {
    const moon = bodies.find((b) => b.id === 'moon');
    if (!moon.sunward || !moon.detail.visible) return;
    pA.copy(moon.detail.position).add(group.position).project(camera);
    pB.copy(moon.detail.position).addScaledVector(moon.sunward, 5).add(group.position).project(camera);
    moon.detail.material.rotation = Math.atan2(pB.y - pA.y, (pB.x - pA.x) * camera.aspect);
  }

  // 망원경으로 시야가 좁아져도 글자는 화면에서 같은 크기로 보이게 줄인다. 천체 자체는 그대로 커진다.
  const labels = [];
  group.traverse((o) => {
    if (o.userData.isLabel) {
      labels.push({ sprite: o, base: o.scale.clone() });
    }
  });
  function setLabelScale(k) {
    labels.forEach(({ sprite, base }) => sprite.scale.set(base.x * k, base.y * k, 1));
  }

  return { group, bodies, constellations, update, setLabelScale, setTelescopeMode, orientMoon };
}
