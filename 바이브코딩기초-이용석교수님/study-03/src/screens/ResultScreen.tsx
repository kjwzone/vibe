// 총점·정답률·분야별 점수·소요시간·등급을 보여주고 닉네임 등록과 새 게임을 처리하는 결과 화면 (F-07~F-09)
import { useState, type Dispatch, type FormEvent } from 'react'
import { downloadText } from '../lib/download'
import type { GameAction, GameState } from '../lib/gameReducer'
import {
  MAX_ENTRIES,
  NICKNAME_MAX,
  NICKNAME_MIN,
  getRank,
  isStorageAvailable,
  loadLeaderboard,
  submitEntry,
} from '../lib/leaderboard'
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
import { prepareResultExport } from '../lib/teacher'

interface ResultScreenProps {
  state: GameState
  dispatch: Dispatch<GameAction>
  onRestart: () => void
}

const MAX_SCORE = 400
const MAX_CATEGORY_SCORE = 100

export default function ResultScreen({ state, dispatch, onRestart }: ResultScreenProps) {
  const totalQuestions = state.results.length
  const correct = countCorrect(state.results)
  const score = calcTotalScore(state.results)
  const categoryScores = calcCategoryScores(state.results)
  const durationSec =
    state.startedAt !== null && state.finishedAt !== null
      ? calcDurationSec(state.startedAt, state.finishedAt)
      : 0

  const [storageOk] = useState(isStorageAvailable)
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [entries, setEntries] = useState(() => loadLeaderboard())
  const registered = state.registeredAt !== null

  // 선생님께 낼 결과 파일 (순위 등록과는 별개)
  const [studentName, setStudentName] = useState('')
  const [exportError, setExportError] = useState<string | null>(null)
  const [exportedFile, setExportedFile] = useState<string | null>(null)

  function handleExport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const prepared = prepareResultExport({ rawName: studentName, results: state.results, durationSec })
    if (!prepared.ok) {
      setExportError(prepared.message)
      return
    }
    if (!downloadText(prepared.fileName, prepared.text, 'application/json')) {
      setExportError('결과 파일을 저장하지 못했어요.')
      return
    }
    setExportError(null)
    setExportedFile(prepared.fileName)
  }
  const myRank = state.registeredAt === null ? null : getRank(entries, state.registeredAt)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (registered) return

    const submitted = submitEntry({
      rawNickname: nickname,
      results: state.results,
      durationSec,
    })
    if (!submitted.ok) {
      setError(submitted.message)
      return
    }
    setEntries(submitted.entries)
    setError(null)
    dispatch({ type: 'REGISTER', playedAt: submitted.entry.playedAt })
  }

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

      <div className="register">
        <h2 className="section-title">순위표에 이름 남기기</h2>
        {!storageOk ? (
          <p className="notice" role="status">
            이 브라우저에서는 기록을 저장할 수 없어요. 순위는 남지 않지만 다시 하기는 그대로 할 수 있어요.
          </p>
        ) : registered ? (
          <p className="registered" role="status">
            {myRank === null
              ? `등록했지만 저장 가능한 ${MAX_ENTRIES}건 안에 들지 못했어요.`
              : `등록 완료. 지금 ${myRank}위예요.`}
          </p>
        ) : (
          <form className="register-form" onSubmit={handleSubmit} noValidate>
            <label className="register-label" htmlFor="nickname">
              닉네임
            </label>
            <div className="register-row">
              <input
                id="nickname"
                className="input"
                type="text"
                value={nickname}
                autoComplete="off"
                aria-invalid={error !== null}
                aria-describedby={error !== null ? 'nickname-error' : 'nickname-hint'}
                onChange={(event) => {
                  setNickname(event.target.value)
                  setError(null)
                }}
              />
              <button className="btn btn-primary" type="submit">
                등록
              </button>
            </div>
            {error === null ? (
              <p className="key-hint" id="nickname-hint">
                {NICKNAME_MIN}~{NICKNAME_MAX}자로 입력해 주세요. 공백만으로는 만들 수 없어요.
              </p>
            ) : (
              <p className="field-error" id="nickname-error" role="alert">
                {error}
              </p>
            )}
          </form>
        )}
      </div>

      <div className="register">
        <h2 className="section-title">선생님께 결과 제출</h2>
        <form className="register-form" onSubmit={handleExport} noValidate>
          <label className="register-label" htmlFor="student-name">
            이름
          </label>
          <div className="register-row">
            <input
              id="student-name"
              className="input"
              type="text"
              value={studentName}
              autoComplete="off"
              aria-invalid={exportError !== null}
              aria-describedby={exportError !== null ? 'student-name-error' : 'student-name-hint'}
              onChange={(event) => {
                setStudentName(event.target.value)
                setExportError(null)
              }}
            />
            <button className="btn btn-secondary" type="submit">
              결과 파일 저장
            </button>
          </div>
          {exportError !== null ? (
            <p className="field-error" id="student-name-error" role="alert">
              {exportError}
            </p>
          ) : exportedFile !== null ? (
            <p className="registered" id="student-name-hint" role="status">
              {exportedFile} 파일을 저장했어요. 이 파일을 선생님께 보내 주세요.
            </p>
          ) : (
            <p className="key-hint" id="student-name-hint">
              문항별 정답 여부가 담긴 결과 파일(.json)을 저장해요. 이름은 {NICKNAME_MIN}~{NICKNAME_MAX}자예요.
            </p>
          )}
        </form>
      </div>

      <div className="actions">
        <button className="btn btn-primary" type="button" onClick={onRestart}>
          다시 하기
        </button>
        <button
          className="btn btn-secondary"
          type="button"
          onClick={() => dispatch({ type: 'OPEN_LEADERBOARD' })}
        >
          순위표 보기
        </button>
      </div>
    </section>
  )
}
