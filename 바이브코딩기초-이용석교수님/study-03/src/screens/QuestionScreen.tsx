// 문제 풀이와 정답·오답 피드백을 보여주는 화면, 키보드 1~4·Enter를 처리한다 (F-02~F-06)
import { useEffect, type Dispatch } from 'react'
import ProgressHeader from '../components/ProgressHeader'
import {
  getCurrentQuestion,
  getQuestionNumber,
  getTotalQuestions,
  isLastQuestionOfRound,
  isLastRound,
  type GameAction,
  type GameState,
} from '../lib/gameReducer'
import { calcTotalScore } from '../lib/scoring'

interface QuestionScreenProps {
  state: GameState
  dispatch: Dispatch<GameAction>
}

type OptionStatus = 'idle' | 'correct' | 'wrong' | 'dim'

export default function QuestionScreen({ state, dispatch }: QuestionScreenProps) {
  const question = getCurrentQuestion(state)
  const answered = state.phase === 'feedback'

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return

      if (state.phase === 'feedback' && event.key === 'Enter') {
        // 포커스된 [다음] 버튼이 키 반복으로 클릭되는 것도 함께 막는다
        event.preventDefault()
        if (!event.repeat) dispatch({ type: 'NEXT' })
        return
      }
      if (state.phase === 'playing' && !event.repeat && /^[1-4]$/.test(event.key)) {
        dispatch({ type: 'ANSWER', optionIndex: Number(event.key) - 1, now: Date.now() })
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [state.phase, dispatch])

  if (question === null) return null

  const selected = state.selectedIndex
  const isCorrect = answered && selected === question.answerIndex
  const lastOfRound = isLastQuestionOfRound(state)
  const nextLabel = !lastOfRound
    ? '다음 문제'
    : isLastRound(state)
      ? '결과 보기'
      : '라운드 결과 보기'

  function statusOf(index: number): OptionStatus {
    if (!answered) return 'idle'
    if (index === question!.answerIndex) return 'correct'
    if (index === selected) return 'wrong'
    return 'dim'
  }

  return (
    <section className="screen question">
      <ProgressHeader
        roundIndex={state.roundIndex}
        category={question.category}
        questionNumber={getQuestionNumber(state)}
        totalQuestions={getTotalQuestions(state)}
        score={calcTotalScore(state.results)}
        answeredCount={state.results.length}
        roundSizes={state.rounds.map((round) => round.length)}
      />

      <h2 className="question-text">{question.question}</h2>

      <ul className="options">
        {question.options.map((option, index) => {
          const status = statusOf(index)
          return (
            <li key={index}>
              <button
                type="button"
                className={`option option-${status}`}
                disabled={answered}
                onClick={() =>
                  dispatch({ type: 'ANSWER', optionIndex: index, now: Date.now() })
                }
              >
                <span
                  className={`bubble ${index === selected || status === 'correct' ? 'bubble-filled' : ''}`}
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <span className="option-text">{option}</span>
                {status === 'correct' && <span className="option-tag">O 정답</span>}
                {status === 'wrong' && <span className="option-tag">X 오답</span>}
              </button>
            </li>
          )
        })}
      </ul>

      <div className="feedback-region" role="status" aria-live="polite">
        {answered && (
          <div className={`feedback ${isCorrect ? 'feedback-correct' : 'feedback-wrong'}`}>
            <p className="feedback-title">
              {isCorrect
                ? 'O 정답이에요.'
                : `X 오답이에요. 정답은 ${question.answerIndex + 1}번 ${question.options[question.answerIndex]}이에요.`}
            </p>
            <p className="feedback-explanation">{question.explanation}</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => dispatch({ type: 'NEXT' })}
              autoFocus
            >
              {nextLabel}
            </button>
            <p className="key-hint">Enter 키로도 넘어갈 수 있어요.</p>
          </div>
        )}
      </div>
    </section>
  )
}
