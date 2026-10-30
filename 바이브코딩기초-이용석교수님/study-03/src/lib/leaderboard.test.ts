// 순위 정렬·동점 처리·50건 제한·닉네임 검사·저장소 입출력 테스트
import { describe, expect, it } from 'vitest'
import {
  LEADERBOARD_KEY,
  MAX_ENTRIES,
  addEntry,
  buildEntry,
  getRank,
  loadLeaderboard,
  saveLeaderboard,
  sortEntries,
  validateNickname,
  type LeaderboardEntry,
} from './leaderboard'
import type { AnswerResult } from './scoring'

function entry(
  score: number,
  durationSec: number,
  playedAt: string,
  nickname = '손님',
): LeaderboardEntry {
  return {
    nickname,
    score,
    correctCount: score / 10,
    categoryScores: { history: 0, science: 0, geography: 0, general: 0 },
    durationSec,
    playedAt,
  }
}

// 시각이 서로 다른 기록을 만든다 (분 단위로 증가)
function at(minute: number): string {
  return new Date(Date.UTC(2026, 9, 30, 12, minute)).toISOString()
}

function fakeStorage(initial?: string) {
  const data = new Map<string, string>()
  if (initial !== undefined) data.set(LEADERBOARD_KEY, initial)
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  }
}

describe('닉네임 검사', () => {
  it('빈 값과 공백만 있는 값은 거절한다', () => {
    expect(validateNickname('').ok).toBe(false)
    expect(validateNickname('     ').ok).toBe(false)
    expect(validateNickname('\t \n').ok).toBe(false)
  })

  it('2자 미만, 10자 초과는 거절한다', () => {
    expect(validateNickname('가').ok).toBe(false)
    expect(validateNickname('가나다라마바사아자차카').ok).toBe(false)
  })

  it('2자와 10자는 통과한다', () => {
    expect(validateNickname('가나')).toEqual({ ok: true, nickname: '가나' })
    expect(validateNickname('가나다라마바사아자차').ok).toBe(true)
  })

  it('앞뒤 공백은 지우고 저장한다', () => {
    expect(validateNickname('  세종대왕  ')).toEqual({ ok: true, nickname: '세종대왕' })
  })

  it('공백을 지운 뒤 길이로 검사한다', () => {
    expect(validateNickname(' 가 ').ok).toBe(false)
  })

  it('이모지는 한 글자로 센다', () => {
    expect(validateNickname('😀😀😀😀😀😀😀😀😀😀').ok).toBe(true)
    expect(validateNickname('😀😀😀😀😀😀😀😀😀😀😀').ok).toBe(false)
  })
})

describe('순위 정렬', () => {
  it('총점이 높은 순으로 정렬한다', () => {
    const sorted = sortEntries([entry(100, 300, at(1)), entry(300, 300, at(2)), entry(200, 300, at(3))])
    expect(sorted.map((e) => e.score)).toEqual([300, 200, 100])
  })

  it('동점이면 소요시간이 짧은 순으로 정렬한다', () => {
    const sorted = sortEntries([
      entry(200, 500, at(1), '느림'),
      entry(200, 300, at(2), '빠름'),
      entry(200, 400, at(3), '중간'),
    ])
    expect(sorted.map((e) => e.nickname)).toEqual(['빠름', '중간', '느림'])
  })

  it('총점과 소요시간이 같으면 먼저 기록한 순으로 정렬한다', () => {
    const sorted = sortEntries([
      entry(200, 300, at(5), '나중'),
      entry(200, 300, at(1), '먼저'),
    ])
    expect(sorted.map((e) => e.nickname)).toEqual(['먼저', '나중'])
  })

  it('원본 배열을 바꾸지 않는다', () => {
    const original = [entry(100, 1, at(1)), entry(200, 1, at(2))]
    sortEntries(original)
    expect(original.map((e) => e.score)).toEqual([100, 200])
  })
})

describe('기록 추가와 50건 제한', () => {
  function fullBoard() {
    // 점수 10~400을 반복해 정확히 50건을 만든다
    return Array.from({ length: MAX_ENTRIES }, (_, i) =>
      entry(((i % 40) + 1) * 10, 300, at(i), `기록${i}`),
    )
  }

  it('50건을 넘으면 순위가 가장 낮은 기록부터 지운다', () => {
    const board = sortEntries(fullBoard())
    const lowest = board[board.length - 1]
    const added = entry(250, 300, at(59), '새기록')
    const result = addEntry(board, added)
    expect(result).toHaveLength(MAX_ENTRIES)
    expect(result).toContain(added)
    expect(result).not.toContain(lowest)
  })

  it('가장 낮은 점수로 51번째가 들어오면 그 기록이 밀려난다', () => {
    const board = sortEntries(fullBoard())
    const worst = entry(0, 999, at(59), '꼴찌')
    const result = addEntry(board, worst)
    expect(result).toHaveLength(MAX_ENTRIES)
    expect(getRank(result, worst.playedAt)).toBeNull()
  })

  it('50건 미만이면 아무것도 지우지 않는다', () => {
    const result = addEntry([entry(100, 1, at(1))], entry(50, 1, at(2)))
    expect(result).toHaveLength(2)
  })
})

describe('내 순위', () => {
  it('정렬된 목록에서 1부터 시작하는 순위를 돌려준다', () => {
    const mine = entry(200, 300, at(2))
    const sorted = sortEntries([entry(300, 300, at(1)), mine, entry(100, 300, at(3))])
    expect(getRank(sorted, mine.playedAt)).toBe(2)
  })

  it('Top 10 밖의 순위도 계산한다', () => {
    const mine = entry(10, 300, at(30))
    const others = Array.from({ length: 14 }, (_, i) => entry(100 + i * 10, 300, at(i)))
    expect(getRank(sortEntries([...others, mine]), mine.playedAt)).toBe(15)
  })

  it('목록에 없으면 null이다', () => {
    expect(getRank([entry(100, 1, at(1))], at(9))).toBeNull()
  })
})

describe('기록 만들기', () => {
  it('결과에서 총점·정답 수·분야별 점수·시각을 채운다', () => {
    const results: AnswerResult[] = [
      { questionId: 'a', category: 'history', selectedIndex: 0, correct: true },
      { questionId: 'b', category: 'history', selectedIndex: 0, correct: false },
      { questionId: 'c', category: 'science', selectedIndex: 0, correct: true },
    ]
    const built = buildEntry({
      nickname: '세종',
      results,
      durationSec: 123,
      now: new Date('2026-10-30T12:00:00.000Z'),
    })
    expect(built).toEqual({
      nickname: '세종',
      score: 20,
      correctCount: 2,
      categoryScores: { history: 10, science: 10, geography: 0, general: 0 },
      durationSec: 123,
      playedAt: '2026-10-30T12:00:00.000Z',
    })
  })
})

describe('저장소 입출력', () => {
  it('저장한 순위를 다시 읽을 수 있다 (새로고침 후에도 유지)', () => {
    const storage = fakeStorage()
    const board = sortEntries([entry(300, 200, at(1), '가나'), entry(100, 100, at(2), '다라')])
    expect(saveLeaderboard(board, storage)).toBe(true)
    expect(loadLeaderboard(storage)).toEqual(board)
  })

  it('저장 키는 quiz_leaderboard다', () => {
    const storage = fakeStorage()
    saveLeaderboard([entry(100, 1, at(1))], storage)
    expect(storage.getItem('quiz_leaderboard')).not.toBeNull()
  })

  it('저장된 값이 없으면 빈 목록이다', () => {
    expect(loadLeaderboard(fakeStorage())).toEqual([])
  })

  it('JSON이 깨져 있으면 빈 목록으로 시작한다', () => {
    expect(loadLeaderboard(fakeStorage('{깨진 값'))).toEqual([])
  })

  it('배열이 아니면 빈 목록이다', () => {
    expect(loadLeaderboard(fakeStorage('{"a":1}'))).toEqual([])
  })

  it('모양이 맞지 않는 항목은 걸러낸다', () => {
    const good = entry(100, 1, at(1))
    const raw = JSON.stringify([good, { nickname: 1 }, null, 'x', { ...good, score: 'high' }])
    expect(loadLeaderboard(fakeStorage(raw))).toEqual([good])
  })

  it('읽을 때 정렬하고 50건으로 자른다', () => {
    const many = Array.from({ length: 60 }, (_, i) => entry(i * 5, 300, at(i)))
    const loaded = loadLeaderboard(fakeStorage(JSON.stringify(many)))
    expect(loaded).toHaveLength(MAX_ENTRIES)
    expect(loaded[0].score).toBe(295)
  })

  it('저장소를 쓸 수 없으면 읽기는 빈 목록, 쓰기는 false다', () => {
    expect(loadLeaderboard(null)).toEqual([])
    expect(saveLeaderboard([entry(100, 1, at(1))], null)).toBe(false)
  })

  it('저장소가 예외를 던져도 게임이 멈추지 않는다', () => {
    const broken = {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    }
    expect(loadLeaderboard(broken)).toEqual([])
    expect(saveLeaderboard([entry(100, 1, at(1))], broken)).toBe(false)
  })
})
