// 망원경으로 본 천체 원반을 캔버스에 그린다: 목성 띠와 대적점, 토성·천왕성·해왕성 고리, 화성 무늬, 달의 바다와 위상 등
import * as THREE from '../vendor/three.module.min.js';

const SIZE = 512;
const C = SIZE / 2;

// 천체별 원반 반지름(px). 고리가 있는 행성은 고리가 들어가도록 원반을 작게 그린다.
const DISC_RADIUS = { saturn: 104, uranus: 118, neptune: 96 };
const DEFAULT_RADIUS = 236;

export function getDiscRadius(id) {
  return DISC_RADIUS[id] || DEFAULT_RADIUS;
}

function createCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  return { canvas, ctx: canvas.getContext('2d') };
}

// 원반 안으로만 그리게 자른다.
function clipDisc(ctx, r) {
  ctx.beginPath();
  ctx.arc(C, C, r, 0, Math.PI * 2);
  ctx.clip();
}

// 가장자리가 어두워지는 효과(주변 감광)
function shadeLimb(ctx, r, strength = 0.55) {
  const g = ctx.createRadialGradient(C - r * 0.25, C - r * 0.25, r * 0.2, C, C, r);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.75, `rgba(0,0,0,${strength * 0.35})`);
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(C - r, C - r, r * 2, r * 2);
}

// 위도(도) 구간으로 띠를 칠한다.
function drawBands(ctx, r, bands) {
  bands.forEach(([lat1, lat2, color]) => {
    const y1 = C - r * Math.sin((lat2 * Math.PI) / 180);
    const y2 = C - r * Math.sin((lat1 * Math.PI) / 180);
    ctx.fillStyle = color;
    ctx.fillRect(C - r, y1, r * 2, y2 - y1);
  });
}

// 정해진 씨앗으로 같은 무늬가 나오게 하는 간단한 난수
function createRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function drawSpots(ctx, r, { count, color, minR, maxR, seed, lat = [-80, 80] }) {
  const rand = createRandom(seed);
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const la = ((lat[0] + rand() * (lat[1] - lat[0])) * Math.PI) / 180;
    const x = C + (rand() * 2 - 1) * r * Math.cos(la);
    const y = C - r * Math.sin(la);
    const rr = minR + rand() * (maxR - minR);
    ctx.beginPath();
    ctx.ellipse(x, y, rr * (1 + rand()), rr, rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawJupiter(ctx, r) {
  ctx.fillStyle = '#e6d6b8';
  ctx.fillRect(0, 0, SIZE, SIZE);
  drawBands(ctx, r, [
    [-90, -55, '#b9a68c'], [-40, -30, '#c98f62'], [-24, -18, '#d9b58e'],
    [-16, -7, '#b8754b'], [-7, 7, '#efe3c9'], [7, 18, '#b06f48'],
    [22, 30, '#c79a74'], [36, 44, '#c4a07d'], [55, 90, '#b5a58e'],
  ]);
  // 띠 사이의 가는 결
  const rand = createRandom(11);
  ctx.strokeStyle = 'rgba(120,80,50,0.18)';
  for (let i = 0; i < 40; i++) {
    const y = C - r + rand() * r * 2;
    ctx.lineWidth = 1 + rand() * 2;
    ctx.beginPath();
    ctx.moveTo(C - r, y);
    ctx.bezierCurveTo(C - r * 0.3, y + (rand() - 0.5) * 6, C + r * 0.3, y + (rand() - 0.5) * 6, C + r, y);
    ctx.stroke();
  }
  // 대적점: 남반구 약 22°
  ctx.fillStyle = '#c4573a';
  ctx.beginPath();
  ctx.ellipse(C + r * 0.35, C + r * Math.sin((22 * Math.PI) / 180), r * 0.16, r * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(240,220,200,0.6)';
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawSaturnBody(ctx, r) {
  ctx.fillStyle = '#e7d3a1';
  ctx.fillRect(0, 0, SIZE, SIZE);
  drawBands(ctx, r, [[-90, -50, '#c9b88f'], [-30, -15, '#d9c08c'], [-10, 10, '#efe0b6'], [15, 30, '#d4b986'], [50, 90, '#bfb38f']]);
}

function drawUranus(ctx, r) {
  ctx.fillStyle = '#a9dde3';
  ctx.fillRect(0, 0, SIZE, SIZE);
  const g = ctx.createRadialGradient(C, C - r * 0.4, 0, C, C - r * 0.4, r * 0.7);
  g.addColorStop(0, 'rgba(235,250,250,0.7)');
  g.addColorStop(1, 'rgba(235,250,250,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SIZE, SIZE);
}

function drawNeptune(ctx, r) {
  ctx.fillStyle = '#4a6fd4';
  ctx.fillRect(0, 0, SIZE, SIZE);
  drawBands(ctx, r, [[-30, -20, '#3d5fc2'], [10, 20, '#5a7fe0']]);
  ctx.fillStyle = '#26408f';
  ctx.beginPath();
  ctx.ellipse(C - r * 0.2, C + r * 0.25, r * 0.16, r * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(240,245,255,0.8)';
  ctx.beginPath();
  ctx.ellipse(C + r * 0.25, C + r * 0.45, r * 0.12, r * 0.03, 0.1, 0, Math.PI * 2);
  ctx.fill();
}

function drawMars(ctx, r) {
  ctx.fillStyle = '#d0703a';
  ctx.fillRect(0, 0, SIZE, SIZE);
  drawSpots(ctx, r, { count: 14, color: 'rgba(110,55,30,0.55)', minR: r * 0.06, maxR: r * 0.18, seed: 7, lat: [-45, 30] });
  ctx.fillStyle = '#f4f1ea';
  ctx.beginPath();
  ctx.ellipse(C, C + r * 0.93, r * 0.38, r * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawVenus(ctx) {
  const g = ctx.createRadialGradient(C, C, 0, C, C, DEFAULT_RADIUS);
  g.addColorStop(0, '#fbf6e4');
  g.addColorStop(1, '#e6d8b0');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SIZE, SIZE);
}

function drawMercury(ctx, r) {
  ctx.fillStyle = '#a7a199';
  ctx.fillRect(0, 0, SIZE, SIZE);
  drawSpots(ctx, r, { count: 40, color: 'rgba(80,76,70,0.35)', minR: r * 0.02, maxR: r * 0.07, seed: 3 });
}

function drawSun(ctx, r) {
  const g = ctx.createRadialGradient(C, C, 0, C, C, r);
  g.addColorStop(0, '#fff6d8');
  g.addColorStop(0.7, '#ffd77a');
  g.addColorStop(1, '#f39a32');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SIZE, SIZE);
  drawSpots(ctx, r, { count: 5, color: 'rgba(70,40,20,0.75)', minR: r * 0.015, maxR: r * 0.035, seed: 5, lat: [-30, 30] });
}

// 달: 바다(어두운 평원)를 대략의 자리로 그린다.
function drawMoonSurface(ctx, r) {
  ctx.fillStyle = '#cfccc4';
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = 'rgba(95,95,100,0.55)';
  [
    [-0.35, -0.35, 0.28, 0.2], [-0.05, -0.45, 0.2, 0.16], [0.2, -0.2, 0.18, 0.14], [0.35, 0.05, 0.12, 0.2],
    [-0.45, 0.05, 0.25, 0.3], [-0.2, 0.35, 0.2, 0.12], [0.1, 0.25, 0.14, 0.1], [0.55, -0.35, 0.1, 0.12],
  ].forEach(([x, y, rx, ry]) => {
    ctx.beginPath();
    ctx.ellipse(C + x * r, C + y * r, rx * r, ry * r, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  drawSpots(ctx, r, { count: 30, color: 'rgba(240,238,230,0.35)', minR: r * 0.01, maxR: r * 0.03, seed: 9 });
}

// 위상의 그림자: 밝은 쪽은 오른쪽(+x). lit은 밝게 보이는 비율(0~1).
function drawPhaseShadow(ctx, r, lit) {
  const e = r * Math.abs(1 - 2 * lit);
  ctx.fillStyle = 'rgba(8,8,12,0.93)';
  ctx.beginPath();
  ctx.arc(C, C, r + 1, -Math.PI / 2, Math.PI / 2, true);
  // 초승달(lit<0.5)이면 그림자가 가운데를 넘어 오른쪽까지, 볼록달이면 왼쪽 안쪽까지.
  // 캔버스 각도는 시계 방향으로 커지므로, 아래(π/2)에서 위(-π/2)로 오른쪽(0)을 지나려면 반시계 방향이다.
  ctx.ellipse(C, C, e, r + 1, 0, Math.PI / 2, -Math.PI / 2, lit < 0.5);
  ctx.fill();
}

// 고리: 바깥·안쪽 반지름(원반 반지름 배수)과 색, 기울기(opening, 도)에 맞춘 납작한 타원
function drawRings(ctx, r, rings, opening, half) {
  const k = Math.max(0.02, Math.sin((opening * Math.PI) / 180));
  ctx.save();
  if (half === 'front') {
    ctx.beginPath();
    ctx.rect(0, C, SIZE, C);
    ctx.clip();
  }
  rings.forEach(([inner, outer, color]) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(C, C, r * outer, r * outer * k, 0, 0, Math.PI * 2);
    ctx.ellipse(C, C, r * inner, r * inner * k, 0, 0, Math.PI * 2, true);
    ctx.fill('evenodd');
  });
  ctx.restore();
}

const RINGS = {
  saturn: [[1.24, 1.52, 'rgba(160,145,115,0.35)'], [1.53, 1.94, 'rgba(232,215,175,0.95)'], [2.03, 2.27, 'rgba(210,195,160,0.85)']],
  uranus: [[1.64, 1.68, 'rgba(200,225,230,0.45)'], [1.95, 2.02, 'rgba(220,240,245,0.7)']],
  neptune: [[1.69, 1.73, 'rgba(200,210,230,0.3)'], [2.5, 2.56, 'rgba(210,220,240,0.4)']],
};

const DRAW = {
  sun: drawSun, moon: drawMoonSurface, mercury: drawMercury, venus: drawVenus,
  mars: drawMars, jupiter: drawJupiter, saturn: drawSaturnBody, uranus: drawUranus, neptune: drawNeptune,
};

// 천체 하나의 망원경 모습 텍스처를 만든다. opening은 고리 기울기, lit은 달의 밝은 비율.
export function createBodyTexture(id, { opening = 0, lit = 1 } = {}) {
  const { canvas, ctx } = createCanvas();
  const r = getDiscRadius(id);
  if (RINGS[id]) drawRings(ctx, r, RINGS[id], opening, 'all');
  ctx.save();
  clipDisc(ctx, r);
  DRAW[id](ctx, r);
  if (id !== 'sun') shadeLimb(ctx, r, id === 'moon' ? 0.3 : 0.55);
  if (id === 'moon') drawPhaseShadow(ctx, r, lit);
  ctx.restore();
  if (RINGS[id]) drawRings(ctx, r, RINGS[id], opening, 'front');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
