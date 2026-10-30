// 문제 은행 데이터 검증과 출제 함수(섞기·정답 위치 재계산) 테스트
import { describe, expect, it } from 'vitest'
import {
  CATEGORIES,
  createGameRounds,
  getQuestionsByCategory,
  getRoundQuestions,
  questionBank,
  shuffle,
  shuffleOptions,
} from './questions'

// 시드 고정 난수 생성기 (mulberry32), 테스트 재현성을 위해 사용한다
function seededRandom(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('문제 은행 데이터', () => {
  it('총 40문제다', () => {
    expect(questionBank).toHaveLength(40)
  })

  it('카테고리별 10문제다', () => {
    for (const category of CATEGORIES) {
      expect(getQuestionsByCategory(category)).toHaveLength(10)
    }
  })

  it('카테고리별 난이도는 쉬움 4, 보통 4, 어려움 2다', () => {
    for (const category of CATEGORIES) {
      const counts = { easy: 0, normal: 0, hard: 0 }
      for (const q of getQuestionsByCategory(category)) counts[q.difficulty]++
      expect(counts).toEqual({ easy: 4, normal: 4, hard: 2 })
    }
  })

  it('id 중복이 없다', () => {
    const ids = questionBank.map((q) => q.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('모든 문제가 PRD 8장 스키마를 지킨다', () => {
    for (const q of questionBank) {
      expect(q.options, q.id).toHaveLength(4)
      expect(new Set(q.options).size, `${q.id} 보기 중복`).toBe(4)
      expect(Number.isInteger(q.answerIndex), q.id).toBe(true)
      expect(q.answerIndex, q.id).toBeGreaterThanOrEqual(0)
      expect(q.answerIndex, q.id).toBeLessThanOrEqual(3)
      expect(q.explanation.trim().length, `${q.id} 해설`).toBeGreaterThan(0)
      expect(q.question.length, `${q.id} 문제 길이`).toBeLessThanOrEqual(80)
      for (const option of q.options) {
        expect(option.length, `${q.id} 보기 길이`).toBeLessThanOrEqual(20)
      }
    }
  })
})

describe('shuffle', () => {
  it('원본을 바꾸지 않고 같은 원소를 가진 새 배열을 반환한다', () => {
    const original = [1, 2, 3, 4, 5]
    const result = shuffle(original, seededRandom(1))
    expect(original).toEqual([1, 2, 3, 4, 5])
    expect([...result].sort()).toEqual(original)
  })
})

describe('shuffleOptions', () => {
  it('보기를 섞은 뒤에도 answerIndex가 같은 정답 보기를 가리킨다', () => {
    for (let seed = 0; seed < 20; seed++) {
      for (const q of questionBank) {
        const shuffled = shuffleOptions(q, seededRandom(seed))
        expect(shuffled.options[shuffled.answerIndex], q.id).toBe(q.options[q.answerIndex])
        expect([...shuffled.options].sort()).toEqual([...q.options].sort())
      }
    }
  })

  it('원본 문제를 바꾸지 않는다', () => {
    const q = questionBank[0]
    const snapshot = JSON.parse(JSON.stringify(q))
    shuffleOptions(q, seededRandom(3))
    expect(q).toEqual(snapshot)
  })
})

describe('createGameRounds', () => {
  it('라운드 순서대로 4개 라운드, 라운드당 10문제를 만든다', () => {
    const rounds = createGameRounds(seededRandom(5))
    expect(rounds).toHaveLength(4)
    expect(rounds.map((r) => r[0].category)).toEqual([...CATEGORIES])
    expect(rounds.every((r) => r.length === 10)).toBe(true)
  })
})

describe('getRoundQuestions', () => {
  it('해당 카테고리 10문제를 중복 없이 반환한다', () => {
    for (const category of CATEGORIES) {
      const round = getRoundQuestions(category, seededRandom(7))
      expect(round).toHaveLength(10)
      expect(new Set(round.map((q) => q.id)).size).toBe(10)
      expect(round.every((q) => q.category === category)).toBe(true)
    }
  })

  it('문제 순서가 바뀌어도 정답 판정이 정확하다', () => {
    const originals = new Map(questionBank.map((q) => [q.id, q]))
    for (const category of CATEGORIES) {
      for (const q of getRoundQuestions(category, seededRandom(11))) {
        const original = originals.get(q.id)!
        expect(q.options[q.answerIndex], q.id).toBe(original.options[original.answerIndex])
      }
    }
  })
})
