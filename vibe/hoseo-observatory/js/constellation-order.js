// 별자리 목록을 세 가지 기준(지금 잘 보이는 순, 자오선 순, 묶음+황도 순)으로 정렬하는 순수 함수
export const SORT_MODES = [
  { id: 'visible', label: '잘 보이는 순' },
  { id: 'meridian', label: '자오선 순' },
  { id: 'zodiac', label: '묶음·황도 순' },
];

// 황도 12궁: 서양 점성술(별자리 운세) 순서, 양자리부터
export const ZODIAC_ORDER = ['Ari', 'Tau', 'Gem', 'Cnc', 'Leo', 'Vir', 'Lib', 'Sco', 'Sgr', 'Cap', 'Aqr', 'Psc'];

// 지금 고도가 높은 별자리부터. 지평선 아래는 자연히 맨 뒤로 간다.
export function sortByVisibility(list) {
  return [...list].sort((a, b) => b.alt - a.alt);
}

// 남쪽 자오선을 지나기까지 남은 시간(시). 방금 지난 것(30분 이내)은 0에 가깝게 맨 앞으로 둔다.
export function computeHoursToTransit(ra, lst) {
  const deg = (((ra - lst + 7.5) % 360) + 360) % 360 - 7.5;
  return deg / 15;
}

// 지금 자오선 근처에 있는 별자리부터, 동쪽에서 차례로 남중할 순서대로.
export function sortByMeridian(list, lst) {
  return [...list].sort((a, b) => computeHoursToTransit(a.ra, lst) - computeHoursToTransit(b.ra, lst));
}

// 두 묶음으로 나눈다: 대표 별자리(원래 순서 유지)와 황도 12궁(양자리부터 물고기자리까지).
export function groupByZodiac(list) {
  const zodiac = ZODIAC_ORDER.map((abbr) => list.find((c) => c.abbr === abbr)).filter(Boolean);
  const others = list.filter((c) => !ZODIAC_ORDER.includes(c.abbr));
  return [
    { title: '대표 별자리', items: others },
    { title: '황도 12궁', items: zodiac },
  ];
}
