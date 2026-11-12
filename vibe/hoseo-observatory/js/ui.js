// 천문대 화면의 조용한 버튼 줄, 천체·별자리·이름 목록, 고른 천체 정보 카드, 망원경·확대·인사 버튼
import { toCompassName, computeLocalSiderealTime } from './astro.js';
import { SORT_MODES, sortByVisibility, sortByMeridian, computeHoursToTransit, groupByZodiac } from './constellation-order.js';

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
export function createUi({ sky, onPick, onTelescope, onNakedEye, onZoom, onGreet, onSound, getNames, onChooseName, onReplayIntro }) {
  const bar = document.createElement('div');
  bar.className = 'ui-bar';
  const panel = document.createElement('div');
  panel.className = 'ui-panel';
  panel.hidden = true;
  const card = document.createElement('div');
  card.className = 'ui-card';
  card.hidden = true;
  // 화면 가운데 아래: 망원경 보기 버튼은 늘 보이고, 망원경 보기에서만 양옆에 확대·축소 버튼이 나온다.
  const viewGroup = document.createElement('div');
  viewGroup.className = 'ui-view-group';
  const viewButton = createButton('망원경으로 보기', () => (viewButton.dataset.mode === 'telescope' ? onNakedEye() : onTelescope()), 'ui-button ui-view');
  const zoomOut = createButton('−', () => onZoom(1.25), 'ui-button ui-zoom');
  const zoomIn = createButton('+', () => onZoom(0.8), 'ui-button ui-zoom');
  zoomOut.setAttribute('aria-label', '축소');
  zoomIn.setAttribute('aria-label', '확대');
  zoomOut.hidden = true;
  zoomIn.hidden = true;
  viewGroup.append(zoomOut, viewButton, zoomIn);
  let openKind = null;
  let picked = null;
  let greetReadyAt = 0;
  let constellationSort = 'visible';

  function formatMeta(below, az) {
    return below ? '지평선 아래' : toCompassName(az);
  }

  // 이름 목록: 다른 사람이 쓰는 이름은 흐리게 두고 고를 수 없다. 지금 내 이름에는 표시를 단다.
  function renderNames() {
    const { all, used, mine } = getNames();
    return all.map((name) => {
      const li = document.createElement('li');
      const taken = used.includes(name);
      li.className = taken ? 'is-below' : '';
      const meta = name === mine ? '지금 이름' : taken ? '사용 중' : '';
      li.innerHTML = `<span class="name">${name}</span><span class="meta">${meta}</span>`;
      if (!taken && name !== mine) {
        li.addEventListener('click', () => {
          onChooseName(name);
          refresh();
        });
      }
      return li;
    });
  }

  function renderItem(it) {
    const li = document.createElement('li');
    li.className = it.below ? 'is-below' : '';
    li.innerHTML = `<span class="name">${it.label}</span><span class="meta">${it.meta ?? formatMeta(it.below, it.az)}</span>`;
    li.addEventListener('click', () => {
      picked = it.pick;
      onPick(it.pick);
      refresh();
    });
    return li;
  }

  function toConstellationItem(c, meta) {
    return { label: c.name, below: c.alt < 0, az: c.az, meta, pick: { kind: 'constellation', name: c.name } };
  }

  // 남쪽 자오선을 지나기까지 남은 시간을 "남중 2시간 10분 뒤"처럼 적는다.
  function formatTransit(hours) {
    if (hours < 0.1) return '지금 남중';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `남중 ${h ? `${h}시간 ` : ''}${m ? `${m}분 ` : ''}뒤`;
  }

  // 별자리 목록: 고른 정렬 기준에 따라 순서를 바꾼다. 묶음 순은 묶음마다 작은 제목을 단다.
  function renderConstellations() {
    if (constellationSort === 'zodiac') {
      return groupByZodiac(sky.constellations).flatMap((g) => {
        const heading = document.createElement('li');
        heading.className = 'ui-panel-heading';
        heading.textContent = g.title;
        return [heading, ...g.items.map((c) => renderItem(toConstellationItem(c)))];
      });
    }
    if (constellationSort === 'meridian') {
      const lst = computeLocalSiderealTime(new Date());
      return sortByMeridian(sky.constellations, lst)
        .map((c) => renderItem(toConstellationItem(c, formatTransit(computeHoursToTransit(c.ra, lst)))));
    }
    return sortByVisibility(sky.constellations).map((c) => renderItem(toConstellationItem(c)));
  }

  function renderSortBar() {
    const sortBar = document.createElement('div');
    sortBar.className = 'ui-sort';
    SORT_MODES.forEach((m) => {
      const b = createButton(m.label, () => {
        constellationSort = m.id;
        refresh();
      }, `ui-sort-button${m.id === constellationSort ? ' is-active' : ''}`);
      b.setAttribute('aria-pressed', String(m.id === constellationSort));
      sortBar.append(b);
    });
    return sortBar;
  }

  function renderList() {
    if (openKind === 'name') return renderNames();
    if (openKind === 'constellation') return renderConstellations();
    return sky.bodies.map((b) => renderItem({ label: b.name, below: b.below, az: b.az, pick: { kind: 'body', id: b.id } }));
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
      // 10초마다 다시 그려도 보던 자리가 튀지 않게 스크롤 위치를 지킨다.
      const scroll = panel.scrollTop;
      panel.replaceChildren(...(openKind === 'constellation' ? [renderSortBar(), list] : [list]));
      panel.scrollTop = scroll;
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

  // 도움말: 처음 온 사람이 바로 쓸 수 있게 조작법을 짧게 보여 준다(R62).
  const help = document.createElement('section');
  help.className = 'ui-help';
  help.hidden = true;
  help.setAttribute('aria-label', '사용 설명');
  help.innerHTML = `
    <h2>사용 설명</h2>
    <dl>
      <dt>둘러보기</dt><dd>화면을 마우스나 손가락으로 끌면 고개를 돌립니다.</dd>
      <dt>걷기</dt><dd>땅을 짧게 누르면 그 자리로 걸어갑니다. PC에서는 W·A·S·D나 방향키로도 걷습니다.</dd>
      <dt>천체·별자리</dt><dd>목록에서 고르면 그쪽으로 시선이 갑니다. 지평선 아래에 있는 것은 회색으로 보입니다. 별자리 목록은 위의 버튼으로 순서를 바꿉니다.</dd>
      <dt>망원경</dt><dd>"망원경으로 보기"를 누르고 +·− 버튼이나 마우스 휠로 확대합니다. 끝까지 확대하면 허블·제임스 웹 우주 망원경과 NASA 탐사선이 찍은 실제 천체 사진이 뜹니다. "눈으로 보기"로 돌아옵니다.</dd>
      <dt>함께 보기</dt><dd>같은 주소로 들어온 사람이 과학자 캐릭터로 보입니다. "캐릭터고르기"로 이름을 바꾸고, "인사"(G 키)로 고개 숙여 인사합니다.</dd>
      <dt>소리</dt><dd>화면을 한 번 누르면 밤 부엉이 소리가 납니다. "소리 끄기"로 끕니다.</dd>
      <dt>인트로</dt><dd>"인트로 다시 보기"로 태양계부터 천문대까지 다시 봅니다.</dd>
    </dl>`;
  const helpClose = createButton('×', () => { help.hidden = true; }, 'ui-card-close');
  helpClose.setAttribute('aria-label', '사용 설명 닫기');
  help.append(helpClose);

  bar.append(
    createButton('도움말', () => { help.hidden = !help.hidden; }),
    createButton('천체', () => toggle('body')),
    createButton('별자리', () => toggle('constellation')),
    createButton('캐릭터고르기', () => toggle('name')),
    greetButton,
    soundButton,
    createButton('인트로 다시 보기', () => {
      openKind = null;
      panel.hidden = true;
      onReplayIntro();
    }),
  );
  // 아래쪽 묶음: 위에서부터 목록 상자, 망원경 버튼, 버튼 줄. 화면이 좁아 버튼 줄이 접혀도 겹치지 않는다.
  const dock = document.createElement('div');
  dock.className = 'ui-dock';
  dock.append(panel, viewGroup, bar);
  document.body.append(hint, card, help, dock);

  // 인트로를 다시 보는 동안 천문대 화면의 UI를 모두 숨긴다.
  function setVisible(visible) {
    document.body.classList.toggle('is-intro', !visible);
  }

  // 소리 상태에 맞춰 버튼 글자와 안내 문구를 바꾼다.
  function setSoundState({ playing, waiting }) {
    soundButton.textContent = playing ? '소리 끄기' : '소리 켜기';
    hint.hidden = !waiting;
  }

  // 지금 보기 방식에 따라 보기 버튼 글자와 확대·축소 버튼을 바꾼다.
  function setViewState({ mode }) {
    const telescope = mode === 'telescope';
    viewButton.dataset.mode = mode;
    const label = telescope ? '눈으로 보기' : '망원경으로 보기';
    if (viewButton.textContent !== label) viewButton.textContent = label;
    zoomOut.hidden = !telescope;
    zoomIn.hidden = !telescope;
  }

  return { refresh, setViewState, setSoundState, setVisible };
}
