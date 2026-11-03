(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ToDoAccountRules = api;
})(globalThis, () => {
  const messages = {
    username: "아이디는 한글·영어·일본어·한자·숫자 1~20자로 입력해 주세요.",
    password:
      "비밀번호는 영문·숫자·특수문자를 모두 포함한 10~64자로 입력해 주세요. 이모티콘과 공백은 사용할 수 없습니다.",
    name: "이름은 문자로 1~30자 입력해 주세요. 이모티콘과 공백은 사용할 수 없습니다.",
  };
  const normalizeUsername = (value) => value.normalize("NFC").toLowerCase();
  function validUsername(value) {
    if (typeof value !== "string") return false;
    const normalized = normalizeUsername(value);
    return (
      /^[A-Za-z0-9\p{Script_Extensions=Hangul}\p{Script_Extensions=Hiragana}\p{Script_Extensions=Katakana}\p{Script_Extensions=Han}]{1,20}$/u.test(
        normalized,
      ) &&
      /^[\p{L}\p{M}0-9]+$/u.test(normalized) &&
      !/[\p{Extended_Pictographic}\p{Regional_Indicator}\p{Default_Ignorable_Code_Point}\u20e3]/u.test(
        normalized,
      )
    );
  }
  function validate(data) {
    if (!validUsername(data.username))
      return { field: "username", message: messages.username };
    if (
      typeof data.password !== "string" ||
      !/^[\x21-\x7e]{10,64}$/.test(data.password) ||
      !/[A-Za-z]/.test(data.password) ||
      !/[0-9]/.test(data.password) ||
      !/[^A-Za-z0-9]/.test(data.password)
    )
      return { field: "password", message: messages.password };
    if (
      typeof data.name !== "string" ||
      !/^[\p{L}\p{M}]{1,30}$/u.test(data.name) ||
      !data.name.trim()
    )
      return { field: "name", message: messages.name };
    return null;
  }
  function validateSignup(data) {
    const error = validate(data);
    if (error) return error;
    if (
      typeof data.passwordConfirm !== "string" ||
      data.passwordConfirm !== data.password
    )
      return {
        field: "passwordConfirm",
        message: "비밀번호가 일치하지 않습니다. 다시 입력해 주세요.",
      };
    return null;
  }
  return {
    validate,
    validateSignup,
    validUsername,
    normalizeUsername,
    messages,
  };
});
