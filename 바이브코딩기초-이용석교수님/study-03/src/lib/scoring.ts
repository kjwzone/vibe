// 점수·정답률·등급·소요시간을 계산하는 순수 함수 모음 (PRD 4장, 7장)
import { CATEGORIES, type Category } from './questions'

export const POINTS_PER_CORRECT = 10

export interface AnswerResult {
  questionId: string
  category: Category
  selectedIndex: number
  correct: boolean
}

export type Grade = '상식 마스터' | '상식 고수' | '상식 중수' | '상식 입문'

export function countCorrect(results: readonly AnswerResult[]): number {
  return results.filter((r) => r.correct).length
}

// 총점 = 정답 수 × 10
export function calcTotalScore(results: readonly AnswerResult[]): number {
  return countCorrect(results) * POINTS_PER_CORRECT
}

// 카테고리별 점수 (각 카테고리 정답 수 × 10)
export function calcCategoryScores(
  results: readonly AnswerResult[],
): Record<Category, number> {
  const scores = {} as Record<Category, number>
  for (const category of CATEGORIES) {
    scores[category] =
      results.filter((r) => r.category === category && r.correct).length *
      POINTS_PER_CORRECT
  }
  return scores
}

// 라운드(카테고리) 정답 수, 라운드 결과 화면의 x/10에 쓴다
export function calcRoundCorrect(
  results: readonly AnswerResult[],
  category: Category,
): number {
  return results.filter((r) => r.category === category && r.correct).length
}

// 정답률(%) = 정답 수 ÷ 전체 문제 수 × 100, 소수 첫째 자리까지
export function calcAccuracy(correctCount: number, totalQuestions: number): number {
  if (totalQuestions === 0) return 0
  return Math.round((correctCount / totalQuestions) * 1000) / 10
}

// 등급 기준은 PRD 7장 표 (점수는 10점 단위라 하한값만 비교한다)
export function getGrade(score: number): Grade {
  if (score >= 360) return '상식 마스터'
  if (score >= 280) return '상식 고수'
  if (score >= 200) return '상식 중수'
  return '상식 입문'
}

// 소요시간(초) = 1번 문제 표시 ~ 마지막 문제 답 선택
export function calcDurationSec(startedAt: number, finishedAt: number): number {
  return Math.max(0, Math.round((finishedAt - startedAt) / 1000))
}

export function formatDuration(totalSec: number): string {
  const minutes = Math.floor(totalSec / 60)
  const seconds = totalSec % 60
  return minutes > 0 ? `${minutes}분 ${seconds}초` : `${seconds}초`
}
