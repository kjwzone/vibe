// 순위 기록의 검증·정렬·순위 계산·localStorage 입출력 (PRD 7장)
import { CATEGORIES, type Category } from './questions'
import {
  calcCategoryScores,
  calcTotalScore,
  countCorrect,
  type AnswerResult,
} from './scoring'

export const LEADERBOARD_KEY = 'quiz_leaderboard'
export const MAX_ENTRIES = 50
export const TOP_N = 10
export const NICKNAME_MIN = 2
export const NICKNAME_MAX = 10

export interface LeaderboardEntry {
  nickname: string
  score: number
  correctCount: number
  categoryScores: Record<Category, number>
  durationSec: number
  playedAt: string
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

export type NicknameCheck =
  | { ok: true; nickname: string }
  | { ok: false; message: string }

// 앞뒤 공백을 지운 뒤 2~10자인지 검사한다 (이모지 등은 한 글자로 센다)
export function validateNickname(raw: string): NicknameCheck {
  const nickname = raw.trim()
  if (nickname.length === 0) {
    return { ok: false, message: '닉네임을 입력해 주세요. 공백만으로는 만들 수 없어요.' }
  }
  const length = [...nickname].length
  if (length < NICKNAME_MIN || length > NICKNAME_MAX) {
    return { ok: false, message: `닉네임은 ${NICKNAME_MIN}~${NICKNAME_MAX}자로 입력해 주세요.` }
  }
  return { ok: true, nickname }
}

// 총점 ↓ → 소요시간 ↑ → 기록 시각 ↑ (playedAt은 UTC ISO 문자열이라 문자열 비교로 충분하다)
export function compareEntries(a: LeaderboardEntry, b: LeaderboardEntry): number {
  if (a.score !== b.score) return b.score - a.score
  if (a.durationSec !== b.durationSec) return a.durationSec - b.durationSec
  if (a.playedAt === b.playedAt) return 0
  return a.playedAt < b.playedAt ? -1 : 1
}

export function sortEntries(entries: readonly LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries].sort(compareEntries)
}

// 새 기록을 넣고 정렬한 뒤 50건을 넘으면 순위가 가장 낮은 기록부터 지운다
export function addEntry(
  entries: readonly LeaderboardEntry[],
  entry: LeaderboardEntry,
): LeaderboardEntry[] {
  return sortEntries([...entries, entry]).slice(0, MAX_ENTRIES)
}

// 정렬된 목록에서 playedAt으로 찾은 기록의 순위(1부터), 목록에 없으면 null
export function getRank(
  sortedEntries: readonly LeaderboardEntry[],
  playedAt: string,
): number | null {
  const index = sortedEntries.findIndex((e) => e.playedAt === playedAt)
  return index === -1 ? null : index + 1
}

export function buildEntry(input: {
  nickname: string
  results: readonly AnswerResult[]
  durationSec: number
  now: Date
}): LeaderboardEntry {
  return {
    nickname: input.nickname,
    score: calcTotalScore(input.results),
    correctCount: countCorrect(input.results),
    categoryScores: calcCategoryScores(input.results),
    durationSec: input.durationSec,
    playedAt: input.now.toISOString(),
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

// 저장된 값이 깨졌을 때를 대비해 항목 모양을 검사한다
function isEntry(value: unknown): value is LeaderboardEntry {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  const scores = v.categoryScores as Record<string, unknown> | null | undefined
  return (
    typeof v.nickname === 'string' &&
    isFiniteNumber(v.score) &&
    isFiniteNumber(v.correctCount) &&
    isFiniteNumber(v.durationSec) &&
    typeof v.playedAt === 'string' &&
    typeof scores === 'object' &&
    scores !== null &&
    CATEGORIES.every((category) => isFiniteNumber(scores[category]))
  )
}

// 사생활 보호 모드 등에서는 localStorage 접근 자체가 예외를 던질 수 있다
export function getStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

// 실제로 쓸 수 있는지 확인한다 (접근은 되지만 쓰기가 막힌 환경도 있다)
export function isStorageAvailable(): boolean {
  const storage = getStorage()
  if (storage === null) return false
  try {
    const probe = `${LEADERBOARD_KEY}_probe`
    storage.setItem(probe, '1')
    storage.removeItem(probe)
    return true
  } catch {
    return false
  }
}

// 저장된 순위를 읽는다. 읽을 수 없거나 깨져 있으면 빈 목록으로 시작한다
export function loadLeaderboard(storage: StorageLike | null = getStorage()): LeaderboardEntry[] {
  if (storage === null) return []
  try {
    const raw = storage.getItem(LEADERBOARD_KEY)
    if (raw === null) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return sortEntries(parsed.filter(isEntry)).slice(0, MAX_ENTRIES)
  } catch {
    return []
  }
}

// 저장에 성공하면 true, 저장소를 못 쓰거나 용량이 가득 찼으면 false
export function saveLeaderboard(
  entries: readonly LeaderboardEntry[],
  storage: StorageLike | null = getStorage(),
): boolean {
  if (storage === null) return false
  try {
    storage.setItem(LEADERBOARD_KEY, JSON.stringify(entries))
    return true
  } catch {
    return false
  }
}
