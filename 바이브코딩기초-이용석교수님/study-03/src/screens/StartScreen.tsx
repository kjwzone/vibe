// 게임 소개와 규칙 요약을 보여주고 게임을 시작하는 시작 화면 (F-01)
interface StartScreenProps {
  onStart: () => void
}

export default function StartScreen({ onStart }: StartScreenProps) {
  return (
    <section className="screen start">
      <div className="omr-row" aria-hidden="true">
        <span className="bubble">1</span>
        <span className="bubble">2</span>
        <span className="bubble bubble-filled">3</span>
        <span className="bubble">4</span>
      </div>
      <h1 className="title">상식 퀴즈</h1>
      <p className="lead">
        한국사, 과학, 지리, 일반상식 40문제를 약 10분 안에 풀어 보세요.
      </p>
      <ul className="rules">
        <li>4개 라운드를 차례로 풀고, 라운드마다 10문제가 나와요.</li>
        <li>보기 4개 중 하나를 고르면 바로 확정되고, 정답과 해설을 보여줘요.</li>
        <li>한 문제를 맞히면 10점이고, 만점은 400점이에요.</li>
        <li>키보드 1~4번으로 보기를 고르고 Enter로 다음 문제로 넘어가요.</li>
      </ul>
      <button className="btn btn-primary" type="button" onClick={onStart} autoFocus>
        게임 시작
      </button>
    </section>
  )
}
