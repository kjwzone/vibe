// quiz-daily 스킬의 백업·백업 검증·중복 검사·변경 비교를 수행하는 보조 스크립트
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const BANK = 'src/data/questions.json'
const LEADERBOARD = 'leaderboard/leaderboard.json'
const BACKUP_DIR = 'backups'
const CATEGORIES = ['history', 'science', 'geography', 'general']
const DIFFS = ['easy', 'normal', 'hard']
const PREFIX = { history: 'HIS', science: 'SCI', geography: 'GEO', general: 'GEN' }

const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex')
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8').replace(/^﻿/, ''))
const fail = (msg) => {
  console.log(`오류: ${msg}`)
  process.exit(1)
}
function stamp() {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }).formatToParts(new Date()).map((x) => [x.type, x.value]),
  )
  return `${p.year}${p.month}${p.day}-${p.hour}${p.minute}${p.second}`
}

// 백업 폴더의 manifest와 실제 파일을 대조한다. 문제 목록을 반환한다
function verifyDir(dir) {
  const manifestPath = join(dir, 'manifest.json')
  if (!existsSync(manifestPath)) return [`${manifestPath} 없음`]
  const manifest = readJson(manifestPath)
  const problems = []
  for (const f of manifest.files) {
    const path = join(dir, f.name)
    if (!existsSync(path)) { problems.push(`${path} 없음`); continue }
    if (sha256(path) !== f.sha256) problems.push(`${path} 해시 불일치`)
    try {
      const data = readJson(path)
      if (!Array.isArray(data)) problems.push(`${path} 배열 아님`)
      else if (data.length !== f.count) problems.push(`${path} 항목 수 ${data.length} ≠ ${f.count}`)
    } catch (e) {
      problems.push(`${path} JSON 파싱 실패 (${e.message})`)
    }
  }
  return problems
}

function backup(label = 'snapshot') {
  if (!existsSync(BANK)) fail(`${BANK} 없음. study-03 루트에서 실행했는지 확인`)
  const dir = join(BACKUP_DIR, `${stamp()}-${label}`)
  if (existsSync(dir)) fail(`${dir} 이미 있음. 잠시 뒤 다시 실행`)
  mkdirSync(dir, { recursive: true })
  const files = []
  for (const [src, name] of [[BANK, 'questions.json'], [LEADERBOARD, 'leaderboard.json']]) {
    if (!existsSync(src)) continue
    const dest = join(dir, name)
    copyFileSync(src, dest)
    const count = readJson(src).length
    if (sha256(dest) !== sha256(src)) fail(`${dest}가 원본과 다름`)
    files.push({ name, source: src, sha256: sha256(src), count })
  }
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify({ createdAt: new Date().toISOString(), label, files }, null, 2) + '\n')
  const problems = verifyDir(dir)
  if (problems.length) fail(`백업 검증 실패\n- ${problems.join('\n- ')}`)
  console.log(`백업 완료: ${dir}`)
  for (const f of files) console.log(`- ${f.name}: ${f.count}건, sha256 ${f.sha256.slice(0, 12)}… (원본과 일치)`)
  if (!files.some((f) => f.name === 'leaderboard.json')) console.log(`- ${LEADERBOARD} 없음, 순위 기록은 백업하지 않음`)
}

function verify(dir) {
  if (!dir) fail('사용법: node daily.mjs verify <백업 폴더>')
  const problems = verifyDir(dir)
  if (problems.length) fail(`백업 검증 실패\n- ${problems.join('\n- ')}`)
  const manifest = readJson(join(dir, 'manifest.json'))
  console.log(`백업 확인: ${dir}`)
  for (const f of manifest.files) console.log(`- ${f.name}: 존재, ${f.count}건, 해시 일치`)
}

// 비교용 정규화: 공백·문장부호 제거
const norm = (s) => s.replace(/[\s?!.,'"‘’“”·()]/g, '')
function bigrams(s) {
  const t = norm(s)
  const set = new Set()
  for (let i = 0; i < t.length - 1; i++) set.add(t.slice(i, i + 2))
  return set
}
function similarity(a, b) {
  const A = bigrams(a), B = bigrams(b)
  if (!A.size || !B.size) return 0
  let inter = 0
  for (const x of A) if (B.has(x)) inter++
  return inter / (A.size + B.size - inter)
}

// 후보 문항의 형식과 기존 문항과의 중복을 검사한다
function dup(candidateFile) {
  if (!candidateFile) fail('사용법: node daily.mjs dup <후보 JSON 배열 파일>')
  const bank = readJson(BANK)
  const raw = readJson(candidateFile)
  const candidates = Array.isArray(raw) ? raw : [raw]
  const ids = new Set(bank.map((q) => q.id))
  let errors = 0
  let warnings = 0
  for (const c of candidates) {
    const e = []
    const w = []
    if (!CATEGORIES.includes(c.category)) e.push(`category 값 ${c.category}`)
    if (!DIFFS.includes(c.difficulty)) e.push(`difficulty 값 ${c.difficulty}`)
    if (typeof c.id !== 'string' || !c.id.startsWith(`${PREFIX[c.category]}-`)) e.push(`id 접두어가 ${PREFIX[c.category]}-가 아님`)
    if (ids.has(c.id)) e.push(`id ${c.id} 이미 있음`)
    ids.add(c.id)
    if (typeof c.question !== 'string' || !c.question.trim()) e.push('question 없음')
    else if (c.question.length > 80) e.push(`question ${c.question.length}자 (80자 초과)`)
    if (!Array.isArray(c.options) || c.options.length !== 4) e.push('options가 4개가 아님')
    else {
      if (new Set(c.options).size !== 4) e.push('보기 중복')
      c.options.forEach((o, i) => { if (o.length > 20) e.push(`보기 ${i + 1} ${o.length}자 (20자 초과)`) })
      if (c.options.some((o) => /모두 정답|정답 없음|모두 맞|모두 틀/.test(o))) e.push("'모두 정답'류 보기")
      const lens = c.options.map((o) => [...o].length)
      const max = Math.max(...lens)
      if (lens[c.answerIndex] === max && lens.filter((l) => l === max).length === 1 && max - Math.min(...lens) >= 4) w.push('정답 보기만 눈에 띄게 김')
    }
    if (!Number.isInteger(c.answerIndex) || c.answerIndex < 0 || c.answerIndex > 3) e.push(`answerIndex ${c.answerIndex}`)
    if (typeof c.explanation !== 'string' || !c.explanation.trim()) e.push('explanation 없음')
    if (typeof c.source !== 'string' || !c.source.trim()) e.push('source 없음 (AI 작성 문제는 필수)')

    if (typeof c.question === 'string' && Array.isArray(c.options)) {
      const answer = c.options[c.answerIndex]
      for (const q of bank) {
        if (norm(q.question) === norm(c.question)) e.push(`${q.id}와 질문이 같음`)
        else {
          const sim = similarity(q.question, c.question)
          if (sim >= 0.5) e.push(`${q.id}와 질문 유사도 ${sim.toFixed(2)}`)
          else if (sim >= 0.3) w.push(`${q.id}와 질문 유사도 ${sim.toFixed(2)}, 같은 사실을 묻는지 직접 확인`)
        }
        const qAnswer = q.options[q.answerIndex]
        if (answer && norm(qAnswer) === norm(answer)) w.push(`${q.id}와 정답이 같음 (${answer}), 같은 사실을 묻는지 직접 확인`)
        if (answer && q.explanation.includes(answer) && q.id !== c.id) w.push(`${q.id} 해설에 정답 '${answer}'가 나옴 (힌트 노출 여부 확인)`)
      }
    }
    errors += e.length
    warnings += w.length
    console.log(`## ${c.id ?? '(id 없음)'}: ${e.length ? '오류' : '통과'}`)
    for (const x of e) console.log(`- 오류: ${x}`)
    for (const x of w) console.log(`- 확인: ${x}`)
  }
  console.log(`\n후보 ${candidates.length}개, 오류 ${errors}건, 확인 ${warnings}건`)
  if (errors) process.exit(1)
}

function counts(bank) {
  const r = {}
  for (const c of CATEGORIES) {
    r[c] = { total: 0, easy: 0, normal: 0, hard: 0 }
  }
  for (const q of bank) if (r[q.category]) { r[q.category].total++; r[q.category][q.difficulty]++ }
  return r
}

// 백업(변경 전)과 현재 파일을 비교해 추가·삭제·수정 문항과 분포 변화를 출력한다
function diff(beforeFile, afterFile = BANK) {
  if (!beforeFile) fail('사용법: node daily.mjs diff <변경 전 questions.json> [변경 후 파일]')
  const before = readJson(beforeFile)
  const after = readJson(afterFile)
  const b = new Map(before.map((q) => [q.id, q]))
  const a = new Map(after.map((q) => [q.id, q]))
  const added = [...a.keys()].filter((id) => !b.has(id))
  const removed = [...b.keys()].filter((id) => !a.has(id))
  const modified = [...a.keys()].filter((id) => b.has(id) && JSON.stringify(a.get(id)) !== JSON.stringify(b.get(id)))
  console.log(`전체: ${before.length} → ${after.length}`)
  console.log(`추가: ${added.join(', ') || '없음'}`)
  console.log(`삭제: ${removed.join(', ') || '없음'}`)
  console.log(`수정: ${modified.map((id) => `${id}(${Object.keys(a.get(id)).filter((k) => JSON.stringify(a.get(id)[k]) !== JSON.stringify(b.get(id)[k])).join('·')})`).join(', ') || '없음'}`)
  const cb = counts(before), ca = counts(after)
  console.log('\n| 카테고리 | 문제 수 | easy | normal | hard |\n| --- | --- | --- | --- | --- |')
  const cell = (x, y) => (x === y ? `${y}` : `${x} → ${y}`)
  for (const c of CATEGORIES) {
    console.log(`| ${c} | ${cell(cb[c].total, ca[c].total)} | ${cell(cb[c].easy, ca[c].easy)} | ${cell(cb[c].normal, ca[c].normal)} | ${cell(cb[c].hard, ca[c].hard)} |`)
  }
  if (removed.length) process.exit(1) // 이 작업은 삭제를 하지 않으므로 삭제가 보이면 오류
}

const [cmd, ...args] = process.argv.slice(2)
const commands = { backup, verify, dup, diff }
if (!commands[cmd]) fail('사용법: node daily.mjs <backup [라벨] | verify <폴더> | dup <후보.json> | diff <변경 전 파일> [변경 후 파일]>')
commands[cmd](...args)
