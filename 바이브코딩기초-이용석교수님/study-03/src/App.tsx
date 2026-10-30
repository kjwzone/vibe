// 앱 최상위 컴포넌트, 게임 상태(useReducer 하나)를 들고 단계별 화면을 고른다
import { useReducer } from 'react'
import { gameReducer, initialState } from './lib/gameReducer'
import { createGameRounds } from './lib/questions'
import QuestionScreen from './screens/QuestionScreen'
import ResultScreen from './screens/ResultScreen'
import RoundEndScreen from './screens/RoundEndScreen'
import StartScreen from './screens/StartScreen'

function App() {
  const [state, dispatch] = useReducer(gameReducer, initialState)

  function startGame() {
    dispatch({ type: 'START', rounds: createGameRounds(), now: Date.now() })
  }

  return (
    <main className="app">
      {state.phase === 'start' && <StartScreen onStart={startGame} />}
      {(state.phase === 'playing' || state.phase === 'feedback') && (
        <QuestionScreen state={state} dispatch={dispatch} />
      )}
      {state.phase === 'roundEnd' && <RoundEndScreen state={state} dispatch={dispatch} />}
      {state.phase === 'result' && <ResultScreen state={state} onRestart={startGame} />}
    </main>
  )
}

export default App
