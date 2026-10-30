// 게임 진행 단계와 점수 기록을 관리하는 reducer 및 상태 조회 함수
import type { Question } from './questions'
import type { AnswerResult } from './scoring'

export type Phase = 'start' | 'playing' | 'feedback' | 'roundEnd' | 'result'

export interface GameState {
  phase: Phase
  rounds: Question[][]
  roundIndex: number
  questionIndex: number
  selectedIndex: number | null
  results: AnswerResult[]
  startedAt: number | null
  finishedAt: number | null
}

export type GameAction =
  | { type: 'START'; rounds: Question[][]; now: number }
  | { type: 'ANSWER'; optionIndex: number; now: number }
  | { type: 'NEXT' }

export const initialState: GameState = {
  phase: 'start',
  rounds: [],
  roundIndex: 0,
  questionIndex: 0,
  selectedIndex: null,
  results: [],
  startedAt: null,
  finishedAt: null,
}

export function getCurrentQuestion(state: GameState): Question | null {
  return state.rounds[state.roundIndex]?.[state.questionIndex] ?? null
}

export function isLastQuestionOfRound(state: GameState): boolean {
  const round = state.rounds[state.roundIndex]
  return round !== undefined && state.questionIndex === round.length - 1
}

export function isLastRound(state: GameState): boolean {
  return state.roundIndex === state.rounds.length - 1
}

export function getTotalQuestions(state: GameState): number {
  return state.rounds.reduce((sum, round) => sum + round.length, 0)
}

// 전체 기준 현재 문제 번호 (1부터 시작)
export function getQuestionNumber(state: GameState): number {
  const before = state.rounds
    .slice(0, state.roundIndex)
    .reduce((sum, round) => sum + round.length, 0)
  return before + state.questionIndex + 1
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    // 새 게임, 이전 판의 모든 상태를 버리고 처음부터 시작한다
    case 'START':
      return {
        ...initialState,
        phase: 'playing',
        rounds: action.rounds,
        startedAt: action.now,
      }

    // 답 선택, 문제를 푸는 중일 때만 반영해서 연타해도 점수는 1회만 오른다
    case 'ANSWER': {
      const question = getCurrentQuestion(state)
      if (state.phase !== 'playing' || question === null) return state
      if (!Number.isInteger(action.optionIndex)) return state
      if (action.optionIndex < 0 || action.optionIndex >= question.options.length) {
        return state
      }

      const isFinal = isLastRound(state) && isLastQuestionOfRound(state)
      return {
        ...state,
        phase: 'feedback',
        selectedIndex: action.optionIndex,
        results: [
          ...state.results,
          {
            questionId: question.id,
            category: question.category,
            selectedIndex: action.optionIndex,
            correct: action.optionIndex === question.answerIndex,
          },
        ],
        finishedAt: isFinal ? action.now : state.finishedAt,
      }
    }

    // 다음 문제, 라운드 결과, 다음 라운드 시작, 최종 결과로 넘어간다
    case 'NEXT': {
      if (state.phase === 'feedback') {
        if (!isLastQuestionOfRound(state)) {
          return {
            ...state,
            phase: 'playing',
            questionIndex: state.questionIndex + 1,
            selectedIndex: null,
          }
        }
        return { ...state, phase: isLastRound(state) ? 'result' : 'roundEnd' }
      }
      if (state.phase === 'roundEnd') {
        return {
          ...state,
          phase: 'playing',
          roundIndex: state.roundIndex + 1,
          questionIndex: 0,
          selectedIndex: null,
        }
      }
      return state
    }
  }
}
