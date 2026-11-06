// 선생님 모드 결과 파일 생성·검사·집계·CSV 함수 테스트
import { describe, expect, it } from 'vitest'
import type { Category, Question } from './questions'
import type { AnswerResult } from './scoring'
import {
  buildStudentResult,
  mergeResults,
  parseResultText,
  questionStats,
  rankResults,
  resultFileName,
  summarizeClass,
  toCSV,
  type StudentResult,
} from './teacher'

function answer(questionId: string, category: Category, correct: boolean): AnswerResult {
  return { questionId, category, selectedIndex: 0, correct }
}

const sampleAnswers: AnswerResult[] = [
  answer('HIS-001', 'history', true),
  answer('HIS-002', 'history', false),
  answer('SCI-001', 'science', true),
  answer('GEO-001', 'geography', true),
  answer('GEN-001', 'general', false),
]

function student(name: string, correctIds: string[], durationSec: number, playedAt: string): StudentResult {
  return buildStudentResult({
    name,
    results: sampleAnswers.map((a) => ({ ...a, correct: correctIds.includes(a.questionId) })),
    durationSec,
    now: new Date(playedAt),
  })
}

describe('buildStudentResult', () => {
  it('점수, 정답 수, 분야별 점수, 문항별 정답 여부를 담는다', () => {
    const r = buildStudentResult({
      name: '김민수',
      results: sampleAnswers,
      durationSec: 300,
      now: new Date('2026-11-06T01:00:00.000Z'),
    })
    expect(r).toMatchObject({
      format: 'quiz-result',
      version: 1,
      name: '김민수',
      playedAt: '2026-11-06T01:00:00.000Z',
      durationSec: 300,
      score: 30,
      correctCount: 3,
      totalQuestions: 5,
      categoryScores: { history: 10, science: 10, geography: 10, general: 0 },
    })
    expect(r.answers).toEqual([
      { questionId: 'HIS-001', category: 'history', correct: true },
      { questionId: 'HIS-002', category: 'history', correct: false },
      { questionId: 'SCI-001', category: 'science', correct: true },
      { questionId: 'GEO-001', category: 'geography', correct: true },
      { questionId: 'GEN-001', category: 'general', correct: false },
    ])
  })
})

describe('resultFileName', () => {
  it('이름과 기록 시각으로 파일 이름을 만들고 파일 이름에 못 쓰는 문자는 바꾼다', () => {
    const r = student('a/b:c', [], 10, '2026-11-06T01:02:00.000Z')
    expect(resultFileName(r)).toMatch(/^quiz-result-a_b_c-\d{8}-\d{4}\.json$/)
  })
})

describe('parseResultText', () => {
  const valid = student('김민수', ['HIS-001'], 100, '2026-11-06T01:00:00.000Z')

  it('객체 하나와 배열을 모두 읽는다', () => {
    expect(parseResultText(JSON.stringify(valid), 'a.json').results).toHaveLength(1)
    expect(parseResultText(JSON.stringify([valid, valid]), 'b.json').results).toHaveLength(2)
  })

  it('JSON이 아니면 오류를 돌려준다', () => {
    const parsed = parseResultText('not json', 'bad.json')
    expect(parsed.results).toEqual([])
    expect(parsed.errors[0]).toContain('bad.json')
  })

  it('형식이 다르거나 점수가 답과 맞지 않는 기록은 뺀다', () => {
    const wrongFormat = { ...valid, format: 'other' }
    const tampered = { ...valid, score: 400 }
    const badCategory = { ...valid, categoryScores: { ...valid.categoryScores, history: 50 } }
    const parsed = parseResultText(JSON.stringify([wrongFormat, tampered, badCategory, valid]), 'c.json')
    expect(parsed.results).toHaveLength(1)
    expect(parsed.errors).toHaveLength(3)
  })
})

describe('mergeResults', () => {
  it('이름과 기록 시각이 같은 기록은 한 번만 넣고 중복 수를 센다', () => {
    const a = student('김민수', ['HIS-001'], 100, '2026-11-06T01:00:00.000Z')
    const b = student('이지아', [], 100, '2026-11-06T02:00:00.000Z')
    const merged = mergeResults([a], [a, b])
    expect(merged.results).toHaveLength(2)
    expect(merged.duplicates).toBe(1)
  })
})

describe('rankResults', () => {
  it('총점 내림차순, 같으면 소요시간 오름차순, 그다음 기록 시각 오름차순이다', () => {
    const slow = student('느림', ['HIS-001', 'SCI-001'], 300, '2026-11-06T01:00:00.000Z')
    const fast = student('빠름', ['HIS-001', 'SCI-001'], 200, '2026-11-06T03:00:00.000Z')
    const top = student('최고', ['HIS-001', 'SCI-001', 'GEO-001'], 500, '2026-11-06T05:00:00.000Z')
    const early = student('먼저', ['HIS-001', 'SCI-001'], 200, '2026-11-06T02:00:00.000Z')
    expect(rankResults([slow, fast, top, early]).map((r) => r.name)).toEqual(['최고', '먼저', '빠름', '느림'])
  })
})

describe('summarizeClass', () => {
  it('학생 수, 기록 수, 평균·최고·최저, 분야별 평균을 계산한다', () => {
    const results = [
      student('김민수', ['HIS-001', 'SCI-001'], 100, '2026-11-06T01:00:00.000Z'),
      student('김민수', ['HIS-001'], 200, '2026-11-06T02:00:00.000Z'),
      student('이지아', ['HIS-001', 'SCI-001', 'GEO-001', 'GEN-001'], 300, '2026-11-06T03:00:00.000Z'),
    ]
    const s = summarizeClass(results)
    expect(s.studentCount).toBe(2)
    expect(s.recordCount).toBe(3)
    expect(s.averageScore).toBe(23.3)
    expect(s.maxScore).toBe(40)
    expect(s.minScore).toBe(10)
    expect(s.averageDurationSec).toBe(200)
    expect(s.categoryAverages).toEqual({ history: 10, science: 6.7, geography: 3.3, general: 3.3 })
  })

  it('기록이 없으면 0으로 채운다', () => {
    const s = summarizeClass([])
    expect(s.recordCount).toBe(0)
    expect(s.averageScore).toBe(0)
    expect(s.categoryAverages).toEqual({ history: 0, science: 0, geography: 0, general: 0 })
  })
})

describe('questionStats', () => {
  const bank = [
    { id: 'HIS-001', category: 'history', question: '문제 1' },
    { id: 'HIS-002', category: 'history', question: '문제 2' },
    { id: 'SCI-001', category: 'science', question: '문제 3' },
  ] as Question[]

  it('문항별 시도·정답 수와 정답률을 정답률 낮은 순으로 돌려주고 문제 은행에 없는 id도 표시한다', () => {
    const results = [
      student('a', ['HIS-001', 'SCI-001'], 100, '2026-11-06T01:00:00.000Z'),
      student('b', ['HIS-001'], 100, '2026-11-06T02:00:00.000Z'),
    ]
    const stats = questionStats(results, bank)
    // 정답률이 같으면 시도 수 내림차순, 그다음 id 오름차순
    expect(stats.map((s) => s.questionId)).toEqual(['GEN-001', 'GEO-001', 'HIS-002', 'SCI-001', 'HIS-001'])
    expect(stats[1]).toMatchObject({ questionId: 'GEO-001', attempts: 2, correct: 0, rate: 0, question: null })
    const his2 = stats.find((s) => s.questionId === 'HIS-002')
    expect(his2).toMatchObject({ attempts: 2, correct: 0, rate: 0, question: '문제 2' })
    expect(stats.find((s) => s.questionId === 'SCI-001')).toMatchObject({ attempts: 2, correct: 1, rate: 50 })
    expect(stats.at(-1)).toMatchObject({ questionId: 'HIS-001', rate: 100 })
  })
})

describe('toCSV', () => {
  it('BOM과 머리글로 시작하고 순위 순서로 행을 쓴다', () => {
    const csv = toCSV([
      student('하위', [], 100, '2026-11-06T01:00:00.000Z'),
      student('상위', ['HIS-001'], 100, '2026-11-06T02:00:00.000Z'),
    ])
    expect(csv.startsWith('﻿순위,이름,총점,')).toBe(true)
    const lines = csv.trim().split('\r\n')
    expect(lines).toHaveLength(3)
    expect(lines[1]).toMatch(/^1,상위,10,/)
  })

  it('쉼표·따옴표는 감싸고 수식으로 읽힐 수 있는 이름은 앞에 작은따옴표를 붙인다', () => {
    const csv = toCSV([
      student('a,"b"', [], 100, '2026-11-06T01:00:00.000Z'),
      student('=1+1', [], 200, '2026-11-06T02:00:00.000Z'),
    ])
    expect(csv).toContain('"a,""b"""')
    expect(csv).toContain(",'=1+1,")
  })
})
