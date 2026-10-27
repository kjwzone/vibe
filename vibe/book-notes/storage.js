const STORAGE_KEY = "bookNotes";
const LAST_QUERY_KEY = "bookNotesLastQuery";

const SEED_NOTES = [
  { title: "Python 입문", author: "Kim", memo: "기초 문법 정리" },
  { title: "SQL 노트", author: "Lee", memo: "데이터 조회 연습" },
  { title: "자료구조", author: "Park", memo: "python 예제로 설명" },
  { title: "운영체제", author: "Choi", memo: "프로세스와 스레드" },
  { title: "네트워크 기초", author: "Jung", memo: "TCP 흐름 제어" },
  { title: "클린 코드", author: "Han", memo: "읽기 좋은 코드 작성법" },
  { title: "함께 자라기", author: "Kim" }
];

function loadNotes() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    return JSON.parse(saved);
  }
  return SEED_NOTES;
}

function saveNotes(notes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

function loadLastQuery() {
  return localStorage.getItem(LAST_QUERY_KEY) || "";
}

function saveLastQuery(query) {
  localStorage.setItem(LAST_QUERY_KEY, query);
}
