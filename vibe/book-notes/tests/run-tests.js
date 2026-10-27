// 실행: node book-notes/tests/run-tests.js
// filterNotes.js는 고치지 않고 그대로 읽어 와서 테스트한다 (브라우저에서 바로 열리는 방식 유지).
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const context = vm.createContext({ console: console });
for (const file of ["filterNotes.js", "tests/mini-test.js", "tests/filterNotes.test.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}

const results = vm.runInContext("runTests()", context);
let pass = 0;
for (const r of results) {
  if (r.ok) {
    pass++;
    console.log("통과  " + r.name);
  } else {
    console.log("실패  " + r.name);
    console.log("      " + r.error);
  }
}
console.log("");
console.log("전체 " + results.length + "개 중 통과 " + pass + "개, 실패 " + (results.length - pass) + "개");
process.exitCode = pass === results.length ? 0 : 1;
