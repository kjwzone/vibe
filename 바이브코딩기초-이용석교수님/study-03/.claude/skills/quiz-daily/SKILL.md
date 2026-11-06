---
name: quiz-daily
description: 퀴즈 추가·검증·통계·백업을 순서대로 수행하는 유지보수 작업
disable-model-invocation: true
argument-hint: [추가할 문제 수 1~8, 기본: 보완이 필요한 카테고리마다 1개]
---

# 퀴즈 일일 유지보수

아래 1~7단계를 **순서대로** 수행한다. 단계마다 결과를 확인하고 나서 다음 단계로 넘어간다.

모든 명령은 프로젝트 루트(`study-03`)에서 실행한다. 보조 스크립트는 `node .claude/skills/quiz-daily/daily.mjs <명령>` 형식이다. 아래에서는 `daily.mjs`로 줄여 쓴다.

## 멈춤 규칙 (모든 단계 공통)

다음 중 하나라도 생기면 **그 뒤의 파일 변경을 모두 멈추고** 지금까지 한 일, 멈춘 단계, 원인(실제 오류 메시지 그대로)을 보고한다. 추측으로 고치고 넘어가지 않는다.

- 명령이나 스크립트가 0이 아닌 종료 코드로 끝나거나 `오류:`를 출력함
- 테스트(`npm test`, `questions.test.ts`)가 실패함
- 백업 파일이 없거나, 해시·항목 수가 원본과 다름
- `/quiz-check` 결과 기존 데이터에 **오류**(정답이 틀렸거나 정답이 둘 이상)가 있음
- 새로운 **확인 필요** 항목이 나옴. 단, `context-notes.md`의 "열린 질문"에 이미 적힌 항목은 알려진 사항이므로 멈추지 않고 보고에만 적는다.
- 파일 구조나 스키마가 아래 1단계 설명과 다름

이미 파일을 바꾼 뒤에 멈추게 되면, 4단계 백업으로 되돌릴지 사용자에게 묻는다. 묻지 않고 되돌리지 않는다.

## 1. 저장 파일과 데이터 구조 확인

- `src/data/questions.json`이 있는지, JSON 배열인지 확인한다.
- `src/lib/questions.ts`의 `Question` 타입과 `QUESTIONS_PER_ROUND`를 읽고, 스키마가 `id, category, question, options[4], answerIndex, explanation, difficulty`(+선택 `source`)인지 확인한다.
- `src/lib/leaderboard.ts`에서 순위 기록이 브라우저 `localStorage`(`quiz_leaderboard`)에만 있다는 점을 확인한다. 프로젝트 안의 순위 파일은 `/quiz-leaderboard`가 만든 `leaderboard/leaderboard.json`뿐이다.
- `npx vitest run src/lib/questions.test.ts`로 현재 데이터가 깨끗한지 확인한다. **실패하면 멈춘다.**

## 2. 현재 분포 확인 (`/quiz-stats`)

- `/quiz-stats` 스킬을 실행한다. 스크립트만 쓰려면 `node .claude/skills/quiz-stats/stats.mjs`를 실행한다.
- 출력을 "변경 전 통계"로 그대로 보관한다. 7단계 보고에 쓴다.

## 3. 보완할 부분 찾기 (`/quiz-check`)

- `/quiz-check` 스킬로 전체 문항을 점검한다. **오류가 나오면 멈춘다.**
- 2단계 통계와 함께 카테고리(한국사, 과학, 지리, 일반상식)마다 보완점을 정리한다.
  - 난이도: easy 4 · normal 4 · hard 2 비율보다 부족한 난이도
  - 정답 위치: 0개이거나 몰린 보기 위치 → 새 문제의 `answerIndex`로 균형을 맞춤
  - 문제 수: 다른 카테고리보다 적은 곳
  - `/quiz-check`의 "개선 권장" 항목 (기존 문항 수정 후보)
- 추가할 문제 수를 정한다. 인수(`$ARGUMENTS`)에 1~8 사이 숫자가 있으면 그만큼 만든다. 없으면 보완이 필요한 카테고리마다 1개(최대 4개)를 만든다. 인수가 숫자가 아니거나 범위를 벗어나면 멈추고 사용법을 알려 준다.
- **기존 문항 수정은 이 단계에서 목록만 만든다.** 사용자가 승인한 것만 5단계에서 고친다. 승인이 없으면 수정하지 않고 추가만 한다.

## 4. 후보 중복 확인과 변경 전 백업

1. `/quiz-add`의 3~5장(형식, 난이도 기준, 검증 체크리스트)에 따라 후보 문제를 만든다. 사실 관계를 확신할 수 없는 소재는 고르지 않는다.
2. 후보를 JSON 배열로 `backups/candidates-<YYYYMMDD-HHmmss>.json`에 저장한다.
3. `daily.mjs dup backups/candidates-….json`을 실행한다.
   - `오류`가 있는 후보는 고치거나 다른 소재로 바꾼 뒤 다시 검사한다. 두 번 고쳐도 오류가 남으면 그 후보는 버린다.
   - `확인` 항목(유사 질문, 같은 정답, 해설 속 힌트)은 해당 기존 문항을 직접 읽고 같은 사실을 묻는지 판단한다. 같은 사실이면 후보를 버린다. 판단 결과를 보고에 적는다.
4. 통과한 후보가 하나도 없으면 멈추고 보고한다.
5. `daily.mjs backup before`를 실행해 **변경 전 백업**을 만든다. 출력의 백업 경로를 기록한다. `백업 완료`와 `원본과 일치`가 나오지 않으면 멈춘다.

## 5. 문제 추가와 검사

1. 통과한 후보를 `src/data/questions.json`의 같은 카테고리 마지막 문항 뒤에 넣는다. 기존 형식(공백 2칸 들여쓰기, 보기는 한 줄 배열, 필드 순서)을 따른다.
2. 3단계에서 사용자가 승인한 기존 문항 수정이 있으면 이때 함께 반영한다.
3. 아래 검사를 모두 실행한다. 하나라도 실패하면 멈춘다.
   - `npx vitest run src/lib/questions.test.ts`: 스키마, id 중복, 보기, `answerIndex`, 글자 수
   - `npm test`: 전체 테스트
   - `daily.mjs diff <4단계 백업 폴더>/questions.json`: 의도한 id만 추가·수정되었는지 확인한다. 삭제가 보이면 스크립트가 오류로 끝난다.
4. **정답 검사**: 추가·수정한 문항마다 `/quiz-check` 2장(정답 점검)과 4장(모호한 표현) 기준으로 `options[answerIndex]`, 해설, 최상급 표현을 다시 확인한다. 확신할 수 없으면 "확인 필요"로 보고 멈춘다.

## 6. 전체 백업과 실제 파일 확인

1. `leaderboard/` 폴더에 내보낸 기록(`*.json`)이 있으면 `node .claude/skills/quiz-leaderboard/aggregate.mjs`를 실행해 `leaderboard/leaderboard.json`을 최신으로 만든다. 없으면 건너뛰고 그렇게 적는다. (`/quiz-leaderboard`는 직접 호출 전용 스킬이라 Claude가 호출할 수 없으므로 스크립트만 쓴다.)
2. `daily.mjs backup after`를 실행해 **전체 백업**을 만든다. `questions.json`과, 있으면 `leaderboard.json`이 함께 들어간다.
3. `daily.mjs verify <after 백업 폴더>`와 `daily.mjs verify <before 백업 폴더>`를 실행한다. 두 백업 모두 파일 존재, 해시 일치, 항목 수가 확인되어야 한다.
4. 백업 폴더 목록을 `ls`로 보여 주어 실제 파일이 있는지 확인한다.
5. 모두 통과하면 `npm run build`로 `dist/index.html`에 반영하고, 커밋 메시지 한 문장으로 `src/data/questions.json`만 커밋한다. (예: "일일 유지보수로 HIS-012, SCI-011 추가") `backups/`와 `leaderboard/`는 gitignore 대상이라 커밋하지 않는다.

## 7. 보고

```
## quiz-daily 결과 (YYYY-MM-DD HH:mm)

### 추가·수정한 문제
| id | 카테고리 / 난이도 | 질문 | 정답 | 비고 |

### 검사 결과
- questions.test.ts: 통과 (N개)
- npm test: 통과 (N개)
- 중복 검사(dup): 오류 0, 확인 N건 → 판단 내용
- 정답 검사: 문항별 결과
- 확인 필요(기존 열린 질문): ...

### 통계 변화
(daily.mjs diff 표 + 정답 위치 분포 변경 전 → 후)

### 백업
- 변경 전: backups/<...>-before/ (questions.json N건, 해시 확인)
- 변경 후: backups/<...>-after/ (questions.json N건, leaderboard.json N건 또는 없음)

### 커밋
- <해시> <메시지>

### 사람이 확인할 항목
- 새 문제의 사실 관계와 source 출처
- 게임에서 새 문제가 정상 표시되는지
- 보류한 기존 문항 수정 후보
```

멈췄을 때는 위 형식 대신 "멈춘 단계, 원인(오류 메시지), 지금까지 바뀐 파일, 되돌릴 백업 경로"를 보고한다.
