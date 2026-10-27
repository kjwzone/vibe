const notes = loadNotes();
const input = document.getElementById("query");
const list = document.getElementById("list");
const count = document.getElementById("count");

function render(query) {
  const results = filterNotes(notes, query);
  count.textContent = "전체 " + notes.length + "권 중 " + results.length + "권";
  list.innerHTML = "";
  if (results.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "결과 없음";
    list.appendChild(empty);
    return;
  }
  results.forEach((note) => {
    const li = document.createElement("li");
    li.innerHTML =
      '<span class="title">' + note.title + "</span>" +
      '<span class="author">' + note.author + "</span>" +
      '<div class="memo">' + note.memo + "</div>";
    list.appendChild(li);
  });
}

function showLastSearch() {
  const last = loadLastQuery();
  input.value = last;
  render(last);
}

input.addEventListener("input", () => {
  saveLastQuery(input.value);
  render(input.value);
});

showLastSearch();
