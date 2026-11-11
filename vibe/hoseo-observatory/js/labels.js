// 3D 공간에 띄우는 글자 표지(스프라이트)와 둥근 점 텍스처를 만든다
import * as THREE from '../vendor/three.module.min.js';

// 글자를 흰색으로 그린 스프라이트를 만든다. 색은 material.color로 바꾼다.
// backdrop을 켜면 글자 뒤에 어두운 반투명 바탕을 깔아, 땅이나 지평선에 겹쳐도 읽히게 한다.
export function createTextSprite(text, { height = 6, weight = 400, backdrop = false } = {}) {
  const fontPx = 48;
  const pad = backdrop ? 20 : 8;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const font = `${weight} ${fontPx}px "Noto Sans KR", system-ui, sans-serif`;
  ctx.font = font;
  const width = Math.ceil(ctx.measureText(text).width) + pad * 2;
  canvas.width = width;
  canvas.height = fontPx + 16;
  ctx.font = font;
  if (backdrop) {
    ctx.fillStyle = 'rgba(6, 9, 18, 0.6)';
    ctx.beginPath();
    ctx.roundRect(0, 0, width, canvas.height, canvas.height / 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(text, width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set((height * width) / canvas.height, height, 1);
  sprite.userData.isLabel = true;
  return sprite;
}

// 가운데가 밝고 가장자리가 흐린 둥근 점 텍스처를 만든다.
export function createGlowTexture(inner = 0.35) {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(inner, 'rgba(255,255,255,0.9)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 가장자리가 또렷한 원반 텍스처를 만든다(달 표면처럼 테두리가 보이는 천체용).
export function createDiscTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size * 0.45, size * 0.42, 0, size / 2, size / 2, size * 0.46);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.92, 'rgba(225,225,230,1)');
  g.addColorStop(1, 'rgba(225,225,230,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.47, 0, Math.PI * 2);
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
