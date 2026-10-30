// 점수·정답률·등급·소요시간 계산 함수 테스트
import { describe, expect, it } from 'vitest'
import type { Category } from './questions'
import {
  calcAccuracy,
  calcCategoryScores,
  calcDurationSec,
  calcRoundCorrect,
  calcTotalScore,
  countCorrect,
  formatDuration,
  getGrade,
  type AnswerResult,
} from './scoring'

function result(category: Category, correct: boolean, n = 0): AnswerResult {
  return { questionId: `${category}-${n}`, category, selectedIndex: 0, correct }
}

describe('점수 계산', () => {
  const results = [
    result('history', true, 1),
    result('history', false, 2),
    result('science', true, 3),
    result('science', true, 4),
    result('geography', false, 5),
    result('general', true, 6),
  ]

  it('총점은 정답 수 × 10이다', () => {
    expect(countCorrect(results)).toBe(4)
    expect(calcTotalScore(results)).toBe(40)
  })

  it('답한 기록이 없으면 0점이다', () => {
    expect(calcTotalScore([])).toBe(0)
  })

  it('카테고리별 점수의 합은 총점과 같다', () => {
    const scores = calcCategoryScores(results)
    expect(scores).toEqual({ history: 10, science: 20, geography: 0, general: 10 })
    const sum = Object.values(scores).reduce((a, b) => a + b, 0)
    expect(sum).toBe(calcTotalScore(results))
  })

  it('라운드 정답 수를 센다', () => {
    expect(calcRoundCorrect(results, 'science')).toBe(2)
    expect(calcRoundCorrect(results, 'geography')).toBe(0)
  })
})

describe('정답률', () => {
  it('정답 수 ÷ 전체 × 100을 소수 첫째 자리까지 계산한다', () => {
    expect(calcAccuracy(40, 40)).toBe(100)
    expect(calcAccuracy(29, 40)).toBe(72.5)
    expect(calcAccuracy(1, 3)).toBe(33.3)
    expect(calcAccuracy(0, 40)).toBe(0)
  })

  it('전체 문제 수가 0이면 0이다', () => {
    expect(calcAccuracy(0, 0)).toBe(0)
  })
})

describe('등급 (PRD 7장 표)', () => {
  it.each([
    [400, '상식 마스터'],
    [360, '상식 마스터'],
    [350, '상식 고수'],
    [280, '상식 고수'],
    [270, '상식 중수'],
    [200, '상식 중수'],
    [190, '상식 입문'],
    [0, '상식 입문'],
  ])('%i점은 %s', (score, grade) => {
    expect(getGrade(score)).toBe(grade)
  })
})

describe('소요시간', () => {
  it('밀리초 차이를 초 단위로 반올림한다', () => {
    expect(calcDurationSec(1000, 1000 + 61_400)).toBe(61)
    expect(calcDurationSec(1000, 1000 + 61_600)).toBe(62)
  })

  it('음수가 되지 않는다', () => {
    expect(calcDurationSec(5000, 1000)).toBe(0)
  })

  it('분·초로 표시한다', () => {
    expect(formatDuration(45)).toBe('45초')
    expect(formatDuration(60)).toBe('1분 0초')
    expect(formatDuration(512)).toBe('8분 32초')
  })
})
