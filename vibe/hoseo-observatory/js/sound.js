// 실내에서 듣는 듯한 작은 밤 도로 소리를 깔고, 멀리서 가끔 부엉이가 울게 하며, 끄고 켠다(D15, D18).
// 도로 소리: 창 너머처럼 고음을 강하게 눌러 아주 작게, 끊김 없이 반복한다.
const ROAD = { url: 'sounds/road.mp3', volume: 0.15, lowpassHz: 700 };
const SEAM_S = 1.5;
// 부엉이: 첫 울음은 곧, 그 뒤로는 15~40초 사이 무작위 간격으로 계속 반복한다. 두 녹음 중 하나를 멀리서 들리듯 작게 울린다.
const OWL = {
  urls: ['sounds/owl-1.mp3', 'sounds/owl-2.mp3'],
  volume: 0.08,
  lowpassHz: 1800,
  minGapS: 15,
  maxGapS: 40,
  soonMinS: 3,
  soonMaxS: 8,
};
const FADE_IN_S = 3;
const TOGGLE_FADE_S = 0.4;

// 끝 SEAM_S초를 처음과 겹쳐 섞은 새 버퍼를 만든다. 반복할 때 끝에서 처음으로 이어진다.
function createSeamlessBuffer(ctx, buffer) {
  const seam = Math.min(Math.floor(SEAM_S * buffer.sampleRate), Math.floor(buffer.length / 4));
  const length = buffer.length - seam;
  const out = ctx.createBuffer(buffer.numberOfChannels, length, buffer.sampleRate);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const src = buffer.getChannelData(c);
    const dst = out.getChannelData(c);
    dst.set(src.subarray(0, length));
    for (let i = 0; i < seam; i++) {
      const k = i / seam;
      dst[i] = src[i] * k + src[length + i] * (1 - k);
    }
  }
  return out;
}

// 소리 장치를 만든다. unlock()은 반드시 클릭이나 키 입력 처리 중에 불러야 한다(자동 재생 제한).
export function createSound() {
  let ctx = null;
  let master = null;
  let started = false;
  let enabled = true;
  // 인트로를 다시 보는 동안처럼 천문대 장소가 아닐 때 잠시 멈춘다. 사용자의 켜기·끄기(enabled)와 따로 둔다.
  let suspended = false;
  let owlBuffers = [];
  let owlTimer = null;

  function unlock() {
    if (ctx) return;
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    ctx.resume();
  }

  function randomBetween(a, b) {
    return a + Math.random() * (b - a);
  }

  // 부엉이 한 마디를 왼쪽이나 오른쪽 어딘가에서, 크기와 높낮이를 조금 바꿔 울린다.
  function playOwl() {
    const source = ctx.createBufferSource();
    source.buffer = owlBuffers[Math.floor(Math.random() * owlBuffers.length)];
    source.playbackRate.value = randomBetween(0.94, 1.04);
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = OWL.lowpassHz;
    const gain = ctx.createGain();
    gain.gain.value = OWL.volume * randomBetween(0.7, 1);
    const pan = ctx.createStereoPanner();
    pan.pan.value = randomBetween(-0.7, 0.7);
    source.connect(lowpass).connect(gain).connect(pan).connect(master);
    source.start();
  }

  // 다음 울음을 예약한다. 새로 예약하면 이전 예약은 지운다.
  function scheduleOwl(minS, maxS) {
    clearTimeout(owlTimer);
    owlTimer = setTimeout(() => {
      if (enabled && !suspended) playOwl();
      scheduleOwl(OWL.minGapS, OWL.maxGapS);
    }, randomBetween(minS, maxS) * 1000);
  }

  async function loadBuffer(url) {
    return ctx.decodeAudioData(await (await fetch(url)).arrayBuffer());
  }

  // 도로 소리를 끊김 없이 반복 재생한다.
  function startRoad(buffer) {
    const source = ctx.createBufferSource();
    source.buffer = createSeamlessBuffer(ctx, buffer);
    source.loop = true;
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = ROAD.lowpassHz;
    const gain = ctx.createGain();
    gain.gain.value = ROAD.volume;
    source.connect(lowpass).connect(gain).connect(master);
    source.start();
  }

  // 도로 소리와 부엉이 녹음을 불러와 도로 소리를 깔고, 곧 첫 부엉이 울음을 예약한다.
  async function start() {
    if (started || !ctx) return;
    started = true;
    try {
      const [road, ...owls] = await Promise.all([ROAD.url, ...OWL.urls].map(loadBuffer));
      owlBuffers = owls;
      startRoad(road);
      const t = ctx.currentTime;
      master.gain.setValueAtTime(0, t);
      if (enabled && !suspended) master.gain.linearRampToValueAtTime(1, t + FADE_IN_S);
      scheduleOwl(OWL.soonMinS, OWL.soonMaxS);
    } catch (err) {
      console.warn('소리를 불러오지 못했습니다.', err);
    }
  }

  // 켜져 있고 멈춤 상태가 아닐 때만 들리게 음량을 맞춘다.
  function applyGain() {
    if (!ctx) return;
    const audible = enabled && !suspended;
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(audible ? 1 : 0, now + TOGGLE_FADE_S);
    if (audible && owlBuffers.length) scheduleOwl(OWL.soonMinS, OWL.soonMaxS);
  }

  // 끄면 소리를 줄여 멈추고, 다시 켜면 곧 한 번 울려 켜졌음을 알린다.
  function setEnabled(on) {
    enabled = on;
    applyGain();
  }

  // 천문대 장소를 떠나면(인트로 다시 보기) 멈추고, 돌아오면 다시 들린다.
  function setSuspended(on) {
    suspended = on;
    applyGain();
  }

  return {
    unlock,
    start,
    setEnabled,
    setSuspended,
    get unlocked() { return Boolean(ctx); },
    get started() { return started; },
    get enabled() { return enabled; },
  };
}
