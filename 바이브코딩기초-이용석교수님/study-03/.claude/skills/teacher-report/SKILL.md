---
name: teacher-report
description: 학생 결과 파일을 집계해 반 성적 보고서 teacher_report.html을 생성
disable-model-invocation: true
argument-hint: [폴더, 기본 class-results]
---

# 반 성적 보고서 생성

학생 결과를 집계해 `class-results/report/teacher_report.html`을 만든다. **파일을 만든다.**

## 데이터 출처

- `class-results/*.json` 학생 결과 파일 (`/teacher-collect`와 같은 검사 통과분). 다른 폴더는 인수로: $ARGUMENTS
- 문제 본문·정답은 `src/data/questions.json`

## 실행

```bash
node .claude/skills/teacher-collect/class.mjs report [폴더]
```

## 만들어지는 보고서

`<폴더>/report/teacher_report.html` (외부 파일 없는 한 장짜리 HTML, 인쇄용 스타일 포함)

| 표 (`data-export`) | 내용 |
| --- | --- |
| 요약 줄 | 생성 시각, 학생 수, 기록 수, 평균·최고·최저, 평균 소요시간, 제외한 기록 |
| `categories` | 분야별 평균 점수 |
| `students` | 순위, 이름, 총점, 정답률, 분야별 점수, 소요시간(초), 등급, 기록 시각 |
| `questions` | 문항별 정답률(낮은 순), 문제, 정답, 정답 수, 시도 수 |

- 정렬과 계산은 앱 선생님 모드(`src/lib/teacher.ts`)와 같다.
- `data-export` 속성은 `/export-report`가 CSV로 바꿀 때 쓰는 표시다. 지우거나 이름을 바꾸지 않는다.

## 확인

- 스크립트가 쓴 파일을 다시 읽어 `students`·`questions` 표의 행 수가 집계와 같은지 확인한다. 다르면 `오류:`로 끝난다.
- 종료 코드가 0이 아니면 멈추고 출력 그대로 보고한다.
- 보고: 보고서 경로, 학생·문항 행 수, 제외한 기록.
- 다음 단계: CSV·PDF가 필요하면 `/export-report`.
