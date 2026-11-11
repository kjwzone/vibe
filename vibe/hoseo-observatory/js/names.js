// 캐릭터 이름 목록과, 겹치지 않게 이름을 고르고 겹칠 때 누가 양보할지 정하는 순수 함수
export const NAMES = [
  '에드윈 허블', '칼 세이건', '베라 루빈', '헨리에타 스완 리빗', '수브라마니안 찬드라세카르',
  '아서 에딩턴', '세실리아 페인가포슈킨', '조르주 르메트르', '스티븐 호킹', '카를 슈바르츠실트',
  '애니 점프 캐넌', '프레드 호일', '한스 베테', '프리츠 츠비키', '에이나르 헤르츠스프룽',
  '헨리 노리스 러셀', '조지 가모프', '야코프 젤도비치', '낸시 그레이스 로먼', '제임스 진스',
];

// 쓰이고 있지 않은 이름 하나를 무작위로 고른다. 모두 쓰이면 번호를 붙인다.
export function pickName(usedNames, random = Math.random) {
  const used = new Set(usedNames);
  const unused = NAMES.filter((n) => !used.has(n));
  if (unused.length > 0) return unused[Math.floor(random() * unused.length)];
  const base = NAMES[Math.floor(random() * NAMES.length)];
  let k = 2;
  while (used.has(`${base} ${k}`)) k++;
  return `${base} ${k}`;
}

// 상대와 이름이 같을 때 내가 다시 뽑아야 하는지 정한다.
// 나중에 들어온 쪽이 양보하고, 들어온 시각이 같으면 연결 ID가 큰 쪽이 양보한다.
export function shouldYieldName(me, other) {
  if (me.name !== other.name) return false;
  if (other.joinedAt !== me.joinedAt) return other.joinedAt < me.joinedAt;
  return other.id < me.id;
}
