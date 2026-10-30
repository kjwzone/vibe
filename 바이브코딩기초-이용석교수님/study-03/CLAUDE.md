# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

한국사·과학·지리·일반상식 4개 분야 40문제를 4지선다로 푸는 웹 퀴즈 게임이다. Vite + React + TypeScript로 만들고 테스트는 Vitest를 쓴다. 서버·DB 없는 정적 웹이다.

- `상식 퀴즈 게임 PRD.md`는 기준 문서다. 규칙, 기능 ID(F-01~F-15), 데이터 스키마가 모두 여기에 있다. 동작이 헷갈리면 PRD를 먼저 확인한다.
- `claude-code-3step-prompts.md`는 구현을 3단계(기반·데이터 → 게임 플레이 → 순위·마감)로 나눈 프롬프트다. 한 단계씩 실행하고 완료 기준을 확인한 뒤 다음으로 넘어간다. 이 문서는 PRD를 `PRD.md`라고 부르지만 실제 파일명은 `상식 퀴즈 게임 PRD.md`다.
- `checklist.md`는 단계별 진행 상황, `context-notes.md`는 결정과 그 이유다. 작업하면서 계속 갱신한다.
- 상위 폴더(`../`)의 `index.html`, `app.js`, `PRD.md`는 다른 실습인 할 일 관리 앱이다. 이 프로젝트와 무관하므로 건드리지 않는다.

## 명령어

```bash
npm install
npm run dev                          # 개발 서버
npm test                             # Vitest 전체 실행 (vitest run)
npx vitest run src/lib/questions.test.ts   # 파일 하나만 실행
npx vitest run -t "shuffleOptions"         # 테스트 이름으로 실행
npm run build                        # tsc -b 타입 검사 후 vite build
npm run lint                         # oxlint
```

## 진행 상태

1단계(프로젝트 뼈대, 문제 은행 40문제, 출제 함수, 검증 테스트)까지 끝났다. `src/screens`, `src/components`는 비어 있고 `App.tsx`는 빈 화면이다. 게임 화면은 2단계, 순위 기록은 3단계에서 만든다.

## 코드 구조

- `src/data/questions.json` 문제 은행 40문제. 스키마는 PRD 8장(`id, category, question, options, answerIndex, explanation, difficulty`).
- `src/lib/questions.ts` JSON을 `Question[]`로 타입 지정하고, 카테고리별 조회(`getQuestionsByCategory`)와 섞기(`shuffle`, `shuffleOptions`, `getRoundQuestions`)를 제공한다. 난수 함수를 인자로 받아 테스트에서 시드 고정 난수를 넣을 수 있다.
- `src/lib/questions.test.ts` 데이터 검증(40문제, 카테고리별 10문제, 난이도 4/4/2, id 중복, 보기 4개, 글자 수 제한)과 섞기 테스트를 함께 둔다. 문제를 추가·수정하면 이 테스트로 먼저 확인한다.

## 아키텍처 핵심 (PRD 기준)

- **게임 상태 머신** 단계는 `start → playing → feedback → roundEnd → result`이다. 라운드 10문제가 끝나면 `roundEnd`, 40문제가 끝나면 `result`로 간다. 프롬프트는 `useReducer` 하나로 관리하도록 정했다.
- **라운드 순서** 한국사 → 과학 → 지리 → 일반상식으로 고정이다. 섞는 것은 라운드 안의 문제 순서와 보기 순서뿐이다.
- **보기 섞기 주의** `answerIndex`는 원본 기준 위치다. 보기를 섞은 뒤에는 정답 위치를 다시 계산해야 하고, 이것이 F-02의 수용 기준이다.
- **순수 함수 분리** 점수, 정답률, 등급, 순위 정렬은 UI와 분리한 순수 함수로 두고 단위 테스트를 반드시 작성한다(PRD 9장). 프롬프트상 위치는 `src/lib/scoring.ts`, `src/lib/questions.ts`이다.
- **점수** 정답 10점, 오답 0점이며 400점 만점이다. 카테고리별 점수의 합은 항상 총점과 같아야 한다.
- **순위 저장** localStorage 키는 `quiz_leaderboard`이고 최대 50건을 보관하며 화면에는 Top 10을 보여준다. 정렬은 총점 내림차순 → 소요시간 오름차순 → 기록 시각 오름차순이다. 50건을 넘으면 순위가 가장 낮은 기록부터 지운다. localStorage 접근은 try/catch로 감싸고, 실패해도 게임은 계속 진행한다.
- **소요시간** 1번 문제 표시부터 40번 문제 답 선택까지이며 해설 읽는 시간을 포함한다.

## 지켜야 할 요구사항

- 정답 선택은 1회 확정이고, 연타해도 점수는 1번만 반영한다(F-04).
- 정답·오답은 색만으로 구분하지 않고 `O 정답`/`X 오답` 텍스트를 함께 쓴다. 명도 대비는 4.5:1 이상이다.
- 키보드 1~4로 보기를 선택하고 Enter로 다음 문제로 간다.
- 모바일 360px 폭에서 레이아웃이 깨지지 않아야 한다.
- 문제를 추가할 때는 PRD 8장 검수 체크리스트를 따른다. 정답은 하나뿐이어야 하고, '모두 정답' 보기는 금지하며, 시점에 따라 바뀌는 사실은 제외한다. 스키마는 `id, category, question, options[4], answerIndex, explanation, difficulty`이다.
- 1차 릴리스(MVP)는 P0인 F-01~F-09만 대상이다. 타이머, 오답 노트, 연습 모드, 효과음, 공유, 온라인 순위표(F-10~F-15)는 범위 밖이다.
