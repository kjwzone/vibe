// 게임 reducer 테스트, 한 판 전체 시뮬레이션과 연타·초기화 동작을 확인한다
import { describe, expect, it } from 'vitest'
import {
  gameReducer,
  getCurrentQuestion,
  getQuestionNumber,
  getTotalQuestions,
  initialState,
  type GameAction,
  type GameState,
} from './gameReducer'
import { CATEGORIES, createGameRounds } from './questions'
import {
  calcCategoryScores,
  calcDurationSec,
  calcRoundCorrect,
  calcTotalScore,
  countCorrect,
} from './scoring'

function run(state: GameState, ...actions: GameAction[]): GameState {
  return actions.reduce(gameReducer, state)
}

function started(now = 0): GameState {
  return gameReducer(initialState, {
    type: 'START',
    rounds: createGameRounds(() => 0.42),
    now,
  })
}

// 현재 문제에서 정답(또는 일부러 오답)을 골라 피드백 상태로 만든다
function answer(state: GameState, correct: boolean, now = 0): GameState {
  const q = getCurrentQuestion(state)!
  const optionIndex = correct ? q.answerIndex : (q.answerIndex + 1) % 4
  return gameReducer(state, { type: 'ANSWER', optionIndex, now })
}

describe('START', () => {
  it('문제 풀이 단계로 시작하고 40문제가 준비된다', () => {
    const state = started(1000)
    expect(state.phase).toBe('playing')
    expect(getTotalQuestions(state)).toBe(40)
    expect(getQuestionNumber(state)).toBe(1)
    expect(state.startedAt).toBe(1000)
  })

  it('라운드 순서는 한국사, 과학, 지리, 일반상식이다', () => {
    const state = started()
    expect(state.rounds.map((r) => r[0].category)).toEqual([...CATEGORIES])
  })
})

describe('ANSWER', () => {
  it('정답이면 점수가 오르고 피드백 단계로 간다', () => {
    const state = answer(started(), true)
    expect(state.phase).toBe('feedback')
    expect(state.results).toHaveLength(1)
    expect(calcTotalScore(state.results)).toBe(10)
  })

  it('오답이면 점수가 오르지 않는다', () => {
    const state = answer(started(), false)
    expect(state.phase).toBe('feedback')
    expect(calcTotalScore(state.results)).toBe(0)
  })

  it('연타해도 점수는 1회만 반영된다', () => {
    const q = getCurrentQuestion(started())!
    const click: GameAction = { type: 'ANSWER', optionIndex: q.answerIndex, now: 0 }
    const state = run(started(), click, click, click, click)
    expect(state.results).toHaveLength(1)
    expect(calcTotalScore(state.results)).toBe(10)
  })

  it('다른 보기를 이어서 눌러도 처음 선택이 유지된다', () => {
    const q = getCurrentQuestion(started())!
    const first = q.answerIndex
    const other = (first + 1) % 4
    const state = run(
      started(),
      { type: 'ANSWER', optionIndex: first, now: 0 },
      { type: 'ANSWER', optionIndex: other, now: 0 },
    )
    expect(state.selectedIndex).toBe(first)
    expect(state.results).toHaveLength(1)
  })

  it('범위를 벗어난 보기 번호는 무시한다', () => {
    const state = started()
    expect(gameReducer(state, { type: 'ANSWER', optionIndex: 4, now: 0 })).toBe(state)
    expect(gameReducer(state, { type: 'ANSWER', optionIndex: -1, now: 0 })).toBe(state)
  })

  it('시작 화면에서는 답을 받지 않는다', () => {
    const state = gameReducer(initialState, { type: 'ANSWER', optionIndex: 0, now: 0 })
    expect(state).toBe(initialState)
  })
})

describe('NEXT', () => {
  it('피드백 후 다음 문제로 이동하고 선택이 초기화된다', () => {
    const state = run(answer(started(), true), { type: 'NEXT' })
    expect(state.phase).toBe('playing')
    expect(getQuestionNumber(state)).toBe(2)
    expect(state.selectedIndex).toBeNull()
  })

  it('문제를 풀기 전에는 다음으로 넘어가지 못한다', () => {
    const state = started()
    expect(gameReducer(state, { type: 'NEXT' })).toBe(state)
  })

  it('10문제를 풀면 라운드 결과 화면으로 가고 다시 NEXT로 다음 라운드를 시작한다', () => {
    let state = started()
    for (let i = 0; i < 10; i++) {
      state = run(answer(state, true), { type: 'NEXT' })
    }
    expect(state.phase).toBe('roundEnd')
    expect(calcRoundCorrect(state.results, 'history')).toBe(10)

    state = gameReducer(state, { type: 'NEXT' })
    expect(state.phase).toBe('playing')
    expect(state.roundIndex).toBe(1)
    expect(getQuestionNumber(state)).toBe(11)
    expect(getCurrentQuestion(state)!.category).toBe('science')
  })
})

describe('한 판 완주', () => {
  // 정답·오답을 섞어 40문제를 모두 풀고 결과 단계까지 간다
  function playFullGame(isCorrect: (i: number) => boolean): GameState {
    let state = started(1000)
    for (let i = 0; i < 40; i++) {
      state = answer(state, isCorrect(i), 1000 + (i + 1) * 15_000)
      state = gameReducer(state, { type: 'NEXT' })
      if (state.phase === 'roundEnd') state = gameReducer(state, { type: 'NEXT' })
    }
    return state
  }

  it('40문제를 풀면 결과 단계가 되고 기록이 40건이다', () => {
    const state = playFullGame((i) => i % 3 !== 0)
    expect(state.phase).toBe('result')
    expect(state.results).toHaveLength(40)
  })

  it('카테고리별 점수의 합은 총점과 같다', () => {
    const state = playFullGame((i) => i % 3 !== 0)
    const scores = calcCategoryScores(state.results)
    const sum = Object.values(scores).reduce((a, b) => a + b, 0)
    expect(sum).toBe(calcTotalScore(state.results))
    expect(calcTotalScore(state.results)).toBe(countCorrect(state.results) * 10)
  })

  it('전부 정답이면 400점, 전부 오답이면 0점이다', () => {
    expect(calcTotalScore(playFullGame(() => true).results)).toBe(400)
    expect(calcTotalScore(playFullGame(() => false).results)).toBe(0)
  })

  it('소요시간은 1번 문제 표시부터 40번 문제 답 선택까지다', () => {
    const state = playFullGame(() => true)
    // 시작 1000ms, 40번째 답 선택 1000 + 40 × 15,000ms → 600초
    expect(calcDurationSec(state.startedAt!, state.finishedAt!)).toBe(600)
  })

  it('마지막 문제 전에는 finishedAt이 비어 있다', () => {
    const state = answer(started(), true, 5000)
    expect(state.finishedAt).toBeNull()
  })
})

describe('다시 하기', () => {
  it('START로 점수·진행·시간이 모두 초기화된다', () => {
    const played = answer(started(100), true, 200)
    const restarted = gameReducer(played, {
      type: 'START',
      rounds: createGameRounds(() => 0.1),
      now: 9000,
    })
    expect(restarted.phase).toBe('playing')
    expect(restarted.results).toEqual([])
    expect(restarted.roundIndex).toBe(0)
    expect(restarted.questionIndex).toBe(0)
    expect(restarted.selectedIndex).toBeNull()
    expect(restarted.startedAt).toBe(9000)
    expect(restarted.finishedAt).toBeNull()
  })
})

describe('순위표 열기·닫기·등록', () => {
  function finished(): GameState {
    let state = started(0)
    for (let i = 0; i < 40; i++) {
      state = gameReducer(answer(state, true, (i + 1) * 1000), { type: 'NEXT' })
      if (state.phase === 'roundEnd') state = gameReducer(state, { type: 'NEXT' })
    }
    return state
  }

  it('시작 화면에서 열고 닫으면 시작 화면으로 돌아온다', () => {
    const open = gameReducer(initialState, { type: 'OPEN_LEADERBOARD' })
    expect(open.phase).toBe('leaderboard')
    expect(gameReducer(open, { type: 'CLOSE_LEADERBOARD' }).phase).toBe('start')
  })

  it('결과 화면에서 열고 닫아도 결과와 등록 상태가 그대로다', () => {
    const result = gameReducer(finished(), { type: 'REGISTER', playedAt: 'T1' })
    expect(result.phase).toBe('result')
    const back = run(result, { type: 'OPEN_LEADERBOARD' }, { type: 'CLOSE_LEADERBOARD' })
    expect(back.phase).toBe('result')
    expect(back.results).toHaveLength(40)
    expect(back.registeredAt).toBe('T1')
  })

  it('문제를 푸는 중에는 순위표를 열 수 없다', () => {
    const state = started()
    expect(gameReducer(state, { type: 'OPEN_LEADERBOARD' })).toBe(state)
  })

  it('순위표가 열려 있지 않으면 닫기는 무시한다', () => {
    const state = started()
    expect(gameReducer(state, { type: 'CLOSE_LEADERBOARD' })).toBe(state)
  })

  it('등록은 결과 화면에서 한 번만 반영된다', () => {
    const once = gameReducer(finished(), { type: 'REGISTER', playedAt: 'T1' })
    const twice = gameReducer(once, { type: 'REGISTER', playedAt: 'T2' })
    expect(twice.registeredAt).toBe('T1')
  })

  it('결과 화면이 아니면 등록을 받지 않는다', () => {
    const state = started()
    expect(gameReducer(state, { type: 'REGISTER', playedAt: 'T1' })).toBe(state)
  })

  it('다시 하기를 하면 등록 상태가 초기화된다', () => {
    const registered = gameReducer(finished(), { type: 'REGISTER', playedAt: 'T1' })
    const restarted = gameReducer(registered, {
      type: 'START',
      rounds: createGameRounds(() => 0.3),
      now: 0,
    })
    expect(restarted.registeredAt).toBeNull()
  })
})
