// 라운드가 끝날 때 라운드 점수(x/10)와 다음 라운드를 안내하는 화면 (F-06)
import { useEffect, type Dispatch } from 'react'
import type { GameAction, GameState } from '../lib/gameReducer'
import { CATEGORY_LABELS } from '../lib/questions'
import { calcRoundCorrect, calcTotalScore } from '../lib/scoring'

interface RoundEndScreenProps {
  state: GameState
  dispatch: Dispatch<GameAction>
}

export default function RoundEndScreen({ state, dispatch }: RoundEndScreenProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Enter' || event.ctrlKey || event.metaKey || event.altKey) return
      // 포커스된 버튼이 키 반복으로 연속 클릭되는 것을 막는다
      event.preventDefault()
      if (!event.repeat) dispatch({ type: 'NEXT' })
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [dispatch])

  const round = state.rounds[state.roundIndex]
  const nextRound = state.rounds[state.roundIndex + 1]
  const category = round[0].category
  const correct = calcRoundCorrect(state.results, category)

  return (
    <section className="screen round-end">
      <p className="eyebrow">
        {state.roundIndex + 1}라운드 {CATEGORY_LABELS[category]} 끝
      </p>
      <p className="big-score">
        {correct}
        <span className="big-score-unit">/{round.length}</span>
      </p>
      <p className="lead">
        {round.length}문제 중 {correct}문제를 맞혔어요. 지금까지 모은 점수는{' '}
        {calcTotalScore(state.results)}점이에요.
      </p>
      <p className="next-round">
        다음은 {state.roundIndex + 2}라운드 {CATEGORY_LABELS[nextRound[0].category]} 문제예요.
      </p>
      <button
        className="btn btn-primary"
        type="button"
        onClick={() => dispatch({ type: 'NEXT' })}
        autoFocus
      >
        {state.roundIndex + 2}라운드 시작
      </button>
      <p className="key-hint">Enter 키로도 시작할 수 있어요.</p>
    </section>
  )
}
