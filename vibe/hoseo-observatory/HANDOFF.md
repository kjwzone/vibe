# HANDOFF — 우면산 호서 천문대

다음 세션이 이 파일부터 읽고 이어받는다. 자세한 결정 기록은 `context-notes.md`, 요구사항과 완료 기준(R1~R60)은 `SPEC.md`에 있다.

작성: 2026-11-12

## 1. 현재 상태

| 항목 | 값 |
|---|---|
| 공개 주소 (GitHub Pages) | https://kjwzone.github.io/vibe/hoseo-observatory/ |
| 공개 주소 (Vercel) | https://hoseo-observatory.vercel.app |
| 저장소 | https://github.com/kjwzone/vibe (로컬 git 루트는 `C:\Users\HP\hoseo`, 앱은 `vibe/hoseo-observatory/`) |
| 마지막 앱 커밋 | `0cbbf62` 천문대 SPEC과 작업 기록에 망원경 시야·별자리 정렬·이름 순서 반영 (이 HANDOFF 커밋은 그 뒤) |
| 배포 확인 (2026-11-12) | 두 주소 모두 `0cbbf62` 코드가 올라가 있음. `index.html`·`js/constellation-order.js` 200, 새 이름 순서 반영, `SPEC.md` 404(의도대로 비공개) |
| Vercel 프로젝트 | 팀 `kjwzone71-1940's projects`(team_fhohDdlKVNzPP2OBrFbR9UCv), 프로젝트 `hoseo-observatory`(prj_tn0on5U2XuoCiCXa336HtOxYBtgG), 최신 배포 dpl_DJXPLQEiKtiJiHRWvVqkJJ2FhGAq (READY) |
| node 테스트 | `node vibe/hoseo-observatory/tests/run-tests.js` → 40개 통과, 0개 실패 |

### 실행과 확인
- 로컬: `python -m http.server 8765 --directory hoseo-observatory` (vibe 폴더에서). `vibe/.claude/launch.json`의 `observatory` 설정과 같다. ES 모듈이라 `file://`로 열면 안 된다.
- 소리는 천문대 화면에서 첫 클릭 뒤에만 난다. 인트로 중에는 나지 않는다.

### 주요 파일
| 파일 | 역할 |
|---|---|
| `js/main.js` | 시작점. 인트로→천문대 전환(입장 조망과 사람 수), 함께 있기(이름·위치·인사), 소리, 망원경·사진 연결 |
| `js/overview.js` | 입장 때 광장을 4초 내려다보는 CCTV 조망 카메라 위치(순수 함수, 테스트 있음) |
| `js/intro.js` | 태양계→지구→대한민국→서울→서초구→우면산→천문대 인트로(약 35초) |
| `js/world.js`, `js/character.js`, `js/controls.js` | 산·관측소·망원경, 과학자 캐릭터, 걷기·클릭 이동·시점·망원경 확대 |
| `js/sky.js`, `js/astro.js` | 천구(별·별자리·천체), 천체 위치·고리 기울기·항성시 계산 |
| `js/planet-art.js`, `js/photo.js`, `js/data/photos.js` | 망원경 속 천체 원반 그림, 최대 확대 시 사진(JWST·허블, 태양·달·수성·금성은 NASA 탐사선) |
| `js/ui.js`, `js/constellation-order.js`, `js/names.js` | 버튼·목록·카드, 별자리 정렬 3가지, 이름 목록(지명도 순) |
| `js/net.js` | Trystero(Nostr)로 한 방 접속 |
| `js/sound.js` | 도로 백색 소음 + 무작위 부엉이 |
| `js/data/stars.js`, `js/data/geo.js` | BSC5 별 904개·별자리 20개, 인트로 지도 윤곽 |
| `CREDITS.md`, `sounds/CREDITS.md` | 외부 데이터·사진·소리·라이브러리 출처 |

## 2. 결정한 사항과 이유 (요약)

전체는 `SPEC.md`의 결정 표(D1~D21)와 `context-notes.md`에 있다.

| 결정 | 이유 |
|---|---|
| three.js·Trystero만 예외로 허용, `vendor/`에 버전 고정(three 0.187.0, trystero 0.26.0, esbuild로 한 파일씩) | 3D와 서버 없는 다중 접속에 필요. CDN 장애·버전 변경에 흔들리지 않게 |
| 사이트 전체가 한 방(Trystero Nostr, appId `hoseo-observatory-umyeonsan`, 방 `main`) | 방 만들기 조작이 생기지 않게 |
| 위치 전송·시간 초과는 `setInterval`(rAF 아님) | 뒤로 간 탭이 다른 사람 화면에서 사라지지 않게 |
| 3인칭 카메라는 머리 위·뒤에, 지평선 아래 천체는 반투명 땅 위에 회색으로 | 올려다볼 때 캐릭터가 하늘을 가리지 않게, 지평선 아래도 보이게 |
| 소리: 도로 백색 소음(#621) + 15~40초 무작위 부엉이, 천문대에서만 | 바람·풀벌레는 사용자가 듣고 거슬린다고 해 뺐음(D13~D15, D18, D21) |
| 인트로는 지구본→평면 지도→3D 산 세 장면을 이어 붙임 | 지구본 하나로 서초구(7km)까지 확대하면 정밀도가 깨짐 |
| 망원경: 버튼은 늘 가운데, 시야 50°~0.8°, 별자리 고르면 전체가 보이게 시야 자동 맞춤 | 사용자 요청. 큰 별자리(오리온·큰곰)가 8°에 안 들어갔음 |
| 망원경 속 천체는 코드로 그린 원반, 최대 확대에서 JWST(목성·토성·천왕성·해왕성)·허블(화성) 사진 | 실제에 가깝게. 화성 JWST 사진은 설명 그림이라 허블로 대체 |
| 이름 목록은 영문 위키백과 12개월 조회수 순, 고른 이름은 localStorage에 기억, 겹치면 나중에 가진 쪽(nameAt)이 양보 | 사용자 요청과, 먼저 들어온 사람이 남의 이름을 빼앗지 않게 |
| 별자리 목록 정렬 3가지(잘 보이는 순 기본, 자오선 순, 묶음·황도 순) | 사용자 요청 |
| SPEC의 R 번호는 지우지 않고 "(삭제)"로 비움(R21, R29, R30) | PROMPTS·checklist·과거 보고와 번호가 어긋나지 않게 |

## 3. 남은 작업

1. ~~**Vercel 자동 배포 연결**~~ 완료(2026-11-12)
   - 사용자가 대시보드에서 `kjwzone/vibe`를 연결했다. 연결 여부는 `get_git_deployment_context`의 linkedProjects로 본다(`get_project`에는 `link`가 나오지 않는다).
   - `6230262` push 직후 자동 배포 `dpl_5EzCkEkduAqJZdRn4nesV2Zy1dyz`가 생겨 READY. `hoseo-observatory.vercel.app`에서 index.html·js·CREDITS.md 200, HANDOFF·SPEC·context-notes·tests 404.
2. **귀와 창 두 개로 해야 하는 확인**: R28·R31·R32·R43·R47·R50(소리)은 사용자가 직접 들어야 한다. 지금까지는 코드 상태값으로만 확인했다. R45는 2026-11-12에 로컬 탭 두 개로 확인했다(통과).
3. **RUNLOG.md**: 빈 양식 그대로다. 작업 이력은 `context-notes.md`에 있으니, 필요하면 마지막 묶음(Z1 이후 수정들) 기준으로 채운다.
4. **checklist.md**: P0~Z1(처음 계획)만 있다. 이후 추가 기능(R44~R57)은 체크리스트 항목이 없다.
5. **커밋하지 않은 파일(사용자 것, 손대지 않음)**: `vibe/CLAUDE.md`의 "다음오피스 작업 규칙" 10줄, `vibe/book-notes/tests/filterNotes.test.js`, `hoseo-observatory/capture-*.png` 2개, W5~W7 실습 폴더 등.

## 4. 주의할 점

- **Vercel CLI 미로그인**: `vercel whoami`가 로그인 대기로 멈춘다. CLI로 배포하지 말고, Vercel MCP `create_deployment`에 `gitSource {type: github, org: kjwzone, repo: vibe, ref: main, sha: <커밋>}`, `project: hoseo-observatory`, `target: production`을 넣어 배포한다. 파일을 직접 담아 보내기에는 크다(약 4.5MB).
- **Vercel 자동 배포**: push하면 Vercel도 GitHub Pages도 자동 배포된다. Vercel MCP `create_deployment`로 따로 배포할 필요가 없다. push 뒤 `list_deployments`로 새 배포가 READY인지 본다.
- **`.vercelignore`**: SPEC·RUNLOG·PROMPTS·checklist·context-notes·HANDOFF·tests를 Vercel에 올리지 않는다. 공개하면 안 되는 문서를 새로 만들면 여기에 더한다.
- **GitHub Pages 복사 목록**: `.github/workflows/pages.yml`이 `vibe/hoseo-observatory/{index.html,style.css,js,vendor,sounds,images,CREDITS.md}`만 복사한다. 앱이 쓰는 최상위 폴더를 새로 만들면 이 목록에 더해야 공개 사이트에서 보인다.
- **push 범위**: 로컬 `main`을 push하면 다른 실습 폴더의 커밋도 같이 공개 저장소에 올라간다. push 전에 `git rev-list origin/main..main`으로 확인한다.
- **Vercel 주소**: `hoseo-observatory.vercel.app`은 공개. 팀 이름이 붙은 `…-kjwzone71-1940s-projects.vercel.app` 주소들은 Vercel 기본 보호로 로그인해야 열린다(정상).
- **출처 표시**: 서초구 경계(geoBoundaries, CC BY 3.0)와 JWST·허블 사진(CC BY 4.0)은 출처를 지우면 안 된다. 사진 출처는 화면(사진 아래)과 CREDITS.md 두 곳에 있다.
- **브라우저 확인 요령**: 내장 브라우저 창이 숨겨지면 rAF가 거의 멈춰 인트로·회전이 아주 느리다. 로컬 서버는 모듈을 캐시하므로 고친 뒤 `fetch('/js/파일.js', {cache:'reload'})` 후 새로고침한다. 확인용 임시 전역(`window.__obs` 등)은 Z1에서 모두 지웠다. 필요하면 다시 넣고 확인 뒤 지운다.
- **알려진 경고**: 콘솔에 `wss://relay.bullishbounty.com` 연결 실패가 반복된다. Trystero 기본 중계 하나가 죽은 것이고 다른 중계로 연결되므로 기능에는 영향이 없다.
- **알려진 한계**: 5분 넘게 숨긴 탭은 다른 사람 화면에서 잠시 사라질 수 있다. 대적점·화성 무늬 위치는 실제 자전 위치가 아니다. 고리는 기울기만 실제 값이고 화면에서 늘 가로다. 내장 브라우저는 `kjwzone.github.io`, `vercel.app`을 열 수 없어서 공개 화면은 curl로만 확인했다.
