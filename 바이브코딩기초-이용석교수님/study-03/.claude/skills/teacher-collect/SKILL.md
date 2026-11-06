---
name: teacher-collect
description: 학생 결과 파일(quiz-result-*.json)을 모아 형식·중복·점수 위변조를 검사
argument-hint: [폴더, 기본 class-results]
---

# 학생 결과 파일 수집·검사

학생들이 결과 화면의 [결과 파일 저장]으로 내려받은 파일을 검사한다. **파일을 바꾸지 않는다.**

## 데이터 출처

- 학생 기기 브라우저에서 저장한 `quiz-result-<이름>-<시각>.json`이다. 형식은 `src/lib/teacher.ts`의 `StudentResult`(`format: "quiz-result"`, `version: 1`, 문항별 `answers`)를 따른다.
- 선생님이 이 파일들을 프로젝트의 `class-results/` 폴더(gitignore 대상)에 모은다. 인수로 다른 폴더를 줄 수 있다: $ARGUMENTS
- 브라우저의 `quiz_leaderboard`(순위표)는 문항별 정답이 없어서 이 스킬의 출처가 아니다.

## 실행

```bash
node .claude/skills/teacher-collect/class.mjs collect [폴더]
```

스크립트가 하는 일은 다음과 같다. 검사 규칙은 앱의 `teacher.ts` `parseResultText`와 같다.
- `.json` 파일마다 결과 한 건 또는 배열을 읽는다.
- 형식·버전, 이름(2~10자), 기록 시각, 소요시간, 문항별 답 모양을 검사한다.
- **점수가 문항별 정답과 맞는지**(총점, 정답 수, 분야별 점수) 확인해 손으로 고친 파일을 걸러 낸다.
- 이름과 기록 시각이 같은 기록은 한 번만 센다.
- 지금 문제 은행에 없는 문항 id를 경고한다. 문제를 바꾼 뒤 예전 결과를 불러온 경우다.

## 결과 판단

- 종료 코드 1(`오류:`): 폴더가 없거나, `.json`이 없거나, 유효한 기록이 0건이다. 원인과 함께 "학생 결과 파일을 `class-results/`에 넣으라"고 안내하고 멈춘다.
- `경고:` 줄: 제외한 파일과 이유를 그대로 보고한다. 유효 기록이 1건 이상이면 계속 진행할 수 있다.
- 보고: 파일 수, 유효·중복·제외 건수, 학생 표(이름, 점수, 정답/문제, 소요시간, 파일).
