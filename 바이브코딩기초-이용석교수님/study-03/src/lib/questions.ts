// 문제 은행을 불러와 카테고리별로 고르고, 문제·보기 순서를 섞는 함수 모음
import rawQuestions from '../data/questions.json'

export type Category = 'history' | 'science' | 'geography' | 'general'
export type Difficulty = 'easy' | 'normal' | 'hard'

export interface Question {
  id: string
  category: Category
  question: string
  options: string[]
  answerIndex: number
  explanation: string
  difficulty: Difficulty
}

// 라운드 진행 순서 (PRD 4장)
export const CATEGORIES: readonly Category[] = [
  'history',
  'science',
  'geography',
  'general',
]

export const CATEGORY_LABELS: Record<Category, string> = {
  history: '한국사',
  science: '과학',
  geography: '지리',
  general: '일반상식',
}

export const questionBank = rawQuestions as Question[]

type Random = () => number

// Fisher-Yates 셔플, 원본은 바꾸지 않는다
export function shuffle<T>(items: readonly T[], random: Random = Math.random): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function getQuestionsByCategory(
  category: Category,
  bank: readonly Question[] = questionBank,
): Question[] {
  return bank.filter((q) => q.category === category)
}

// 보기 순서를 섞고 섞인 뒤의 정답 위치(answerIndex)를 다시 계산한다
export function shuffleOptions(question: Question, random: Random = Math.random): Question {
  const correctOption = question.options[question.answerIndex]
  const options = shuffle(question.options, random)
  return { ...question, options, answerIndex: options.indexOf(correctOption) }
}

// 한 라운드(카테고리)의 문제를 문제 순서와 보기 순서를 섞어 반환한다
export function getRoundQuestions(
  category: Category,
  random: Random = Math.random,
  bank: readonly Question[] = questionBank,
): Question[] {
  return shuffle(getQuestionsByCategory(category, bank), random).map((q) =>
    shuffleOptions(q, random),
  )
}
