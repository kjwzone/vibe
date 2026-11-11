// 망원경을 가장 크게 확대하면 가운데 천체의 실제 우주 망원경 사진을 출처와 함께 서서히 띄운다
import { PHOTOS } from './data/photos.js';

// 잘라 쓸 부분이 있으면 캔버스로 잘라 이미지 주소로 바꾼다.
function loadCropped({ src, crop }) {
  return new Promise((resolve) => {
    if (!crop) {
      resolve(src);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = crop[2];
      canvas.height = crop[3];
      canvas.getContext('2d').drawImage(img, crop[0], crop[1], crop[2], crop[3], 0, 0, crop[2], crop[3]);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}

export function hasPhoto(id) {
  return Boolean(PHOTOS[id]);
}

// 사진 보기를 만든다. show(id)로 띄우고 show(null)로 감춘다.
export function createPhotoViewer() {
  const box = document.createElement('figure');
  box.className = 'photo';
  const img = document.createElement('img');
  img.alt = '';
  const caption = document.createElement('figcaption');
  box.append(img, caption);
  document.body.append(box);
  const cache = new Map();
  let current = null;

  async function show(id) {
    if (id === current) return;
    current = id;
    if (!id) {
      box.classList.remove('is-visible');
      return;
    }
    const p = PHOTOS[id];
    if (!cache.has(id)) cache.set(id, await loadCropped(p));
    if (current !== id) return;
    img.src = cache.get(id);
    img.alt = `${p.telescope}가 찍은 ${p.title}`;
    caption.innerHTML = `${p.telescope} · ${p.title}<br>사진: ${p.credit} · <a href="${p.page}" target="_blank" rel="noopener">CC BY 4.0</a>`;
    box.classList.add('is-visible');
  }

  return { show };
}
