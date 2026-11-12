# CLAUDE.md

## 프로젝트 목적
- 바이브 코딩 워크숍 실습 저장소.
- 글자 수 세기(counter), 쇼릴(reel), 발표자료(deck)를 GitHub Pages로 공개

## 실행 명령
- 서버 없음.
- 각 폴더의 index.html을 브라우저로 연다

## 테스트 명령
- 자동 테스트 없음.
- 수정 뒤 브라우저 새로고침으로 보통 글, 빈 입력, 아주 긴 글, 띄어쓰기와 줄바꿈 4가지를 확인한다
- book-notes는 python, zzz, 빈 입력 3가지로 화면을 확인한다.
- 도서 메모 검색은 node book-notes/tests/run-tests.js, Node가 없으면 book-notes/test.html을 연다.

## 코드 규칙
- 순수 HTML, CSS, 자바스크립트만 쓴다.
- 외부 라이브러리와 프레임워크를 추가하지 않는다.
- 함수 이름은 동사로 시작한다.
- 한 번에 하나만 바꾼다
- 바꾸기 전에 어떤 파일의 어느 부분을 바꿀지 먼저 말한다.
- 해석이 둘 이상 가능하면 구현 전에 AskUserQuestion으로 선택지를 보여 주고 확인받는다.

## 완료 기준
- 요청한 파일만 바뀌었다.
- 브라우저에서 4가지 확인을 마쳤다.
- 변경 이유가 1줄로 적혀 있다

## 보고 방식
- 수정 전에 계획을 먼저 보여 준다.
- 끝나면 변경한 파일 목록, 확인 방법, 남은 위험 순서로 정리한다

## 우면산 호서 천문대 작업 규칙
- 작업 전 hoseo-observatory/HANDOFF.md, SPEC.md를 읽고 연결되는 R 번호를 말한다. 결정은 context-notes.md에 날짜와 이유로 덧붙인다.
- 외부 라이브러리 금지의 예외는 이 폴더의 three.js와 Trystero뿐이다. vendor/에 버전을 고정해 두고 CDN에서 불러오지 않는다. 다른 라이브러리는 더하지 않는다.
- 테스트는 node hoseo-observatory/tests/run-tests.js로 실행하고 통과 수를 보고한다. 계산·정렬 같은 규칙은 순수 함수로 두고 테스트를 붙인다.
- 화면 확인은 python -m http.server 8765 --directory hoseo-observatory로 연다. file://로는 ES 모듈이 막힌다.
- SPEC의 R 번호는 지우거나 다시 매기지 않는다. 쓰지 않게 된 기준은 "(삭제)"로 비워 둔다.
- 소리·사진·지도·별 데이터 같은 외부 자산은 라이선스를 먼저 확인하고 CREDITS.md(소리는 sounds/CREDITS.md)에 출처를 적는다. CC BY 자료의 출처 표시는 지우지 않는다.
- 공개하면 안 되는 문서를 만들면 hoseo-observatory/.vercelignore에 더한다. 앱이 쓰는 최상위 폴더를 새로 만들면 .github/workflows/pages.yml의 복사 목록에 더한다.
- 배포는 push하면 GitHub Pages가 자동으로 된다. Vercel은 Git 자동 연결 전까지 Vercel MCP create_deployment(gitSource, 커밋 sha 지정)로 다시 배포한다. Vercel CLI는 로그인되어 있지 않다. 배포 뒤 두 공개 주소에서 바뀐 파일을 확인한다.
