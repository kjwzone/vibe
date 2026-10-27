// 아주 작은 테스트 도구. 브라우저(test.html)와 node(tests/run-tests.js) 양쪽에서 같이 쓴다.
// 이 파일은 고치지 않는다.
var TESTS = [];

function test(name, fn) {
  TESTS.push({ name: name, fn: fn });
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error((message || "값이 다름") + " · 기대: " + JSON.stringify(expected) + " · 실제: " + JSON.stringify(actual));
  }
}

function assertDeepEqual(actual, expected, message) {
  var a = JSON.stringify(actual);
  var e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error((message || "내용이 다름") + " · 기대: " + e + " · 실제: " + a);
  }
}

function runTests() {
  return TESTS.map(function (t) {
    try {
      t.fn();
      return { name: t.name, ok: true };
    } catch (err) {
      return { name: t.name, ok: false, error: err.message };
    }
  });
}
