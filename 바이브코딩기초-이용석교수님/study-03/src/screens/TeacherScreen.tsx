// 학생 결과 파일을 불러와 반 요약·학생별 성적·문항별 정답률을 보여주고 CSV로 내보내는 선생님 모드 화면
import { useState, type ChangeEvent, type Dispatch } from 'react'
import { downloadText } from '../lib/download'
import type { GameAction } from '../lib/gameReducer'
import { CATEGORIES, CATEGORY_LABELS, questionBank } from '../lib/questions'
import { calcAccuracy, formatDuration, getGrade } from '../lib/scoring'
import {
  mergeResults,
  parseResultText,
  questionStats,
  rankResults,
  summarizeClass,
  toCSV,
  type StudentResult,
} from '../lib/teacher'

interface TeacherScreenProps {
  dispatch: Dispatch<GameAction>
}

const MAX_CATEGORY_SCORE = 100

function csvFileName(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `quiz-class-report-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.csv`
}

export default function TeacherScreen({ dispatch }: TeacherScreenProps) {
  const [results, setResults] = useState<StudentResult[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [errors, setErrors] = useState<string[]>([])

  const ranked = rankResults(results)
  const summary = summarizeClass(results)
  const stats = questionStats(results, questionBank)

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = '' // 같은 파일을 다시 골라도 change가 일어나도록 비운다
    if (files.length === 0) return

    const loaded: StudentResult[] = []
    const newErrors: string[] = []
    for (const file of files) {
      try {
        const parsed = parseResultText(await file.text(), file.name)
        loaded.push(...parsed.results)
        newErrors.push(...parsed.errors)
      } catch {
        newErrors.push(`${file.name}: 파일을 읽지 못했어요.`)
      }
    }
    const merged = mergeResults(results, loaded)
    setResults(merged.results)
    setErrors(newErrors)
    const added = loaded.length - merged.duplicates
    setMessage(
      `파일 ${files.length}개에서 기록 ${added}건을 불러왔어요.` +
        (merged.duplicates > 0 ? ` 이미 있는 기록 ${merged.duplicates}건은 건너뛰었어요.` : '') +
        (newErrors.length > 0 ? ` 읽지 못한 기록 ${newErrors.length}건이 있어요.` : ''),
    )
  }

  function handleExport() {
    const ok = downloadText(csvFileName(), toCSV(results), 'text/csv;charset=utf-8')
    setMessage(ok ? 'CSV 파일을 저장했어요. 엑셀에서 열 수 있어요.' : 'CSV 파일을 저장하지 못했어요.')
  }

  function handleClear() {
    setResults([])
    setErrors([])
    setMessage('불러온 기록을 모두 비웠어요.')
  }

  return (
    <section className="screen teacher">
      <p className="eyebrow">선생님 모드</p>
      <h1 className="title">반 성적 보기</h1>
      <p className="lead">
        학생들이 결과 화면에서 저장한 결과 파일(.json)을 불러오세요. 여러 파일을 한 번에 고를 수 있어요.
        불러온 기록은 이 화면에만 있고 저장되지 않아요.
      </p>

      <div className="teacher-load">
        <label className="btn btn-primary file-button">
          결과 파일 불러오기
          <input
            className="visually-hidden"
            type="file"
            accept=".json,application/json"
            multiple
            onChange={handleFiles}
          />
        </label>
        {message !== null && (
          <p className="registered" role="status">
            {message}
          </p>
        )}
        {errors.length > 0 && (
          <ul className="teacher-errors" role="alert">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        )}
      </div>

      {results.length === 0 ? (
        <p className="empty">아직 불러온 기록이 없어요.</p>
      ) : (
        <>
          <dl className="stats">
            <div>
              <dt>학생 / 기록</dt>
              <dd>
                {summary.studentCount}명 / {summary.recordCount}건
              </dd>
            </div>
            <div>
              <dt>평균 점수</dt>
              <dd>{summary.averageScore}점</dd>
            </div>
            <div>
              <dt>최고 / 최저</dt>
              <dd>
                {summary.maxScore} / {summary.minScore}
              </dd>
            </div>
          </dl>
          <p className="key-hint">평균 소요시간 {formatDuration(summary.averageDurationSec)}</p>

          <h2 className="section-title">분야별 평균 점수</h2>
          <ul className="category-scores">
            {CATEGORIES.map((category) => (
              <li key={category}>
                <span className="category-name">{CATEGORY_LABELS[category]}</span>
                <span
                  className="category-bar"
                  role="img"
                  aria-label={`${CATEGORY_LABELS[category]} 평균 ${summary.categoryAverages[category]}점`}
                >
                  <span
                    className="category-bar-fill"
                    style={{ width: `${(summary.categoryAverages[category] / MAX_CATEGORY_SCORE) * 100}%` }}
                  />
                </span>
                <span className="category-score">{summary.categoryAverages[category]}점</span>
              </li>
            ))}
          </ul>

          <h2 className="section-title">학생별 성적</h2>
          <div className="table-wrap" tabIndex={0} role="region" aria-label="학생별 성적 표">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">순위</th>
                  <th scope="col">이름</th>
                  <th scope="col">총점</th>
                  <th scope="col">정답률</th>
                  {CATEGORIES.map((category) => (
                    <th scope="col" key={category}>
                      {CATEGORY_LABELS[category]}
                    </th>
                  ))}
                  <th scope="col">소요시간</th>
                  <th scope="col">등급</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((r, index) => (
                  <tr key={`${r.name}|${r.playedAt}`}>
                    <td>{index + 1}</td>
                    <th scope="row">{r.name}</th>
                    <td>{r.score}</td>
                    <td>{calcAccuracy(r.correctCount, r.totalQuestions)}%</td>
                    {CATEGORIES.map((category) => (
                      <td key={category}>{r.categoryScores[category]}</td>
                    ))}
                    <td>{formatDuration(r.durationSec)}</td>
                    <td>{getGrade(r.score)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="section-title">문항별 정답률 (낮은 순)</h2>
          <div className="table-wrap" tabIndex={0} role="region" aria-label="문항별 정답률 표">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">문항</th>
                  <th scope="col">분야</th>
                  <th scope="col">문제</th>
                  <th scope="col">정답률</th>
                  <th scope="col">정답/시도</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => (
                  <tr key={s.questionId}>
                    <th scope="row">{s.questionId}</th>
                    <td>{CATEGORY_LABELS[s.category]}</td>
                    <td className="cell-question">{s.question ?? '(지금 문제 은행에 없는 문항)'}</td>
                    <td>{s.rate}%</td>
                    <td>
                      {s.correct}/{s.attempts}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="actions">
        <button
          className="btn btn-primary"
          type="button"
          onClick={handleExport}
          disabled={results.length === 0}
        >
          CSV 내보내기
        </button>
        <button
          className="btn btn-secondary"
          type="button"
          onClick={handleClear}
          disabled={results.length === 0}
        >
          비우기
        </button>
        <button
          className="btn btn-secondary"
          type="button"
          onClick={() => dispatch({ type: 'CLOSE_TEACHER' })}
        >
          돌아가기
        </button>
      </div>
    </section>
  )
}
