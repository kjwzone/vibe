// class-results/의 학생 결과 파일을 검사·집계하고 teacher_report.html을 만드는 선생님 모드 스킬 공용 스크립트
// 검사·정렬·집계 규칙은 src/lib/teacher.ts와 같게 유지한다 (바꾸면 둘 다 고칠 것)
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const BANK = 'src/data/questions.json'
const CATEGORIES = ['history', 'science', 'geography', 'general']
const LABELS = { history: '한국사', science: '과학', geography: '지리', general: '일반상식' }
const POINTS = 10
const LOW_RATE = 30 // 정답률이 이보다 낮고
const MIN_ATTEMPTS = 3 // 시도가 이 이상이면 정답 오류를 의심한다

const [cmd = 'collect', dir = 'class-results'] = process.argv.slice(2)
const fail = (msg) => {
  console.log(`오류: ${msg}`)
  process.exit(1)
}

// teacher.ts checkResult와 같은 검사
function checkResult(v) {
  if (typeof v !== 'object' || v === null) return '객체가 아님'
  if (v.format !== 'quiz-result' || v.version !== 1) return '퀴즈 결과 파일 형식이 아님'
  const name = typeof v.name === 'string' ? v.name.trim() : ''
  if (name !== v.name || [...name].length < 2 || [...name].length > 10) return '이름이 올바르지 않음'
  if (typeof v.playedAt !== 'string' || Number.isNaN(Date.parse(v.playedAt))) return '기록 시각이 올바르지 않음'
  if (typeof v.durationSec !== 'number' || !Number.isFinite(v.durationSec) || v.durationSec < 0) return '소요시간이 올바르지 않음'
  if (!Array.isArray(v.answers)) return '문항별 답이 없음'
  if (!v.answers.every((a) => a && typeof a.questionId === 'string' && CATEGORIES.includes(a.category) && typeof a.correct === 'boolean'))
    return '문항별 답의 모양이 올바르지 않음'
  const correct = v.answers.filter((a) => a.correct).length
  if (v.totalQuestions !== v.answers.length) return '문제 수가 답 개수와 다름'
  if (v.correctCount !== correct) return '정답 수가 답과 다름'
  if (v.score !== correct * POINTS) return '총점이 답과 다름'
  if (typeof v.categoryScores !== 'object' || v.categoryScores === null) return '분야별 점수가 없음'
  for (const c of CATEGORIES)
    if (v.categoryScores[c] !== v.answers.filter((a) => a.category === c && a.correct).length * POINTS) return '분야별 점수가 답과 다름'
  return null
}

function collect() {
  if (!existsSync(dir)) fail(`${dir}/ 폴더가 없음. 학생 결과 파일(quiz-result-*.json)을 이 폴더에 모을 것`)
  const files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.json')).sort()
  if (files.length === 0) fail(`${dir}/에 .json 파일이 없음`)
  const bankIds = new Set(JSON.parse(readFileSync(BANK, 'utf8')).map((q) => q.id))
  const results = []
  const problems = []
  const seen = new Set()
  let duplicates = 0
  for (const file of files) {
    let data
    try {
      data = JSON.parse(readFileSync(join(dir, file), 'utf8').replace(/^﻿/, ''))
    } catch {
      problems.push(`${file}: JSON 파일이 아님`)
      continue
    }
    const items = Array.isArray(data) ? data : [data]
    items.forEach((item, i) => {
      const problem = checkResult(item)
      if (problem) return problems.push(`${file}${items.length > 1 ? ` ${i + 1}번째` : ''}: ${problem}`)
      const key = `${item.name}|${item.playedAt}`
      if (seen.has(key)) return duplicates++
      seen.add(key)
      results.push({ ...item, file })
    })
  }
  const unknownIds = [...new Set(results.flatMap((r) => r.answers.map((a) => a.questionId)).filter((id) => !bankIds.has(id)))]
  return { files, results, problems, duplicates, unknownIds }
}

const rank = (list) =>
  [...list].sort((a, b) => b.score - a.score || a.durationSec - b.durationSec || (a.playedAt < b.playedAt ? -1 : a.playedAt > b.playedAt ? 1 : 0))
const round1 = (n) => Math.round(n * 10) / 10
const avg = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0)
const rate = (c, n) => (n ? Math.round((c / n) * 1000) / 10 : 0)
const grade = (s) => (s >= 360 ? '상식 마스터' : s >= 280 ? '상식 고수' : s >= 200 ? '상식 중수' : '상식 입문')
const duration = (t) => (Math.floor(t / 60) > 0 ? `${Math.floor(t / 60)}분 ${t % 60}초` : `${t % 60}초`)

function summarize(results) {
  const scores = results.map((r) => r.score)
  return {
    studentCount: new Set(results.map((r) => r.name)).size,
    recordCount: results.length,
    averageScore: round1(avg(scores)),
    maxScore: scores.length ? Math.max(...scores) : 0,
    minScore: scores.length ? Math.min(...scores) : 0,
    averageDurationSec: Math.round(avg(results.map((r) => r.durationSec))),
    categoryAverages: Object.fromEntries(CATEGORIES.map((c) => [c, round1(avg(results.map((r) => r.categoryScores[c])))])),
  }
}

function questionStats(results) {
  const bank = new Map(JSON.parse(readFileSync(BANK, 'utf8')).map((q) => [q.id, q]))
  const stats = new Map()
  for (const r of results)
    for (const a of r.answers) {
      const s = stats.get(a.questionId) ?? { questionId: a.questionId, category: a.category, attempts: 0, correct: 0 }
      s.attempts++
      if (a.correct) s.correct++
      stats.set(a.questionId, s)
    }
  return [...stats.values()]
    .map((s) => {
      const q = bank.get(s.questionId)
      return { ...s, rate: rate(s.correct, s.attempts), question: q?.question ?? null, answer: q ? q.options[q.answerIndex] : null }
    })
    .sort((a, b) => a.rate - b.rate || b.attempts - a.attempts || (a.questionId < b.questionId ? -1 : 1))
}

function printCollect(c) {
  console.log(`## 수집 결과 (${dir}/)`)
  console.log(`- 파일 ${c.files.length}개, 유효 기록 ${c.results.length}건, 중복 ${c.duplicates}건 제외, 문제 있는 기록 ${c.problems.length}건`)
  for (const p of c.problems) console.log(`- 경고: ${p}`)
  if (c.unknownIds.length) console.log(`- 경고: 지금 문제 은행에 없는 문항 id ${c.unknownIds.join(', ')}`)
  console.log('\n| 이름 | 점수 | 정답/문제 | 소요시간 | 기록 시각 | 파일 |\n| --- | --- | --- | --- | --- | --- |')
  for (const r of rank(c.results)) console.log(`| ${r.name} | ${r.score} | ${r.correctCount}/${r.totalQuestions} | ${duration(r.durationSec)} | ${r.playedAt} | ${r.file} |`)
  if (c.results.length === 0) fail('유효한 학생 기록이 하나도 없음')
}

function printQuestions(c) {
  const stats = questionStats(c.results)
  console.log(`## 문항별 정답률 (${c.results.length}건 기준, 낮은 순)\n`)
  console.log('| 문항 | 분야 | 정답률 | 정답/시도 | 문제 | 정답 |\n| --- | --- | --- | --- | --- | --- |')
  for (const s of stats) console.log(`| ${s.questionId} | ${LABELS[s.category]} | ${s.rate}% | ${s.correct}/${s.attempts} | ${s.question ?? '(문제 은행에 없음)'} | ${s.answer ?? '-'} |`)
  const suspects = stats.filter((s) => s.rate < LOW_RATE && s.attempts >= MIN_ATTEMPTS)
  console.log(`\n정답 오류 의심 (정답률 ${LOW_RATE}% 미만, 시도 ${MIN_ATTEMPTS}회 이상): ${suspects.map((s) => s.questionId).join(', ') || '없음'}`)
}

const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch])

function writeReport(c) {
  const ranked = rank(c.results)
  const s = summarize(c.results)
  const stats = questionStats(c.results)
  const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false })
  const studentRows = ranked.map((r, i) =>
    `<tr><td>${i + 1}</td><th scope="row">${esc(r.name)}</th><td>${r.score}</td><td>${rate(r.correctCount, r.totalQuestions)}</td>` +
    CATEGORIES.map((cat) => `<td>${r.categoryScores[cat]}</td>`).join('') +
    `<td>${r.durationSec}</td><td>${grade(r.score)}</td><td>${esc(r.playedAt)}</td></tr>`).join('\n')
  const questionRows = stats.map((q) =>
    `<tr><th scope="row">${esc(q.questionId)}</th><td>${LABELS[q.category]}</td><td>${esc(q.question ?? '(문제 은행에 없음)')}</td><td>${esc(q.answer ?? '-')}</td><td>${q.rate}</td><td>${q.correct}</td><td>${q.attempts}</td></tr>`).join('\n')
  const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>상식 퀴즈 반 성적 보고서</title>
<style>
  body { font-family: 'Malgun Gothic', 'Noto Sans KR', sans-serif; color: #14213d; margin: 24px; font-size: 14px; }
  h1 { font-size: 22px; margin: 0 0 4px; } h2 { font-size: 17px; margin: 24px 0 8px; }
  .meta { color: #4a5670; margin: 0 0 16px; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 8px; }
  th, td { border: 1px solid #c4cde0; padding: 4px 8px; text-align: left; }
  thead th { background: #eef1f7; }
  tbody th { white-space: nowrap; }
  .warn { color: #b3261e; }
  @media print { body { margin: 0; } tr { break-inside: avoid; } }
</style>
</head>
<body>
<h1>상식 퀴즈 반 성적 보고서</h1>
<p class="meta">생성 시각 ${esc(now)} (KST) · 학생 ${s.studentCount}명 · 기록 ${s.recordCount}건 · 평균 ${s.averageScore}점 · 최고 ${s.maxScore}점 · 최저 ${s.minScore}점 · 평균 소요시간 ${duration(s.averageDurationSec)}</p>
${c.problems.length ? `<p class="warn">제외한 기록 ${c.problems.length}건: ${c.problems.map(esc).join(' / ')}</p>` : ''}
<h2>분야별 평균 점수 (100점 만점)</h2>
<table data-export="categories"><thead><tr>${CATEGORIES.map((cat) => `<th scope="col">${LABELS[cat]}</th>`).join('')}</tr></thead>
<tbody><tr>${CATEGORIES.map((cat) => `<td>${s.categoryAverages[cat]}</td>`).join('')}</tr></tbody></table>
<h2>학생별 성적</h2>
<table data-export="students"><thead><tr><th scope="col">순위</th><th scope="col">이름</th><th scope="col">총점</th><th scope="col">정답률(%)</th>${CATEGORIES.map((cat) => `<th scope="col">${LABELS[cat]}</th>`).join('')}<th scope="col">소요시간(초)</th><th scope="col">등급</th><th scope="col">기록 시각</th></tr></thead>
<tbody>
${studentRows}
</tbody></table>
<h2>문항별 정답률 (낮은 순)</h2>
<table data-export="questions"><thead><tr><th scope="col">문항</th><th scope="col">분야</th><th scope="col">문제</th><th scope="col">정답</th><th scope="col">정답률(%)</th><th scope="col">정답 수</th><th scope="col">시도 수</th></tr></thead>
<tbody>
${questionRows}
</tbody></table>
</body>
</html>
`
  const out = join(dir, 'report')
  mkdirSync(out, { recursive: true })
  const path = join(out, 'teacher_report.html')
  writeFileSync(path, html)
  const written = readFileSync(path, 'utf8')
  const count = (name) => (written.match(new RegExp(`data-export="${name}"[\\s\\S]*?<tbody>([\\s\\S]*?)</tbody>`))?.[1].match(/<tr>/g) ?? []).length
  if (count('students') !== ranked.length || count('questions') !== stats.length) fail(`${path} 표 행 수가 집계와 다름`)
  console.log(`보고서 작성: ${path} (학생 ${ranked.length}행, 문항 ${stats.length}행 확인)`)
}

const c = collect()
if (cmd === 'collect') printCollect(c)
else if (cmd === 'questions') { printCollect(c); console.log(''); printQuestions(c) }
else if (cmd === 'report') { printCollect(c); writeReport(c) }
else fail('사용법: node class.mjs <collect | questions | report> [폴더=class-results]')
