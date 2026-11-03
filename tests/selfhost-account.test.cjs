const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  rules = require("./helpers/rules.cjs");
const valid = {
  username: "todouser",
  password: "TodoStrong!123",
  name: "홍길동",
};
test("three-field signup accepts a valid account", () =>
  assert.equal(rules.validate(valid), null));
for (const field of ["username", "password", "name"])
  test("signup rejects emoji in " + field, () =>
    assert.equal(
      rules.validate({ ...valid, [field]: valid[field] + "😀" }).field,
      field,
    ),
  );
test("signup rejects emoji keycaps and invisible password characters", () => {
  for (const password of ["TodoStrong!1️⃣", "TodoStrong!1\u200d"])
    assert.equal(rules.validate({ ...valid, password }).field, "password");
});
test("signup enforces lengths and password character classes", () => {
  for (const password of [
    "short!1",
    "onlyletterslong",
    "12345678901",
    "A".repeat(65) + "!1",
  ])
    assert.equal(rules.validate({ ...valid, password }).field, "password");
  assert.equal(rules.validate({ ...valid, username: "" }).field, "username");
  assert.equal(rules.validate({ ...valid, name: "   " }).field, "name");
});

test("signup requires matching confirmation and rejects missing or different confirmation", () => {
  assert.equal(
    rules.validateSignup({ ...valid, passwordConfirm: valid.password }),
    null,
  );
  for (const passwordConfirm of [
    undefined,
    "",
    "Another!12345",
    valid.password + " ",
  ])
    assert.equal(
      rules.validateSignup({ ...valid, passwordConfirm }).field,
      "passwordConfirm",
    );
});

test("multilingual IDs accept Korean, English, Japanese, Han and mixed scripts", () => {
  for (const username of [
    "한글아이디",
    "EnglishUser",
    "ひらがなです",
    "カタカナです",
    "漢字使用者",
    "한글abc日本語1",
  ])
    assert.equal(rules.validate({ ...valid, username }), null, username);
});
test("multilingual IDs reject emoji, spaces, invisible fillers and unrelated scripts", () => {
  for (const username of [
    "아이디😀abc",
    "아이디 abc",
    "아이디1️⃣ab",
    "abc한글\u3164",
    "abc한글\u200d",
    "abc〰️",
    "abcПривет",
  ])
    assert.equal(rules.validUsername(username), false, username);
});
test("username normalization makes casing and decomposed Hangul equivalent", () => {
  assert.equal(rules.normalizeUsername("EnglishUser"), "englishuser");
  assert.equal(
    rules.normalizeUsername("한글아이디".normalize("NFD")),
    "한글아이디",
  );
});

test("single-character Korean, English, Japanese, Han and numeric IDs are allowed", () => {
  for (const username of ["가", "A", "あ", "ア", "田", "1"])
    assert.equal(rules.validate({ ...valid, username }), null, username);
});
test("IDs reject underscores and hyphens anywhere, and retain the 20-character maximum", () => {
  for (const username of [
    "_",
    "-",
    "ab_cd",
    "ab-cd",
    "가_나",
    "た-な",
    "a".repeat(21),
    "",
  ])
    assert.equal(rules.validUsername(username), false, username);
  assert.equal(rules.validUsername("가".repeat(20)), true);
});

test("signup rejects whitespace in every account field", () => {
  for (const field of ['username', 'password', 'name'])
    for (const space of [' ', '\t', '\n', '\u00a0', '\u3000'])
      assert.equal(rules.validate({ ...valid, [field]: valid[field] + space }).field, field);
});
