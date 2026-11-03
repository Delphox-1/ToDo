(() => {
  const $ = (s) => document.querySelector(s);
  if (new URLSearchParams(location.search).get("deleted") === "1")
    $(".intro").textContent =
      "회원탈퇴가 완료됐습니다. 이 계정의 내용이 삭제됐습니다.";
  // Keyboard, paste, autofill and mobile/IME input all use the same rule.
  const fields = ['username', 'password', 'passwordConfirm', 'name'].map(id => $('#' + id));
  function removeSpaces(input) {
    const value = input.value;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const clean = value.replace(/\s/gu, '');
    if (value === clean) return;
    input.value = clean;
    if (start !== null && end !== null)
      input.setSelectionRange(value.slice(0, start).replace(/\s/gu, '').length,
        value.slice(0, end).replace(/\s/gu, '').length);
  }
  fields.forEach(input => {
    input.addEventListener('keydown', event => {
      if (event.key === ' ' && !event.isComposing) event.preventDefault();
    });
    input.addEventListener('beforeinput', event => {
      if (!event.isComposing && event.data && /^\s+$/u.test(event.data)) event.preventDefault();
    });
    input.addEventListener('input', event => {
      if (!event.isComposing) removeSpaces(input);
    });
    input.addEventListener('compositionend', () => removeSpaces(input));
  });
  let signup = false,
    busy = false;
  function mode(value) {
    if (busy) return;
    signup = value;
    $("#form-title").textContent = signup ? "회원가입" : "로그인";
    $("#submit-button").textContent = signup ? "가입하기" : "로그인";
    $("#login-tab").setAttribute("aria-pressed", String(!signup));
    $("#signup-tab").setAttribute("aria-pressed", String(signup));
    $("#name-field").hidden = !signup;
    $("#name").required = signup;
    $("#password-confirm-field").hidden = !signup;
    $("#passwordConfirm").required = signup;
    $("#passwordConfirm").disabled = !signup;
    $("#passwordConfirm").value = "";
    $("#password-help").hidden = !signup;
    $("#recovery-note").hidden = !signup;
    $("#password").autocomplete = signup ? "new-password" : "current-password";
    $("#form-error").textContent = "";
    document
      .querySelectorAll("[aria-invalid]")
      .forEach((input) => input.removeAttribute("aria-invalid"));
  }
  $("#passwordConfirm").disabled = true;
  $("#login-tab").onclick = () => mode(false);
  $("#signup-tab").onclick = () => mode(true);
  $("#show-password").onclick = () => {
    const p = $("#password");
    p.type = p.type === "password" ? "text" : "password";
    $("#show-password").textContent = p.type === "password" ? "보기" : "숨기기";
    $("#show-password").setAttribute(
      "aria-label",
      p.type === "password" ? "비밀번호 표시" : "비밀번호 숨기기",
    );
  };
  const messages = {
    USER_ALREADY_EXISTS: "이미 사용 중인 아이디입니다.",
    USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "이미 사용 중인 아이디입니다.",
    USERNAME_IS_ALREADY_TAKEN: "이미 사용 중인 아이디입니다.",
    INVALID_USERNAME_OR_PASSWORD: "아이디 또는 비밀번호를 확인해 주세요.",
    INVALID_EMAIL_OR_PASSWORD: "아이디 또는 비밀번호를 확인해 주세요.",
  };
  async function request(path, body) {
    const r = await fetch("/api/auth/" + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (!r.ok)
      throw Error(
        r.status === 429
          ? "요청이 많습니다. 잠시 후 다시 시도해 주세요."
          : messages[data.code] || "입력한 내용을 확인하고 다시 시도해 주세요.",
      );
    return data;
  }
  $("#account-form").onsubmit = async (event) => {
    event.preventDefault();
    if (busy) return;
    fields.forEach(removeSpaces);
    const data = {
      rememberMe: true,
      username: ToDoAccountRules.normalizeUsername($("#username").value.trim()),
      password: $("#password").value,
      passwordConfirm: $("#passwordConfirm").value,
      name: $("#name").value.trim(),
      email: "signup@accounts.todo.invalid",
    };
    $("#form-error").textContent = "";
    document
      .querySelectorAll("[aria-invalid]")
      .forEach((x) => x.removeAttribute("aria-invalid"));
    const error = signup
      ? ToDoAccountRules.validateSignup(data)
      : !data.username || !data.password
        ? {
            field: !data.username ? "username" : "password",
            message: "아이디와 비밀번호를 입력해 주세요.",
          }
        : null;
    if (error) {
      $("#form-error").textContent = error.message;
      $("#" + error.field).setAttribute("aria-invalid", "true");
      $("#" + error.field).focus();
      return;
    }
    busy = true;
    $("#submit-button").disabled = true;
    try {
      await request(signup ? "sign-up/email" : "sign-in/username", data);
      location.replace("/");
    } catch (error) {
      $("#form-error").textContent = error.message;
    } finally {
      busy = false;
      $("#submit-button").disabled = false;
    }
  };
  $("#google-login").onclick = async () => {
    if (busy) return;
    busy = true;
    try {
      const data = await request("sign-in/social", {
        provider: "google",
        callbackURL: location.origin + "/",
      });
      if (!data.url) throw Error("Google 로그인 주소를 불러오지 못했습니다.");
      location.assign(data.url);
    } catch (error) {
      $("#form-error").textContent = error.message;
      busy = false;
    }
  };
  function checkSession() {
    return fetch("/api/account/me", { cache: "no-store", credentials: "same-origin" })
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((data) => {
        if (data.user) {
          location.replace("/");
          return;
        }
        $("#google-login").disabled = !data.googleEnabled;
        $("#google-status").textContent = data.googleEnabled
          ? ""
          : "Google 로그인은 연결 설정 후 사용할 수 있습니다.";
      })
      .catch(() => {
        $("#google-status").textContent =
          "연결 상태를 확인한 뒤 다시 열어 주세요.";
      });
  }
  checkSession();
  window.addEventListener("pageshow", event => {
    if (event.persisted) checkSession();
  });
})();
