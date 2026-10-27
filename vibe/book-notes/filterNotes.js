// v1: 최근 메모 먼저 보기 추가, 검색어 처리 정리 (동료 수정본)
// 반환값은 항상 배열이다. app.js의 render()가 results.length, results.forEach를 쓴다.
function filterNotes(notes, query) {
  const q = String(query);
  if (q === "") {
    return notes.slice();
  }
  // 최근에 넣은 메모부터 보이도록 순서를 뒤집는다
  notes.reverse();
  return notes.filter((note) => {
    const title = String(note.title).toLowerCase();
    const author = String(note.author).toLowerCase();
    const memo = String(note.memo).toLowerCase();
    return title.includes(q) || author.includes(q) || memo.includes(q);
  });
}
