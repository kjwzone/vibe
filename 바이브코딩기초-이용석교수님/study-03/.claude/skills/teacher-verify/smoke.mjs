// 빌드된 dist/index.html을 headless Chrome으로 열어 게임 완주·순위 등록·결과 저장·선생님 모드·CSV·360px 레이아웃을 확인하는 스모크 테스트
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].filter(Boolean)

const page = resolve('dist/index.html')
if (!existsSync(page)) {
  console.log('오류: dist/index.html 없음. npm run build를 먼저 실행')
  process.exit(1)
}
const chromePath = CHROME_CANDIDATES.find((p) => existsSync(p))
if (!chromePath) {
  console.log('오류: Chrome/Edge를 찾지 못함. CHROME_PATH 환경 변수로 경로를 지정')
  process.exit(1)
}

const profile = mkdtempSync(join(tmpdir(), 'quiz-smoke-'))
const chrome = spawn(chromePath, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
])
const wsUrl = await new Promise((ok, fail) => {
  const timer = setTimeout(() => fail(new Error('Chrome 시작 시간 초과')), 20000)
  chrome.stderr.on('data', (d) => {
    const m = String(d).match(/DevTools listening on (ws:\/\/\S+)/)
    if (m) { clearTimeout(timer); ok(m[1]) }
  })
})

const ws = new WebSocket(wsUrl)
await new Promise((ok) => ws.addEventListener('open', ok, { once: true }))
let nextId = 0
const pending = new Map()
ws.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data)
  if (msg.id && pending.has(msg.id)) {
    const { ok, fail } = pending.get(msg.id)
    pending.delete(msg.id)
    if (msg.error) fail(new Error(msg.error.message))
    else ok(msg.result)
  }
})
const send = (method, params = {}, sessionId) =>
  new Promise((ok, fail) => {
    const id = ++nextId
    pending.set(id, { ok, fail })
    ws.send(JSON.stringify({ id, method, params, sessionId }))
  })

const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
const cmd = (method, params) => send(method, params, sessionId)
await cmd('Emulation.setDeviceMetricsOverride', { width: 360, height: 800, deviceScaleFactor: 1, mobile: true })
// 내려받기를 가로채 내용을 보관하는 코드를 모든 문서에 먼저 심는다
await cmd('Page.addScriptToEvaluateOnNewDocument', {
  source: `
    window.__downloads = [];
    URL.revokeObjectURL = () => {};
    const origClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      if (this.download) {
        const name = this.download;
        window.__downloads.push(fetch(this.href).then((r) => r.arrayBuffer()).then((buf) => {
          const bytes = new Uint8Array(buf);
          // TextDecoder는 기본으로 BOM을 지우므로 ignoreBOM으로 원래 내용을 그대로 읽는다
          return { name, text: new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes), head: [...bytes.slice(0, 3)] };
        }));
        return;
      }
      return origClick.call(this);
    };`,
})

async function evaluate(fn, ...args) {
  const expression = `(${fn})(...${JSON.stringify(args)})`
  const r = await cmd('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)
  return r.result.value
}
async function load() {
  await cmd('Page.enable')
  await cmd('Page.navigate', { url: pathToFileURL(page).href })
  for (let i = 0; i < 50; i++) {
    if (await evaluate(() => !!document.querySelector('.screen'))) return
    await new Promise((r) => setTimeout(r, 100))
  }
  throw new Error('첫 화면이 나타나지 않음')
}

// 페이지 안에서 쓰는 도우미 (문자열로 주입)
const helpers = `
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const button = (text) => $$('button, label').find((b) => b.textContent.trim().startsWith(text));
  const key = (k) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
  const typeInto = (el, v) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const noOverflow = () => document.documentElement.scrollWidth <= document.documentElement.clientWidth;
`
const inPage = (body) => new Function(`return (async () => { ${helpers} ${body} })()`)

const checks = []
const check = (name, ok, detail = '') => {
  checks.push({ name, ok })
  console.log(`${ok ? '통과' : '실패'}: ${name}${detail ? ` (${detail})` : ''}`)
}

try {
  await load()

  // 1. 시작 화면
  const start = await evaluate(inPage(`
    return { teacherBtn: !!button('선생님 모드'), leaderboardBtn: !!button('순위표'), noOverflow: noOverflow() };
  `))
  check('시작 화면에 게임 시작·순위표·선생님 모드 버튼', start.teacherBtn && start.leaderboardBtn)
  check('시작 화면 360px 가로 넘침 없음', start.noOverflow)

  // 2. 키보드로 한 판 완주 (1~4번 번갈아 고르고 Enter)
  const play = await evaluate(inPage(`
    button('게임 시작').click(); await sleep(50);
    let answered = 0, guard = 0;
    while (!$('.screen.result') && guard++ < 200) {
      if ($('.option:not(:disabled)')) { key(String((answered % 4) + 1)); answered++; await sleep(20); }
      key('Enter'); await sleep(20);
    }
    const score = Number($('.big-score').firstChild.textContent);
    return { finished: !!$('.screen.result'), answered, score, noOverflow: noOverflow() };
  `))
  check('키보드(1~4, Enter)로 40문제 완주', play.finished && play.answered === 40, `답 ${play.answered}개, ${play.score}점`)
  check('결과 화면 360px 가로 넘침 없음', play.noOverflow)

  // 3. 기존 순위 등록
  const reg = await evaluate(inPage(`
    typeInto($('#nickname'), '스모크'); await sleep(20);
    $('#nickname').closest('form').requestSubmit(); await sleep(50);
    return $('.registered')?.textContent ?? '';
  `))
  check('기존 순위 등록 동작', reg.includes('등록 완료'), reg)

  // 4. 결과 파일 저장 (이름 검사 후 내려받기)
  const exported = await evaluate(inPage(`
    $('#student-name').closest('form').requestSubmit(); await sleep(30);
    const emptyError = $('#student-name-error')?.textContent ?? '';
    typeInto($('#student-name'), '김민수'); await sleep(20);
    $('#student-name').closest('form').requestSubmit(); await sleep(50);
    const files = await Promise.all(window.__downloads);
    return { emptyError, files, status: $('#student-name-hint')?.textContent ?? '' };
  `))
  const resultFile = exported.files.find((f) => f.name.startsWith('quiz-result-'))
  const result = resultFile ? JSON.parse(resultFile.text) : null
  check('빈 이름이면 결과 저장 안 함', exported.emptyError.includes('이름'), exported.emptyError)
  check('결과 파일 저장 (문항 40개, 점수 일치)',
    !!result && result.answers.length === 40 && result.score === play.score && result.name === '김민수',
    resultFile?.name)

  // 5. 새로고침 후 선생님 모드에서 파일 3개 불러오기 (정상 2, 깨진 1)
  await load()
  const second = { ...result, name: '이지아', playedAt: new Date(Date.parse(result.playedAt) + 60000).toISOString() }
  const teacher = await evaluate(inPage(`
    button('순위표').click(); await sleep(30);
    const leaderboardHasEntry = $$('.rank-name').some((el) => el.textContent.includes('스모크'));
    button('돌아가기').click(); await sleep(30);
    button('선생님 모드').click(); await sleep(30);
    const files = arguments_files.map(([name, text]) => new File([text], name, { type: 'application/json' }));
    const dt = new DataTransfer(); files.forEach((f) => dt.items.add(f));
    const input = $('input[type=file]'); input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await sleep(200);
    const tables = $$('.data-table');
    const studentRows = tables[0] ? tables[0].querySelectorAll('tbody tr').length : 0;
    const questionRows = tables[1] ? tables[1].querySelectorAll('tbody tr').length : 0;
    const errors = $$('.teacher-errors li').map((li) => li.textContent);
    const overflow = noOverflow();
    window.__downloads = [];
    button('CSV 내보내기').click(); await sleep(50);
    const csv = (await Promise.all(window.__downloads))[0];
    button('돌아가기').click(); await sleep(30);
    return { leaderboardHasEntry, studentRows, questionRows, errors, overflow, csv, backToStart: !!$('.screen.start') };
  `.replace('arguments_files', JSON.stringify([
    [resultFile.name, resultFile.text],
    ['second.json', JSON.stringify(second)],
    ['broken.json', '{ not json'],
  ]))))
  check('순위표에 등록한 기록 유지 (새로고침 후)', teacher.leaderboardHasEntry)
  check('선생님 모드: 학생 2명 성적표', teacher.studentRows === 2, `${teacher.studentRows}행`)
  check('선생님 모드: 문항별 정답률 40문항', teacher.questionRows === 40, `${teacher.questionRows}행`)
  check('선생님 모드: 깨진 파일 오류 표시', teacher.errors.length === 1 && teacher.errors[0].includes('broken.json'), teacher.errors[0])
  check('선생님 모드 360px 페이지 가로 넘침 없음 (표는 내부 스크롤)', teacher.overflow)
  const csvLines = teacher.csv?.text.split('\r\n').filter(Boolean) ?? []
  check('CSV 내보내기 (BOM, 머리글 + 2행)',
    !!teacher.csv && teacher.csv.text.startsWith('\uFEFF순위,이름') && csvLines.length === 3, teacher.csv?.name)
  check('돌아가기로 시작 화면 복귀', teacher.backToStart)
} catch (e) {
  check('스모크 테스트 실행', false, e.message)
} finally {
  ws.close()
  chrome.kill()
  await new Promise((r) => setTimeout(r, 500))
  try { rmSync(profile, { recursive: true, force: true }) } catch { /* Chrome이 늦게 닫히면 임시 폴더가 남을 수 있음 */ }
}

const failed = checks.filter((c) => !c.ok).length
console.log(`\n스모크 테스트: ${checks.length - failed}/${checks.length} 통과`)
process.exit(failed ? 1 : 0)
