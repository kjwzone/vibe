// 망원경을 가장 크게 확대했을 때 보여 줄 실제 사진과 출처(ESA/Webb·ESA/Hubble CC BY 4.0, NASA 탐사선 공공 영역)
// crop은 원본에서 잘라 쓸 부분 [x, y, 너비, 높이](px). 없으면 전체를 쓴다.
export const PHOTOS = {
  jupiter: {
    src: 'images/jwst/jupiter.jpg',
    crop: [162, 174, 963, 963],
    telescope: '제임스 웹 우주 망원경',
    title: '목성과 유로파 (NIRCam, 적외선)',
    credit: 'NASA/ESA/CSA/STScI',
    page: 'https://esawebb.org/images/jupiter-hi-res-atmo/',
  },
  saturn: {
    src: 'images/jwst/saturn.jpg',
    telescope: '제임스 웹 우주 망원경',
    title: '토성 (NIRCam, 적외선)',
    credit: 'NASA, ESA, CSA, STScI, M. Tiscareno (SETI Institute), M. Hedman (University of Idaho), M. El Moutamid (Cornell University), M. Showalter (SETI Institute), L. Fletcher (University of Leicester), H. Hammel (AURA), J. DePasquale (STScI)',
    page: 'https://esawebb.org/images/saturn1/',
  },
  uranus: {
    src: 'images/jwst/uranus.jpg',
    telescope: '제임스 웹 우주 망원경',
    title: '천왕성 (NIRCam, 적외선)',
    credit: 'NASA, ESA, CSA, STScI',
    page: 'https://esawebb.org/images/weic2332a/',
  },
  neptune: {
    src: 'images/jwst/neptune.jpg',
    telescope: '제임스 웹 우주 망원경',
    title: '해왕성 (NIRCam, 적외선)',
    credit: 'NASA, ESA, CSA, and STScI',
    page: 'https://esawebb.org/images/weic2214c/',
  },
  mars: {
    src: 'images/hubble/mars.jpg',
    telescope: '허블 우주 망원경',
    title: '화성 (2016년 충 무렵)',
    credit: 'NASA, ESA, the Hubble Heritage Team (STScI/AURA), J. Bell (ASU), and M. Wolff (Space Science Institute)',
    page: 'https://esahubble.org/images/heic1609a/',
  },
  // 아래 넷은 망원경이 아니라 NASA 탐사선·위성 사진이다(미국 공공 영역). license를 따로 적는다.
  sun: {
    src: 'images/nasa/sun.jpg',
    telescope: 'SDO 태양 관측 위성',
    title: '태양 (AIA 30.4nm, 자외선, 2010-08-19)',
    credit: 'NASA/SDO (AIA)',
    page: 'https://commons.wikimedia.org/wiki/File:The_Sun_by_the_Atmospheric_Imaging_Assembly_of_NASA%27s_Solar_Dynamics_Observatory_-_20100819.jpg',
    license: '공공 영역',
  },
  moon: {
    src: 'images/nasa/moon.jpg',
    telescope: 'LRO 달 정찰 궤도선',
    title: '달 앞면 (광각 카메라 모자이크)',
    credit: 'NASA/GSFC/Arizona State University',
    page: 'https://commons.wikimedia.org/wiki/File:Moon_nearside_LRO.jpg',
    license: '공공 영역',
  },
  mercury: {
    src: 'images/nasa/mercury.jpg',
    telescope: '메신저 탐사선',
    title: '수성 (2008년 첫 근접 비행, 컬러)',
    credit: 'NASA/Johns Hopkins University Applied Physics Laboratory/Carnegie Institution of Washington',
    page: 'https://commons.wikimedia.org/wiki/File:Mercury_in_color_-_Prockter07-edit1.jpg',
    license: '공공 영역',
  },
  venus: {
    src: 'images/nasa/venus.jpg',
    telescope: '매리너 10호 탐사선',
    title: '금성 (1974년 사진, 2020년 새로 처리)',
    credit: 'NASA/JPL-Caltech',
    page: 'https://commons.wikimedia.org/wiki/File:PIA23791-Venus-NewlyProcessedView-20200608.jpg',
    license: '공공 영역',
  },
};
