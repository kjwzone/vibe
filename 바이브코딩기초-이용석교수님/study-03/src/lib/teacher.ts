// 선생님 모드용 학생 결과 파일 생성·검사와 반 성적 집계·CSV 변환 순수 함수 모음
import { CATEGORIES, type Category, type Question } from './questions'
import { validateNickname } from './leaderboard'
import {
  POINTS_PER_CORRECT,
  calcAccuracy,
  calcCategoryScores,
  calcTotalScore,
  countCorrect,
  getGrade,
  type AnswerResult,
} from './scoring'

export const RESULT_FORMAT = 'quiz-result'
export const RESULT_VERSION = 1

export interface StudentAnswer {
  questionId: string
  category: Category
  correct: boolean
}

// 학생이 저장해 선생님께 내는 결과 파일 한 건 (문항별 정답 여부 포함)
export interface StudentResult {
  format: typeof RESULT_FORMAT
  version: typeof RESULT_VERSION
  name: string
  playedAt: string
  durationSec: number
  score: number
  correctCount: number
  totalQuestions: number
  categoryScores: Record<Category, number>
  answers: StudentAnswer[]
}

export function buildStudentResult(input: {
  name: string
  results: readonly AnswerResult[]
  durationSec: number
  now: Date
}): StudentResult {
  return {
    format: RESULT_FORMAT,
    version: RESULT_VERSION,
    name: input.name,
    playedAt: input.now.toISOString(),
    durationSec: input.durationSec,
    score: calcTotalScore(input.results),
    correctCount: countCorrect(input.results),
    totalQuestions: input.results.length,
    categoryScores: calcCategoryScores(input.results),
    answers: input.results.map(({ questionId, category, correct }) => ({ questionId, category, correct })),
  }
}

export type ExportResult =
  | { ok: true; result: StudentResult; fileName: string; text: string }
  | { ok: false; message: string }

// 이름 검사 → 결과 생성 → 파일 이름·내용까지 한 번에 만든다 (화면에서 Date를 직접 만들지 않도록)
export function prepareResultExport(input: {
  rawName: string
  results: readonly AnswerResult[]
  durationSec: number
  now?: Date
}): ExportResult {
  const check = validateNickname(input.rawName)
  if (!check.ok) return { ok: false, message: check.message.replace('닉네임', '이름') }
  const result = buildStudentResult({
    name: check.nickname,
    results: input.results,
    durationSec: input.durationSec,
    now: input.now ?? new Date(),
  })
  return { ok: true, result, fileName: resultFileName(result), text: JSON.stringify(result, null, 2) }
}

// 예: quiz-result-김민수-20261106-1930.json (기기 현지 시각)
export function resultFileName(result: StudentResult): string {
  const d = new Date(result.playedAt)
  const pad = (n: number) => String(n).padStart(2, '0')
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`
  const safeName = result.name.replace(/[\\/:*?"<>|\s]/g, '_')
  return `quiz-result-${safeName}-${stamp}.json`
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

// 모양과 함께 점수가 문항별 정답과 맞는지까지 확인한다. 문제가 없으면 null
function checkResult(value: unknown): string | null {
  if (typeof value !== 'object' || value === null) return '객체가 아님'
  const v = value as Record<string, unknown>
  if (v.format !== RESULT_FORMAT || v.version !== RESULT_VERSION) return '퀴즈 결과 파일 형식이 아님'
  if (typeof v.name !== 'string' || !validateNickname(v.name).ok) return '이름이 올바르지 않음'
  if (typeof v.playedAt !== 'string' || Number.isNaN(Date.parse(v.playedAt))) return '기록 시각이 올바르지 않음'
  if (!isFiniteNumber(v.durationSec) || v.durationSec < 0) return '소요시간이 올바르지 않음'
  if (!Array.isArray(v.answers)) return '문항별 답이 없음'
  const answers = v.answers as unknown[]
  const answersOk = answers.every((a) => {
    if (typeof a !== 'object' || a === null) return false
    const x = a as Record<string, unknown>
    return (
      typeof x.questionId === 'string' &&
      CATEGORIES.includes(x.category as Category) &&
      typeof x.correct === 'boolean'
    )
  })
  if (!answersOk) return '문항별 답의 모양이 올바르지 않음'
  const list = answers as StudentAnswer[]
  const correct = list.filter((a) => a.correct).length
  if (v.totalQuestions !== list.length) return '문제 수가 답 개수와 다름'
  if (v.correctCount !== correct) return '정답 수가 답과 다름'
  if (v.score !== correct * POINTS_PER_CORRECT) return '총점이 답과 다름'
  const scores = v.categoryScores as Record<string, unknown> | null
  if (typeof scores !== 'object' || scores === null) return '분야별 점수가 없음'
  for (const category of CATEGORIES) {
    const expected = list.filter((a) => a.category === category && a.correct).length * POINTS_PER_CORRECT
    if (scores[category] !== expected) return '분야별 점수가 답과 다름'
  }
  return null
}

export interface ParsedResults {
  results: StudentResult[]
  errors: string[]
}

// 파일 내용 하나(결과 한 건 또는 배열)를 읽는다. source는 오류 메시지에 쓸 파일 이름
export function parseResultText(text: string, source: string): ParsedResults {
  let data: unknown
  try {
    data = JSON.parse(text.replace(/^﻿/, ''))
  } catch {
    return { results: [], errors: [`${source}: JSON 파일이 아니에요.`] }
  }
  const items = Array.isArray(data) ? data : [data]
  const results: StudentResult[] = []
  const errors: string[] = []
  items.forEach((item, index) => {
    const problem = checkResult(item)
    if (problem === null) results.push(item as StudentResult)
    else errors.push(`${source}${items.length > 1 ? ` ${index + 1}번째 기록` : ''}: ${problem}`)
  })
  return { results, errors }
}

const resultKey = (r: StudentResult) => `${r.name}|${r.playedAt}`

// 이름과 기록 시각이 같은 기록은 같은 기록으로 보고 한 번만 넣는다
export function mergeResults(
  existing: readonly StudentResult[],
  incoming: readonly StudentResult[],
): { results: StudentResult[]; duplicates: number } {
  const seen = new Set(existing.map(resultKey))
  const results = [...existing]
  let duplicates = 0
  for (const r of incoming) {
    const key = resultKey(r)
    if (seen.has(key)) {
      duplicates++
      continue
    }
    seen.add(key)
    results.push(r)
  }
  return { results, duplicates }
}

// 순위표와 같은 규칙: 총점 ↓ → 소요시간 ↑ → 기록 시각 ↑
export function rankResults(results: readonly StudentResult[]): StudentResult[] {
  return [...results].sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score
    if (a.durationSec !== b.durationSec) return a.durationSec - b.durationSec
    if (a.playedAt === b.playedAt) return 0
    return a.playedAt < b.playedAt ? -1 : 1
  })
}

const round1 = (n: number) => Math.round(n * 10) / 10
const average = (values: number[]) =>
  values.length === 0 ? 0 : values.reduce((s, v) => s + v, 0) / values.length

export interface ClassSummary {
  studentCount: number
  recordCount: number
  averageScore: number
  maxScore: number
  minScore: number
  averageDurationSec: number
  categoryAverages: Record<Category, number>
}

export function summarizeClass(results: readonly StudentResult[]): ClassSummary {
  const scores = results.map((r) => r.score)
  const categoryAverages = {} as Record<Category, number>
  for (const category of CATEGORIES) {
    categoryAverages[category] = round1(average(results.map((r) => r.categoryScores[category])))
  }
  return {
    studentCount: new Set(results.map((r) => r.name)).size,
    recordCount: results.length,
    averageScore: round1(average(scores)),
    maxScore: scores.length ? Math.max(...scores) : 0,
    minScore: scores.length ? Math.min(...scores) : 0,
    averageDurationSec: Math.round(average(results.map((r) => r.durationSec))),
    categoryAverages,
  }
}

export interface QuestionStat {
  questionId: string
  category: Category
  // 지금 문제 은행에 없는 문항이면 null
  question: string | null
  attempts: number
  correct: number
  rate: number
}

// 정답률 낮은 순 (같으면 시도 수 많은 순, 그다음 id 순)
export function questionStats(
  results: readonly StudentResult[],
  bank: readonly Question[],
): QuestionStat[] {
  const texts = new Map(bank.map((q) => [q.id, q.question]))
  const stats = new Map<string, QuestionStat>()
  for (const r of results) {
    for (const a of r.answers) {
      const s = stats.get(a.questionId) ?? {
        questionId: a.questionId,
        category: a.category,
        question: texts.get(a.questionId) ?? null,
        attempts: 0,
        correct: 0,
        rate: 0,
      }
      s.attempts++
      if (a.correct) s.correct++
      stats.set(a.questionId, s)
    }
  }
  return [...stats.values()]
    .map((s) => ({ ...s, rate: calcAccuracy(s.correct, s.attempts) }))
    .sort((a, b) => a.rate - b.rate || b.attempts - a.attempts || (a.questionId < b.questionId ? -1 : 1))
}

// 쉼표·따옴표·줄바꿈은 감싸고, 엑셀이 수식으로 읽을 수 있는 값은 작은따옴표를 붙인다
function csvCell(value: string | number): string {
  let text = String(value)
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

// 엑셀에서 한글이 깨지지 않도록 UTF-8 BOM을 붙인다
export function toCSV(results: readonly StudentResult[]): string {
  const header = ['순위', '이름', '총점', '정답 수', '문제 수', '정답률(%)', '한국사', '과학', '지리', '일반상식', '소요시간(초)', '등급', '기록 시각']
  const rows = rankResults(results).map((r, i) => [
    i + 1,
    r.name,
    r.score,
    r.correctCount,
    r.totalQuestions,
    calcAccuracy(r.correctCount, r.totalQuestions),
    ...CATEGORIES.map((c) => r.categoryScores[c]),
    r.durationSec,
    getGrade(r.score),
    r.playedAt,
  ])
  return '﻿' + [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n'
}
