---
name: export-report
description: 선생님 모드의 성적 보고서를 외부 파일로 내보내기
disable-model-invocation: true
argument-hint: [teacher_report.html 경로, 기본 class-results/report/teacher_report.html]
---

# 성적 보고서 내보내기 (CSV, PDF)

`/teacher-report`가 만든 `teacher_report.html`을 CSV와 PDF로 내보낸다. **파일을 만든다.**

## 데이터 출처

- `class-results/report/teacher_report.html` (다른 경로는 인수로: $ARGUMENTS)
- 보고서의 `data-export` 표(`students`, `questions`, `categories`)를 그대로 옮긴다. 다시 집계하지 않으므로 숫자는 보고서와 같다.

## 1. 보고서 확인

- `teacher_report.html`이 없으면 멈추고 "`/teacher-report`를 먼저 실행하라"고 보고한다.

## 2. CSV 내보내기 (필수)

```bash
node .claude/skills/export-report/export.mjs csv [보고서 경로]
```

| 파일 | 내용 |
| --- | --- |
| `teacher_report_students.csv` | 학생별 성적 |
| `teacher_report_questions.csv` | 문항별 정답률 |
| `teacher_report_categories.csv` | 분야별 평균 |

- 엑셀에서 한글이 깨지지 않도록 UTF-8 BOM을 붙인다. 줄바꿈은 CRLF다.
- 쉼표·따옴표가 든 값은 따옴표로 감싸고, `= + - @`로 시작하는 값은 앞에 `'`를 붙여 수식으로 실행되지 않게 한다(앱의 `toCSV`와 같은 규칙).
- 스크립트가 쓴 파일을 다시 읽어 **BOM, 줄 수 = 표 행 수**를 확인한다. 실패하면 `오류:`로 끝나므로 멈추고 보고한다.

## 3. PDF 내보내기 (가능할 때)

```bash
node .claude/skills/export-report/export.mjs pdf [보고서 경로]
```

- 추가 패키지 없이 **설치된 Chrome 또는 Edge의 headless 인쇄**(`--print-to-pdf`)로 `teacher_report.pdf`를 만든다.
- 파일이 생겼는지, 앞 5바이트가 `%PDF-`인지 확인한다.
- PDF 지원 조건:
  - Chrome 또는 Edge가 기본 경로에 설치되어 있거나 `CHROME_PATH` 환경 변수로 경로를 지정
  - 한글 글꼴(Windows는 맑은 고딕)이 설치되어 있음. 없으면 PDF의 한글이 네모로 보일 수 있다
- 브라우저가 없어서 실패하면 **CSV 결과는 그대로 두고**, PDF만 "지원 조건 미충족"으로 구분해 보고한다. 대안으로 `teacher_report.html`을 브라우저에서 열어 인쇄 → "PDF로 저장"을 안내한다.

## 4. 보고

- CSV: 파일 경로 3개와 각 행·열 수, BOM 확인 결과
- PDF: 경로와 크기, 또는 실패 원인과 지원 조건
- 학생 이름이 들어 있으므로 `class-results/`는 커밋하지 않는다(gitignore 대상).
