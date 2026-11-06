// questions.json의 문제 수, 카테고리·난이도 분포, 정답 위치 편향을 마크다운 표로 출력하는 스크립트
import { readFileSync } from 'node:fs'

const path = process.argv[2] ?? 'src/data/questions.json'
const questions = JSON.parse(readFileSync(path, 'utf8'))

const CATEGORIES = ['history', 'science', 'geography', 'general']
const LABELS = { history: '한국사', science: '과학', geography: '지리', general: '일반상식' }
const DIFFS = ['easy', 'normal', 'hard']
const RECOMMENDED = { easy: 4, normal: 4, hard: 2 }
const pct = (n, total) => (total === 0 ? '0%' : `${Math.round((n / total) * 100)}%`)

const out = []
out.push(`# 퀴즈 통계 (${path})`, '', `전체 문제 수: **${questions.length}**`, '')

// 카테고리 × 난이도
out.push('## 카테고리·난이도 분포', '')
out.push('| 카테고리 | 문제 수 | easy | normal | hard | 권장(10문제당 4·4·2) 대비 |')
out.push('| --- | --- | --- | --- | --- | --- |')
const diffTotal = { easy: 0, normal: 0, hard: 0 }
for (const c of CATEGORIES) {
  const qs = questions.filter((q) => q.category === c)
  const d = { easy: 0, normal: 0, hard: 0 }
  for (const q of qs) d[q.difficulty] = (d[q.difficulty] ?? 0) + 1
  for (const k of DIFFS) diffTotal[k] += d[k]
  const short = DIFFS.filter((k) => d[k] < RECOMMENDED[k]).map((k) => `${k} ${RECOMMENDED[k] - d[k]}개 부족`)
  const note = qs.length < 10 ? '라운드 10문제 미달' : short.length ? short.join(', ') : '충족'
  out.push(`| ${LABELS[c]} | ${qs.length} | ${d.easy} | ${d.normal} | ${d.hard} | ${note} |`)
}
const unknown = questions.filter((q) => !CATEGORIES.includes(q.category) || !DIFFS.includes(q.difficulty))
out.push(`| **합계** | ${questions.length} | ${diffTotal.easy} (${pct(diffTotal.easy, questions.length)}) | ${diffTotal.normal} (${pct(diffTotal.normal, questions.length)}) | ${diffTotal.hard} (${pct(diffTotal.hard, questions.length)}) | |`)
if (unknown.length) out.push('', `알 수 없는 category/difficulty: ${unknown.map((q) => q.id).join(', ')}`)
out.push('')

// 정답 위치 분포
function answerRow(label, qs) {
  const counts = [0, 0, 0, 0]
  for (const q of qs) counts[q.answerIndex]++
  const expected = qs.length / 4
  const flags = counts
    .map((n, i) => (n === 0 ? `${i + 1}번 0개` : n >= expected * 2 ? `${i + 1}번 쏠림` : null))
    .filter(Boolean)
  return `| ${label} | ${qs.length} | ${counts.map((n) => `${n} (${pct(n, qs.length)})`).join(' | ')} | ${flags.join(', ') || '고름'} |`
}
out.push('## 정답 보기 위치 분포 (원본 기준)', '')
out.push('| 범위 | 문제 수 | 1번 | 2번 | 3번 | 4번 | 판정 |')
out.push('| --- | --- | --- | --- | --- | --- | --- |')
for (const c of CATEGORIES) out.push(answerRow(LABELS[c], questions.filter((q) => q.category === c)))
out.push(answerRow('**전체**', questions))
const counts = [0, 0, 0, 0]
for (const q of questions) counts[q.answerIndex]++
const expected = questions.length / 4
const chi = counts.reduce((s, n) => s + (n - expected) ** 2 / expected, 0)
out.push('', `카이제곱 통계량: ${chi.toFixed(2)} (자유도 3, 7.81 이상이면 5% 수준에서 편향)`, '')

// 같은 정답 위치 연속
const streaks = []
for (const c of CATEGORIES) {
  const qs = questions.filter((q) => q.category === c)
  let start = 0
  for (let i = 1; i <= qs.length; i++) {
    if (i === qs.length || qs[i].answerIndex !== qs[start].answerIndex) {
      if (i - start >= 3) streaks.push(`${qs[start].id}~${qs[i - 1].id} (${qs[start].answerIndex + 1}번 ${i - start}연속)`)
      start = i
    }
  }
}
out.push(`같은 정답 위치 3연속 이상: ${streaks.length ? streaks.join(', ') : '없음'}`, '')

// 정답 보기 길이 편향
const longest = questions.filter((q) => {
  const lens = q.options.map((o) => [...o].length)
  const max = Math.max(...lens)
  return lens[q.answerIndex] === max && lens.filter((l) => l === max).length === 1
})
out.push('## 정답 보기 길이', '')
out.push(`정답이 혼자 가장 긴 보기인 문제: ${longest.length}개 / ${questions.length}개 (${pct(longest.length, questions.length)}, 우연 기대값 약 25% 이하)`)
if (longest.length) out.push('', longest.map((q) => q.id).join(', '))

console.log(out.join('\n'))
