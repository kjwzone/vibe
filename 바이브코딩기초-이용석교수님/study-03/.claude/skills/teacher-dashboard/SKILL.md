---
name: teacher-dashboard
description: 선생님 모드 통합 작업. 기능 검증 → 학생 결과 수집 → 문항 분석 → 보고서 생성 → CSV·PDF 내보내기와 확인을 순서대로 실행
disable-model-invocation: true
argument-hint: [폴더, 기본 class-results]
---

# 선생님 대시보드 통합 실행

아래 1~7단계를 **순서대로** 실행한다. 단계마다 "확인"을 통과해야 다음 단계로 간다. 학생 결과 폴더는 인수로 받는다(비면 `class-results`): $ARGUMENTS

## 하위 스킬 호출 방법

| 단계 | 스킬 | 호출 방법 |
| --- | --- | --- |
| 1 | `/teacher-verify` | 직접 호출 전용(`disable-model-invocation`)이라 Skill 도구로 부를 수 없다. `.claude/skills/teacher-verify/SKILL.md`를 읽고 그 순서대로 실행한다 |
| 2 | `/teacher-collect` | Skill 도구로 호출한다 |
| 3 | `/teacher-questions` | Skill 도구로 호출한다 |
| 4 | `/teacher-report` | 직접 호출 전용. `.claude/skills/teacher-report/SKILL.md`를 읽고 따른다 |
| 5 | `/export-report` | 직접 호출 전용. `.claude/skills/export-report/SKILL.md`를 읽고 따른다 |

## 멈춤 규칙 (모든 단계 공통)

다음 중 하나라도 생기면 **그 뒤 단계를 실행하지 말고** 멈춘다. 멈춘 단계, 원인(실제 출력 그대로), 지금까지 만든 파일을 보고한다. 추측으로 고치고 넘어가지 않는다.

- 명령이 0이 아닌 종료 코드로 끝나거나 `오류:`를 출력함
- 테스트·빌드 실패, 또는 스모크 테스트 실패 항목이 있음
- 유효한 학생 기록이 0건
- 만든 파일이 없거나, 확인 결과(행 수, BOM, PDF 머리)가 맞지 않음
- 문항 분석에서 "정답 오류"가 나옴. 보고서를 만들기 전에 사용자에게 계속할지 묻는다

`경고:`(제외한 파일, 문제 은행에 없는 문항 id)는 멈추지 않고 보고에 모은다.

## 1. 기능 검증 (`teacher-verify`)

- 실행: `npm test` → `npm run lint` → `npm run build` → `node .claude/skills/teacher-verify/smoke.mjs`
- 확인: 테스트 전부 통과, 빌드 성공, 스모크 `14/14 통과`
- Chrome이 없어 스모크만 실패하면 멈추고, 계속할지(브라우저 확인 없이) 사용자에게 묻는다.

## 2. 학생 결과 수집 (`teacher-collect`)

- 실행: `node .claude/skills/teacher-collect/class.mjs collect <폴더>`
- 확인: 종료 코드 0, 유효 기록 1건 이상. 유효·중복·제외 건수를 기록해 둔다(5·6단계 비교용).

## 3. 문항 분석 (`teacher-questions`)

- 실행: `node .claude/skills/teacher-collect/class.mjs questions <폴더>` 후 의심 문항을 `/quiz-check` 기준으로 분류
- 확인: 문항 행 수 = 학생 기록에 나온 문항 id 수. "정답 오류"가 있으면 멈춤 규칙에 따라 묻는다.

## 4. 보고서 생성 (`teacher-report`)

- 실행: `node .claude/skills/teacher-collect/class.mjs report <폴더>`
- 확인: 출력의 `학생 N행`이 2단계 유효 기록 수와 같고, `<폴더>/report/teacher_report.html`이 실제로 있다(`ls`로 확인).

## 5. 내보내기 실행 (`export-report`)

보고서 생성이 끝나면 **반드시** 이어서 실행한다.

- 실행: `node .claude/skills/export-report/export.mjs csv <폴더>/report/teacher_report.html`
- 이어서 PDF: `node .claude/skills/export-report/export.mjs pdf <폴더>/report/teacher_report.html`
  - PDF 실패(브라우저 없음 등)는 **CSV 결과와 분리**해 "PDF 미지원 + 원인 + 지원 조건"으로 보고하고 6단계로 진행한다. CSV 실패는 멈춘다.

## 6. CSV 파일 확인

`export-report`가 쓴 CSV를 Claude가 따로 다시 확인한다.

1. `ls <폴더>/report/`로 `teacher_report_students.csv`, `teacher_report_questions.csv`, `teacher_report_categories.csv`가 있는지 본다.
2. 아래 명령으로 BOM과 줄 수를 확인한다.
   ```bash
   node -e "const fs=require('fs');for(const n of ['students','questions','categories']){const b=fs.readFileSync(process.argv[1]+'/teacher_report_'+n+'.csv');const lines=b.toString('utf8').replace(/^﻿/,'').split('\r\n').filter(Boolean);console.log(n,'BOM',b[0]===0xef&&b[1]===0xbb&&b[2]===0xbf,'rows',lines.length-1)}" <폴더>/report
   ```
3. 기대값: `students` 행 수 = 2단계 유효 기록 수, `questions` 행 수 = 4단계 문항 행 수, `categories` 행 수 = 1, BOM 모두 `true`.
4. `students` CSV의 머리글과 첫 두 행을 보여 주고, 1위의 이름·총점이 2단계 표의 1위와 같은지 대조한다.

하나라도 다르면 멈추고 보고한다.

## 7. 보고

```
## 선생님 대시보드 결과
| 단계 | 결과 | 근거 |
| 1 기능 검증 | 통과 | 테스트 N개, 스모크 14/14 |
| 2 수집 | 유효 N건 (중복 N, 제외 N) | 경고 목록 |
| 3 문항 분석 | 하위 문항, 의심 문항 분류 | |
| 4 보고서 | <폴더>/report/teacher_report.html | 학생 N행, 문항 N행 |
| 5 내보내기 | CSV 3개 / PDF 경로 또는 미지원 사유 | |
| 6 CSV 확인 | 통과 | BOM, 행 수, 1위 대조 |

### 사람이 확인할 항목
- 제외된 학생 파일(다시 받아야 하는지)
- 의심 문항 분류 결과
- 보고서·CSV·PDF를 열어 표가 보기 좋은지
```

`class-results/`는 학생 이름이 들어 있어 커밋하지 않는다.
