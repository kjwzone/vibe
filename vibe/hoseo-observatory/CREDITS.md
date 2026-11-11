# 출처

우면산 호서 천문대에 쓴 외부 데이터와 라이브러리의 출처다. 소리 출처는 `sounds/CREDITS.md`에 따로 적는다.

## 지도 데이터 (`js/data/geo.js`, 인트로 줌 인)

| 쓰는 곳 | 데이터 | 출처 | 라이선스 | 받은 날짜 |
|---|---|---|---|---|
| 지구본 대륙 윤곽 | Natural Earth 1:110m Land | https://github.com/nvkelso/natural-earth-vector (geojson/ne_110m_land.geojson) | 공공 영역(Public Domain) | 2026-11-12 |
| 한반도 해안선 | Natural Earth 1:10m Land, 동경 123~132.5°, 북위 32~41° 부분만 잘라 냄 | https://github.com/nvkelso/natural-earth-vector (geojson/ne_10m_land.geojson) | 공공 영역(Public Domain) | 2026-11-12 |
| 서울 경계 | geoBoundaries KOR ADM1 (simplified), 원 출처 Natural Earth | https://www.geoboundaries.org (gbOpen/KOR/ADM1) | 공공 영역(Public Domain) | 2026-11-12 |
| 서초구 경계 | geoBoundaries KOR ADM2 (simplified), 원 출처 citypopulation.de, 2020 | https://www.geoboundaries.org (gbOpen/KOR/ADM2), https://www.citypopulation.de/en/southkorea/admin/ | CC BY 3.0 | 2026-11-12 |

- 서초구 경계: Runfola, D. et al. (2020) geoBoundaries: A global database of political administrative boundaries. PLoS ONE 15(4): e0231866. 데이터 원 출처 citypopulation.de. CC BY 3.0에 따라 출처를 밝힌다.
- 점 수를 줄이고(가까운 점 건너뛰기) 좌표를 반올림했다. 경계 자체는 바꾸지 않았다.

## 우주 망원경 사진 (`images/`, 망원경 최대 확대에서 표시)

ESA/Webb과 ESA/Hubble 사진은 CC BY 4.0이다(https://esawebb.org/copyright/, https://esahubble.org/copyright/). 화면에 사진을 띄울 때 아래 출처를 함께 보여 준다. 사이트에서 제공하는 화면 크기(Screensize) JPEG을 그대로 쓰고, 목성 사진만 흰 테두리를 잘라 보인다.

| 파일 | 사진 | 망원경 | 출처 표기 | 페이지 | 받은 날짜 |
|---|---|---|---|---|---|
| images/jwst/jupiter.jpg | Jupiter and Europa (NIRCam) | 제임스 웹 | NASA/ESA/CSA/STScI | https://esawebb.org/images/jupiter-hi-res-atmo/ | 2026-11-12 |
| images/jwst/saturn.jpg | Saturn's rings shine in Webb's observations | 제임스 웹 | NASA, ESA, CSA, STScI, M. Tiscareno (SETI Institute), M. Hedman (University of Idaho), M. El Moutamid (Cornell University), M. Showalter (SETI Institute), L. Fletcher (University of Leicester), H. Hammel (AURA), J. DePasquale (STScI) | https://esawebb.org/images/saturn1/ | 2026-11-12 |
| images/jwst/uranus.jpg | Uranus close-up view (NIRCam) | 제임스 웹 | NASA, ESA, CSA, STScI | https://esawebb.org/images/weic2332a/ | 2026-11-12 |
| images/jwst/neptune.jpg | Neptune (NIRCam Image) | 제임스 웹 | NASA, ESA, CSA, and STScI | https://esawebb.org/images/weic2214c/ | 2026-11-12 |
| images/hubble/mars.jpg | Mars in opposition 2016 | 허블 | NASA, ESA, the Hubble Heritage Team (STScI/AURA), J. Bell (ASU), and M. Wolff (Space Science Institute) | https://esahubble.org/images/heic1609a/ | 2026-11-12 |

- 망원경 보기의 천체 원반 그림(`js/planet-art.js`)은 사진을 쓰지 않고 코드로 그렸다.

## 별 데이터 (`js/data/stars.js`)

| 데이터 | 출처 | 라이선스 |
|---|---|---|
| 예일 밝은 별 목록 5판(BSC5), 4.5등급까지 | http://tdc-www.harvard.edu/catalogs/bsc5.html (JSON 변환: https://github.com/brettonw/YaleBrightStarCatalog) | 공공 데이터 |

## 라이브러리 (`vendor/`)

| 라이브러리 | 버전 | 라이선스 |
|---|---|---|
| three.js | 0.187.0 | MIT (`vendor/three.LICENSE`) |
| Trystero | 0.26.0 | MIT (`vendor/trystero.LICENSE`) |
