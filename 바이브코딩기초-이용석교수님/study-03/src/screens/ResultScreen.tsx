// 총점·정답률·카테고리별 점수·소요시간·등급을 보여주고 새 게임을 시작하는 결과 화면 (F-07, F-09)
import type { GameState } from '../lib/gameReducer'
import { CATEGORIES, CATEGORY_LABELS } from '../lib/questions'
import {
  calcAccuracy,
  calcCategoryScores,
  calcDurationSec,
  calcTotalScore,
  countCorrect,
  formatDuration,
  getGrade,
} from '../lib/scoring'

interface ResultScreenProps {
  state: GameState
  onRestart: () => void
}

const MAX_SCORE = 400
const MAX_CATEGORY_SCORE = 100

export default function ResultScreen({ state, onRestart }: ResultScreenProps) {
  const totalQuestions = state.results.length
  const correct = countCorrect(state.results)
  const score = calcTotalScore(state.results)
  const categoryScores = calcCategoryScores(state.results)
  const durationSec =
    state.startedAt !== null && state.finishedAt !== null
      ? calcDurationSec(state.startedAt, state.finishedAt)
      : 0

  return (
    <section className="screen result">
      <p className="eyebrow">게임 끝</p>
      <h1 className="title">{getGrade(score)}</h1>
      <p className="big-score">
        {score}
        <span className="big-score-unit">/{MAX_SCORE}점</span>
      </p>

      <dl className="stats">
        <div>
          <dt>정답률</dt>
          <dd>{calcAccuracy(correct, totalQuestions)}%</dd>
        </div>
        <div>
          <dt>정답 수</dt>
          <dd>
            {correct}/{totalQuestions}
          </dd>
        </div>
        <div>
          <dt>소요시간</dt>
          <dd>{formatDuration(durationSec)}</dd>
        </div>
      </dl>

      <h2 className="section-title">분야별 점수</h2>
      <ul className="category-scores">
        {CATEGORIES.map((category) => (
          <li key={category}>
            <span className="category-name">{CATEGORY_LABELS[category]}</span>
            <span
              className="category-bar"
              role="img"
              aria-label={`${CATEGORY_LABELS[category]} ${categoryScores[category]}점`}
            >
              <span
                className="category-bar-fill"
                style={{ width: `${(categoryScores[category] / MAX_CATEGORY_SCORE) * 100}%` }}
              />
            </span>
            <span className="category-score">{categoryScores[category]}점</span>
          </li>
        ))}
      </ul>

      <button className="btn btn-primary" type="button" onClick={onRestart}>
        다시 하기
      </button>
    </section>
  )
}
