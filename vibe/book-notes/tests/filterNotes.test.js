// filterNotes 테스트 파일
// 형식: test("완료 기준을 설명하는 이름", () => { ... });
// 확인 도구: assertEqual(실제, 기대, 설명) · assertDeepEqual(실제, 기대, 설명)
// 실행: node book-notes/tests/run-tests.js  또는  book-notes/test.html을 브라우저로 열기

function makeNotes() {
  return [
    { title: "Python 입문", author: "Kim", memo: "기초 문법 정리" },
    { title: "SQL 노트", author: "Lee", memo: "데이터 조회 연습" },
    { title: "자료구조", author: "Park", memo: "python 예제로 설명" }
  ];
}

test("검색어가 비어 있으면 전체 목록을 반환한다", () => {
  const notes = makeNotes();
  const result = filterNotes(notes, "");
  assertEqual(result.length, 3, "빈 검색어 결과 개수");
});
