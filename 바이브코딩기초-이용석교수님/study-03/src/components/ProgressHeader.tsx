// 라운드명, 문제 번호(n/40), 현재 점수, 라운드별 진행 바를 보여주는 상단 표시줄
import { CATEGORY_LABELS, type Category } from '../lib/questions'

interface ProgressHeaderProps {
  roundIndex: number
  category: Category
  questionNumber: number
  totalQuestions: number
  score: number
  answeredCount: number
  roundSizes: number[]
}

export default function ProgressHeader({
  roundIndex,
  category,
  questionNumber,
  totalQuestions,
  score,
  answeredCount,
  roundSizes,
}: ProgressHeaderProps) {
  const segments = roundSizes.map((size, i) => {
    const offset = roundSizes.slice(0, i).reduce((sum, s) => sum + s, 0)
    return Math.min(1, Math.max(0, (answeredCount - offset) / size))
  })

  return (
    <header className="progress">
      <div className="progress-info">
        <p className="progress-round">
          {roundIndex + 1}라운드 {CATEGORY_LABELS[category]}
        </p>
        <p className="progress-count">
          <strong>{questionNumber}</strong>/{totalQuestions}
        </p>
        <p className="progress-score">{score}점</p>
      </div>
      <div
        className="progress-bar"
        role="progressbar"
        aria-label="전체 진행도"
        aria-valuemin={0}
        aria-valuemax={totalQuestions}
        aria-valuenow={answeredCount}
      >
        {segments.map((fill, i) => (
          <span className="progress-segment" key={i}>
            <span className="progress-fill" style={{ width: `${fill * 100}%` }} />
          </span>
        ))}
      </div>
    </header>
  )
}
