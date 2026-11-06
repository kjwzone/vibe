// 브라우저에서 내보낸 quiz_leaderboard 기록을 합쳐 leaderboard.ts와 같은 규칙으로 순위를 집계하는 스크립트
import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// src/lib/leaderboard.ts, scoring.ts와 같은 값
const LEADERBOARD_KEY = 'quiz_leaderboard'
const MAX_ENTRIES = 50
const TOP_N = 10
const CATEGORIES = ['history', 'science', 'geography', 'general']
const LABELS = { history: '한국사', science: '과학', geography: '지리', general: '일반상식' }
const OUT_DIR = 'leaderboard'
const OUT_JSON = join(OUT_DIR, 'leaderboard.json')

const isNum = (v) => typeof v === 'number' && Number.isFinite(v)
// leaderboard.ts의 isEntry와 같은 검사
const isEntry = (v) =>
  typeof v === 'object' && v !== null &&
  typeof v.nickname === 'string' && isNum(v.score) && isNum(v.correctCount) &&
  isNum(v.durationSec) && typeof v.playedAt === 'string' &&
  typeof v.categoryScores === 'object' && v.categoryScores !== null &&
  CATEGORIES.every((c) => isNum(v.categoryScores[c]))
// leaderboard.ts의 compareEntries와 같은 정렬: 총점 ↓ → 소요시간 ↑ → 기록 시각 ↑
const compare = (a, b) =>
  a.score !== b.score ? b.score - a.score
    : a.durationSec !== b.durationSec ? a.durationSec - b.durationSec
      : a.playedAt === b.playedAt ? 0 : a.playedAt < b.playedAt ? -1 : 1
// scoring.ts의 getGrade, formatDuration과 같은 규칙
const grade = (s) => (s >= 360 ? '상식 마스터' : s >= 280 ? '상식 고수' : s >= 200 ? '상식 중수' : '상식 입문')
const duration = (t) => (Math.floor(t / 60) > 0 ? `${Math.floor(t / 60)}분 ${t % 60}초` : `${t % 60}초`)
const kst = (iso) => new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false })
const esc = (s) => s.replace(/\|/g, '\\|')

let inputs = process.argv.slice(2)
if (inputs.length === 0) {
  inputs = existsSync(OUT_DIR)
    ? readdirSync(OUT_DIR).filter((f) => f.endsWith('.json')).map((f) => join(OUT_DIR, f))
    : []
}
if (inputs.length === 0) {
  console.log(`읽을 기록 파일이 없습니다. ${OUT_DIR}/ 폴더에 내보낸 JSON을 넣거나 경로를 인수로 주세요.`)
  process.exit(1)
}

const report = []
const byKey = new Map()
let invalid = 0
for (const file of inputs) {
  let data
  try {
    data = JSON.parse(readFileSync(file, 'utf8').replace(/^﻿/, ''))
    if (typeof data === 'string') data = JSON.parse(data) // 따옴표로 감싼 문자열로 저장된 경우
  } catch (e) {
    report.push(`- ${file}: JSON을 읽지 못함 (${e.message})`)
    continue
  }
  if (!Array.isArray(data)) {
    report.push(`- ${file}: 배열이 아니라서 건너뜀`)
    continue
  }
  const valid = data.filter(isEntry)
  invalid += data.length - valid.length
  for (const e of valid) byKey.set(`${e.playedAt}|${e.nickname}`, e)
  report.push(`- ${file}: ${data.length}건 중 유효 ${valid.length}건`)
}

const all = [...byKey.values()].sort(compare)
const kept = all.slice(0, MAX_ENTRIES)
const dropped = all.length - kept.length

// 닉네임별 집계 (보관된 기록 기준)
const players = new Map()
for (const e of kept) {
  const p = players.get(e.nickname) ?? { plays: 0, best: 0, sum: 0, fastest: Infinity }
  p.plays++
  p.best = Math.max(p.best, e.score)
  p.sum += e.score
  if (e.score === p.best) p.fastest = Math.min(p.fastest, e.durationSec)
  players.set(e.nickname, p)
}

const md = []
md.push('# 상식 퀴즈 리더보드', '')
md.push(`집계 시각: ${kst(new Date().toISOString())} (KST)`, '')
md.push(`- 읽은 파일 ${inputs.length}개, 중복 제거 후 기록 ${all.length}건, 보관 ${kept.length}건 (최대 ${MAX_ENTRIES}건${dropped ? `, ${dropped}건 제외` : ''})`)
md.push(`- 모양이 잘못된 기록 ${invalid}건은 제외`, '')
md.push(`## Top ${TOP_N}`, '')
md.push('| 순위 | 닉네임 | 점수 | 정답 | 등급 | 소요시간 | 기록 시각 (KST) |')
md.push('| --- | --- | --- | --- | --- | --- | --- |')
kept.slice(0, TOP_N).forEach((e, i) =>
  md.push(`| ${i + 1} | ${esc(e.nickname)} | ${e.score} | ${e.correctCount}/40 | ${grade(e.score)} | ${duration(e.durationSec)} | ${kst(e.playedAt)} |`))
if (kept.length === 0) md.push('| - | 기록 없음 | | | | | |')
md.push('', '## 닉네임별', '')
md.push('| 닉네임 | 플레이 | 최고점 | 평균 | 최고점 최단 시간 |')
md.push('| --- | --- | --- | --- | --- |')
for (const [name, p] of [...players].sort((a, b) => b[1].best - a[1].best || a[1].fastest - b[1].fastest))
  md.push(`| ${esc(name)} | ${p.plays} | ${p.best} | ${(p.sum / p.plays).toFixed(1)} | ${duration(p.fastest)} |`)
md.push('', '## 카테고리별 평균 점수 (100점 만점)', '')
md.push('| ' + CATEGORIES.map((c) => LABELS[c]).join(' | ') + ' |')
md.push('| ' + CATEGORIES.map(() => '---').join(' | ') + ' |')
md.push('| ' + CATEGORIES.map((c) => (kept.length ? (kept.reduce((s, e) => s + e.categoryScores[c], 0) / kept.length).toFixed(1) : '-')).join(' | ') + ' |')

mkdirSync(OUT_DIR, { recursive: true })
writeFileSync(OUT_JSON, JSON.stringify(kept, null, 2) + '\n')
writeFileSync(join(OUT_DIR, 'LEADERBOARD.md'), md.join('\n') + '\n')
writeFileSync(
  join(OUT_DIR, 'import-snippet.js'),
  `// 게임 페이지의 개발자 도구 콘솔에 붙여 넣으면 합친 순위가 브라우저에 저장된다. 새로고침 후 순위표에서 확인한다.\n` +
    `localStorage.setItem(${JSON.stringify(LEADERBOARD_KEY)}, ${JSON.stringify(JSON.stringify(kept))})\n`,
)

console.log(['## 입력', ...report, '', md.join('\n'), '', `저장: ${OUT_JSON}, ${OUT_DIR}/LEADERBOARD.md, ${OUT_DIR}/import-snippet.js`].join('\n'))
