---
name: quiz-leaderboard
description: 저장된 플레이 기록을 집계해 리더보드를 갱신
disable-model-invocation: true
argument-hint: [기록 JSON 경로 ...]
---

# 리더보드 집계·갱신

저장된 플레이 기록을 모아 게임과 같은 규칙으로 점수와 순위를 집계하고, 리더보드 파일을 갱신한다.

## 1. 실제 저장 방식 (먼저 확인)

매번 시작할 때 `src/lib/leaderboard.ts`를 읽어서 아래 내용이 그대로인지 확인한다. 달라졌으면 `aggregate.mjs`의 상수와 규칙을 먼저 맞추고, 그렇게 했다고 보고한다.

- 기록은 **브라우저 `localStorage`의 `quiz_leaderboard` 키**에 JSON 배열로만 저장된다. 서버, DB, 프로젝트 안의 파일에는 기록이 없다.
- 기록 하나의 모양: `{ nickname, score, correctCount, categoryScores: { history, science, geography, general }, durationSec, playedAt }`
- 정렬: 총점 내림차순 → 소요시간 오름차순 → 기록 시각(`playedAt`) 오름차순
- 최대 50건 보관(`MAX_ENTRIES`), 화면에는 Top 10(`TOP_N`)
- 저장소는 여는 주소마다 따로다. `http://localhost:5173`과 `dist/index.html`을 더블클릭해 연 `file://`은 기록이 서로 다르다.

Claude Code는 브라우저 저장소를 직접 읽을 수 없다. 사용자의 브라우저 프로필 폴더를 뒤지지 않는다.

## 2. 접근 가능한 기록 찾기

다음 순서로 찾고, 처음 찾은 방법을 쓴다.

1. **인수로 받은 파일**: $ARGUMENTS 에 JSON 파일 경로가 있으면 그 파일들을 읽는다.
2. **`leaderboard/` 폴더**: 인수가 없으면 프로젝트의 `leaderboard/*.json`을 모두 읽는다. 이전에 집계한 `leaderboard/leaderboard.json`도 포함되므로 기록이 누적된다.
3. **Claude in Chrome**: 위 두 곳에 기록이 없고 Chrome 확장 도구를 쓸 수 있으면, 사용자에게 먼저 묻고 승인을 받은 뒤 게임 탭에서 `localStorage.getItem('quiz_leaderboard')`를 읽는다. 읽은 값은 `leaderboard/export-<YYYYMMDD>-<localhost|file>.json`으로 저장한다.
4. **기록이 하나도 없으면** 집계하지 않는다. 아래 내보내기 방법을 안내하고 멈춘다.

```
1. 게임 페이지(localhost:5173 또는 dist/index.html)를 연다
2. F12 → Console 탭에서 실행:  copy(localStorage.getItem('quiz_leaderboard'))
3. study-03/leaderboard/export-20261106-localhost.json 파일을 만들고 붙여 넣어 저장
4. /quiz-leaderboard 다시 실행
```

## 3. 집계 실행

프로젝트 루트(`study-03`)에서 실행한다. 순위와 점수는 직접 계산하지 말고 스크립트 결과를 쓴다.

```bash
node .claude/skills/quiz-leaderboard/aggregate.mjs            # leaderboard/*.json 전체
node .claude/skills/quiz-leaderboard/aggregate.mjs a.json b.json   # 지정한 파일만
```

스크립트가 하는 일은 다음과 같다.
- 파일마다 JSON 배열을 읽는다. 따옴표로 감싼 문자열이면 한 번 더 파싱한다.
- `leaderboard.ts`의 `isEntry`와 같은 검사로 모양이 잘못된 기록을 뺀다.
- `playedAt`과 닉네임이 같은 기록은 하나로 합친다. 여러 번 내보낸 파일이나 두 주소의 기록을 합쳐도 중복되지 않는다.
- 게임과 같은 규칙으로 정렬하고 50건까지만 남긴다.
- 등급과 소요시간 표시는 `scoring.ts`의 `getGrade`, `formatDuration`과 같다.

## 4. 갱신되는 파일

모두 `leaderboard/` 폴더에 쓴다. 이 폴더는 플레이어 닉네임이 들어 있으므로 `.gitignore`에 들어 있어 커밋되지 않는다.

| 파일 | 내용 |
| --- | --- |
| `leaderboard/leaderboard.json` | 합치고 정렬한 기록(최대 50건). 다음 집계의 입력이 된다 |
| `leaderboard/LEADERBOARD.md` | Top 10, 닉네임별 플레이 수·최고점·평균, 카테고리별 평균 점수 |
| `leaderboard/import-snippet.js` | 합친 기록을 브라우저에 다시 넣는 콘솔 코드 |

브라우저 순위표까지 갱신하려면 사용자가 게임 페이지 콘솔에 `import-snippet.js` 내용을 붙여 넣고 새로고침하면 된다. 이 작업은 브라우저에 있던 기록을 덮어쓰므로 Claude가 대신 실행하지 않는다. 사용자가 명시적으로 요청하고 Claude in Chrome을 쓸 수 있을 때만 실행한다.

## 5. 보고 형식

1. 기록 출처: 읽은 파일과 각 파일의 유효 기록 수, 제외한 기록 수
2. `LEADERBOARD.md`의 Top 10 표와 닉네임별 표
3. 갱신한 파일 경로
4. 브라우저에 반영하는 방법 (4장)

기록이 없어서 멈췄으면 2장의 내보내기 방법만 보고한다.
