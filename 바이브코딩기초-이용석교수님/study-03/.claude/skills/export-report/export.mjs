// teacher_report.html의 표를 CSV로, 보고서 전체를 PDF(설치된 Chrome/Edge headless)로 내보내고 결과 파일을 검증하는 스크립트
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const [cmd, htmlPath = 'class-results/report/teacher_report.html'] = process.argv.slice(2)
const fail = (msg) => {
  console.log(`오류: ${msg}`)
  process.exit(1)
}
if (!existsSync(htmlPath)) fail(`${htmlPath} 없음. /teacher-report로 보고서를 먼저 만들 것`)
const html = readFileSync(htmlPath, 'utf8')
const outDir = dirname(htmlPath)

const unescape = (s) => s.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&').trim()
// data-export 표 하나를 [머리글, ...행] 2차원 배열로 읽는다
function readTable(name) {
  const m = html.match(new RegExp(`<table data-export="${name}">([\\s\\S]*?)</table>`))
  if (!m) fail(`${htmlPath}에 data-export="${name}" 표가 없음`)
  return [...m[1].matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((row) => [...row[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map((cell) => unescape(cell[1])))
}
// teacher.ts의 csvCell과 같은 규칙 (수식 주입 방지 + 따옴표 처리)
function csvCell(text) {
  let t = String(text)
  if (/^[=+\-@\t\r]/.test(t) && Number.isNaN(Number(t))) t = `'${t}`
  return /[",\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
}

function csv() {
  for (const name of ['students', 'questions', 'categories']) {
    const rows = readTable(name)
    const path = join(outDir, `teacher_report_${name}.csv`)
    writeFileSync(path, '\uFEFF' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n')
    // 다시 읽어 BOM, 행 수, 열 수를 확인한다
    const back = readFileSync(path)
    const bom = back[0] === 0xef && back[1] === 0xbb && back[2] === 0xbf
    const lines = back.toString('utf8').replace(/^\uFEFF/, '').split('\r\n').filter(Boolean)
    if (!bom) fail(`${path} BOM 없음`)
    if (lines.length !== rows.length) fail(`${path} 줄 수 ${lines.length} ≠ 표 행 수 ${rows.length}`)
    console.log(`CSV 작성: ${path} (머리글 + ${rows.length - 1}행, 열 ${rows[0].length}개, BOM 확인)`)
  }
}

function pdf() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
  ].filter(Boolean)
  const browser = candidates.find((p) => existsSync(p))
  if (!browser) fail('PDF 불가: Chrome/Edge를 찾지 못함. 설치하거나 CHROME_PATH 환경 변수로 경로를 지정할 것')
  const out = resolve(outDir, 'teacher_report.pdf')
  const r = spawnSync(browser, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', `--print-to-pdf=${out}`, pathToFileURL(resolve(htmlPath)).href], { timeout: 60000 })
  if (!existsSync(out)) fail(`PDF 생성 실패 (종료 코드 ${r.status}) ${String(r.stderr).slice(0, 300)}`)
  const head = readFileSync(out).subarray(0, 5).toString('latin1')
  if (head !== '%PDF-') fail(`${out}가 PDF 형식이 아님`)
  console.log(`PDF 작성: ${out} (${statSync(out).size} bytes, %PDF 머리 확인, 사용 브라우저 ${browser})`)
}

if (cmd === 'csv') csv()
else if (cmd === 'pdf') pdf()
else fail('사용법: node export.mjs <csv | pdf> [teacher_report.html 경로]')
