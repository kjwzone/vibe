// 이 기기에 저장된 Top 10 순위표를 보여주고 내 기록을 강조하는 화면 (F-08)
import { useState, type Dispatch } from 'react'
import type { GameAction, ReturnPhase } from '../lib/gameReducer'
import {
  MAX_ENTRIES,
  TOP_N,
  getRank,
  isStorageAvailable,
  loadLeaderboard,
  type LeaderboardEntry,
} from '../lib/leaderboard'
import { formatDuration } from '../lib/scoring'

interface LeaderboardScreenProps {
  registeredAt: string | null
  returnTo: ReturnPhase
  dispatch: Dispatch<GameAction>
  onRestart: () => void
}

interface RankRowProps {
  rank: number
  entry: LeaderboardEntry
  mine: boolean
}

function RankRow({ rank, entry, mine }: RankRowProps) {
  return (
    <li className={`rank-row ${mine ? 'rank-row-mine' : ''}`} aria-current={mine ? 'true' : undefined}>
      <span className="rank-no">{rank}</span>
      <span className="rank-name">
        {entry.nickname}
        {mine && <span className="rank-tag">내 기록</span>}
      </span>
      <span className="rank-score">{entry.score}점</span>
      <span className="rank-time">{formatDuration(entry.durationSec)}</span>
    </li>
  )
}

export default function LeaderboardScreen({
  registeredAt,
  returnTo,
  dispatch,
  onRestart,
}: LeaderboardScreenProps) {
  const [storageOk] = useState(isStorageAvailable)
  const [entries] = useState(() => loadLeaderboard())

  const top = entries.slice(0, TOP_N)
  const myRank = registeredAt === null ? null : getRank(entries, registeredAt)
  const myEntry = myRank === null ? undefined : entries[myRank - 1]
  const mineOutsideTop = myRank !== null && myRank > TOP_N && myEntry !== undefined

  return (
    <section className="screen leaderboard">
      <h1 className="title">순위표</h1>
      <p className="lead">이 기기에 저장된 기록이에요. 총점이 같으면 더 빨리 푼 기록이 위에 있어요.</p>

      {!storageOk && (
        <p className="notice" role="status">
          이 브라우저에서는 기록을 저장할 수 없어요. 게임은 그대로 즐길 수 있지만 순위는 남지 않아요.
        </p>
      )}

      {registeredAt !== null && myRank === null && (
        <p className="notice" role="status">
          이번 기록은 저장 가능한 {MAX_ENTRIES}건 안에 들지 못해 순위표에 남지 않았어요.
        </p>
      )}

      {top.length === 0 ? (
        <p className="empty">아직 기록이 없어요. 한 판을 끝내고 첫 기록을 남겨 보세요.</p>
      ) : (
        <ol className="rank-list" aria-label={`상위 ${TOP_N}위 기록`}>
          {top.map((entry, index) => (
            <RankRow
              key={entry.playedAt}
              rank={index + 1}
              entry={entry}
              mine={entry.playedAt === registeredAt}
            />
          ))}
        </ol>
      )}

      {mineOutsideTop && (
        <div className="my-rank">
          <p className="my-rank-title">내 순위 {myRank}위</p>
          <ol className="rank-list" start={myRank}>
            <RankRow rank={myRank} entry={myEntry} mine />
          </ol>
        </div>
      )}

      <div className="actions">
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => dispatch({ type: 'CLOSE_LEADERBOARD' })}
          autoFocus
        >
          돌아가기
        </button>
        <button className="btn btn-secondary" type="button" onClick={onRestart}>
          {returnTo === 'result' ? '다시 하기' : '게임 시작'}
        </button>
      </div>
    </section>
  )
}
