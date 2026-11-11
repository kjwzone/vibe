// 망원경을 가장 크게 확대했을 때 보여 줄 실제 우주 망원경 사진과 출처(ESA/Webb, ESA/Hubble, CC BY 4.0)
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
};
