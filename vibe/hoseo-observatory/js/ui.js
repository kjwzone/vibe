// 천문대 화면의 조용한 버튼 줄, 천체·별자리 목록, 고른 천체 정보 카드, 망원경·인사 버튼
import { toCompassName } from './astro.js';

const GREET_COOLDOWN_MS = 3000;

function createButton(label, onClick, className = 'ui-button') {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = className;
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

// 화면 아래 UI를 만든다. 동작은 콜백으로 넘긴다.
export function createUi({ sky, onPick, onTelescope, onNakedEye, onGreet, onSound }) {
  const bar = document.createElement('div');
  bar.className = 'ui-bar';
  const panel = document.createElement('div');
  panel.className = 'ui-panel';
  panel.hidden = true;
  const card = document.createElement('div');
  card.className = 'ui-card';
  card.hidden = true;
  const viewButton = createButton('', () => (viewButton.dataset.mode === 'telescope' ? onNakedEye() : onTelescope()), 'ui-button ui-view');
  viewButton.hidden = true;
  let openKind = null;
  let picked = null;
  let greetReadyAt = 0;

  function formatMeta(below, az) {
    return below ? '지평선 아래' : toCompassName(az);
  }

  function renderList() {
    const items = openKind === 'body'
      ? sky.bodies.map((b) => ({ label: b.name, below: b.below, az: b.az, pick: { kind: 'body', id: b.id } }))
      : sky.constellations.map((c) => ({ label: c.name, below: c.alt < 0, az: c.az, pick: { kind: 'constellation', name: c.name } }));
    return items.map((it) => {
      const li = document.createElement('li');
      li.className = it.below ? 'is-below' : '';
      li.innerHTML = `<span class="name">${it.label}</span><span class="meta">${formatMeta(it.below, it.az)}</span>`;
      li.addEventListener('click', () => {
        picked = it.pick;
        onPick(it.pick);
        refresh();
      });
      return li;
    });
  }

  function renderCard() {
    if (!picked) {
      card.hidden = true;
      return;
    }
    const target = picked.kind === 'body'
      ? sky.bodies.find((b) => b.id === picked.id)
      : sky.constellations.find((c) => c.name === picked.name);
    const below = target.alt < 0;
    card.hidden = false;
    card.classList.toggle('is-below', below);
    card.innerHTML = `
      <button type="button" class="ui-card-close" aria-label="닫기">×</button>
      <div class="ui-card-name">${target.name}</div>
      <div class="ui-card-row"><span>방위각</span><span>${target.az.toFixed(1)}° (${toCompassName(target.az)})</span></div>
      <div class="ui-card-row"><span>고도</span><span>${target.alt.toFixed(1)}°</span></div>
      ${below ? '<div class="ui-card-below">지평선 아래</div>' : ''}`;
    card.querySelector('.ui-card-close').addEventListener('click', () => {
      picked = null;
      renderCard();
    });
  }

  function refresh() {
    if (openKind) {
      const list = document.createElement('ul');
      list.append(...renderList());
      panel.replaceChildren(list);
    }
    renderCard();
  }

  function toggle(kind) {
    openKind = openKind === kind ? null : kind;
    panel.hidden = !openKind;
    refresh();
  }

  const greetButton = createButton('인사', () => tryGreet());

  // 3초에 한 번만 인사할 수 있다. 기다리는 동안 버튼을 흐리게 한다.
  function tryGreet() {
    const now = performance.now();
    if (now < greetReadyAt) return;
    greetReadyAt = now + GREET_COOLDOWN_MS;
    greetButton.classList.add('is-waiting');
    setTimeout(() => greetButton.classList.remove('is-waiting'), GREET_COOLDOWN_MS);
    onGreet();
  }

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyG' && !e.repeat) tryGreet();
  });

  const soundButton = createButton('소리 켜기', () => onSound(), 'ui-button ui-sound');
  const hint = document.createElement('div');
  hint.className = 'ui-hint';
  hint.textContent = '클릭하면 소리가 납니다';
  hint.hidden = true;

  bar.append(
    createButton('천체', () => toggle('body')),
    createButton('별자리', () => toggle('constellation')),
    greetButton,
    soundButton,
  );
  document.body.append(hint, panel, card, viewButton, bar);

  // 소리 상태에 맞춰 버튼 글자와 안내 문구를 바꾼다.
  function setSoundState({ playing, waiting }) {
    soundButton.textContent = playing ? '소리 끄기' : '소리 켜기';
    hint.hidden = !waiting;
  }

  // 망원경 근처인지와 지금 보기 방식에 따라 보기 버튼을 바꾼다.
  function setViewState({ near, mode }) {
    const telescope = mode === 'telescope';
    viewButton.hidden = !(near || telescope);
    viewButton.dataset.mode = mode;
    const label = telescope ? '눈으로 보기' : '망원경으로 보기';
    if (viewButton.textContent !== label) viewButton.textContent = label;
  }

  return { refresh, setViewState, setSoundState };
}
