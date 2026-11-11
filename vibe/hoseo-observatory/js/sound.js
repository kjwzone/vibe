// 멀리서 가끔 우는 부엉이 소리를 불규칙하게 들려주고 끄고 켠다(D15). 계속 나는 소리는 없다.
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
const FADE_IN_S = 1;
const TOGGLE_FADE_S = 0.4;

// 소리 장치를 만든다. unlock()은 반드시 클릭이나 키 입력 처리 중에 불러야 한다(자동 재생 제한).
export function createSound() {
  let ctx = null;
  let master = null;
  let started = false;
  let enabled = true;
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
      if (enabled) playOwl();
      scheduleOwl(OWL.minGapS, OWL.maxGapS);
    }, randomBetween(minS, maxS) * 1000);
  }

  // 부엉이 녹음을 불러오고, 곧 첫 울음을 예약한다.
  async function start() {
    if (started || !ctx) return;
    started = true;
    try {
      owlBuffers = await Promise.all(OWL.urls.map(async (url) => ctx.decodeAudioData(await (await fetch(url)).arrayBuffer())));
      const t = ctx.currentTime;
      master.gain.setValueAtTime(0, t);
      if (enabled) master.gain.linearRampToValueAtTime(1, t + FADE_IN_S);
      scheduleOwl(OWL.soonMinS, OWL.soonMaxS);
    } catch (err) {
      console.warn('부엉이 소리를 불러오지 못했습니다.', err);
    }
  }

  // 끄면 소리를 줄여 멈추고, 다시 켜면 곧 한 번 울려 켜졌음을 알린다.
  function setEnabled(on) {
    enabled = on;
    if (!ctx) return;
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(on ? 1 : 0, now + TOGGLE_FADE_S);
    if (on && owlBuffers.length) scheduleOwl(OWL.soonMinS, OWL.soonMaxS);
  }

  return {
    unlock,
    start,
    setEnabled,
    get unlocked() { return Boolean(ctx); },
    get started() { return started; },
    get enabled() { return enabled; },
  };
}
