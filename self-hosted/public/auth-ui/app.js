(() => {
  const $ = (s) => document.querySelector(s);
  if (new URLSearchParams(location.search).get("deleted") === "1")
    $(".intro").textContent =
      ToDoI18n.t("회원탈퇴가 완료됐습니다. 이 계정의 내용이 삭제됐습니다.");
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
    busy = false,
    googleEnabled = false,
    retryUntil = 0;
  const coolingDown = () => Date.now() < retryUntil;
  function updateActions() {
    const disabled = busy || coolingDown();
    $("#submit-button").disabled = disabled;
    $("#google-login").disabled = disabled || !googleEnabled;
  }
  function waitBeforeRetry(response) {
    const requested = Number(response.headers?.get("X-Retry-After") || response.headers?.get("Retry-After"));
    const seconds = Number.isFinite(requested) && requested > 0 ? Math.min(Math.ceil(requested), 300) : 60;
    retryUntil = Date.now() + seconds * 1000;
    updateActions();
    setTimeout(updateActions, seconds * 1000 + 50);
    return ToDoI18n.language === 'ja'
      ? `リクエストが集中しています。約${seconds}秒後にもう一度お試しください。`
      : `요청이 많습니다. 약 ${seconds}초 후 다시 시도해 주세요.`;
  }
  function mode(value) {
    if (busy) return;
    signup = value;
    $("#form-title").textContent = signup ? ToDoI18n.t("회원가입") : ToDoI18n.t("로그인");
    $("#submit-button").textContent = signup ? ToDoI18n.t("가입하기") : ToDoI18n.t("로그인");
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
    $("#show-password").textContent = p.type === "password" ? ToDoI18n.t("보기") : ToDoI18n.t("숨기기");
    $("#show-password").setAttribute(
      "aria-label",
      p.type === "password" ? ToDoI18n.t("비밀번호 표시") : ToDoI18n.t("비밀번호 숨기기"),
    );
  };
  const messages = {
    USER_ALREADY_EXISTS: ToDoI18n.t("이미 사용 중인 아이디입니다."),
    USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: ToDoI18n.t("이미 사용 중인 아이디입니다."),
    USERNAME_IS_ALREADY_TAKEN: ToDoI18n.t("이미 사용 중인 아이디입니다."),
    INVALID_USERNAME_OR_PASSWORD: ToDoI18n.t("아이디 또는 비밀번호를 확인해 주세요."),
    INVALID_EMAIL_OR_PASSWORD: ToDoI18n.t("아이디 또는 비밀번호를 확인해 주세요."),
    INVALID_ORIGIN: ToDoI18n.t("사이트 주소를 확인하고 화면을 새로고침해 주세요."),
  };
  async function request(path, body) {
    const r = await fetch("/api/auth/" + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body),
    });
    let data;
    try { data = await r.json(); }
    catch { throw Error(ToDoI18n.t("서버 응답을 읽지 못했습니다. 잠시 후 다시 시도해 주세요.")); }
    if (!r.ok)
      throw Error(
        r.status === 429
          ? waitBeforeRetry(r)
          : messages[data.code] || ToDoI18n.t("입력한 내용을 확인하고 다시 시도해 주세요."),
      );
    return data;
  }
  $("#account-form").onsubmit = async (event) => {
    event.preventDefault();
    if (busy || coolingDown()) return;
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
            message: ToDoI18n.t("아이디와 비밀번호를 입력해 주세요."),
          }
        : null;
    if (error) {
      $("#form-error").textContent = ToDoI18n.t(error.message);
      $("#" + error.field).setAttribute("aria-invalid", "true");
      $("#" + error.field).focus();
      return;
    }
    busy = true;
    updateActions();
    try {
      await request(signup ? "sign-up/email" : "sign-in/username", data);
      location.replace("/");
    } catch (error) {
      $("#form-error").textContent = ToDoI18n.t(error.message);
    } finally {
      busy = false;
      updateActions();
    }
  };
  $("#google-login").onclick = async () => {
    if (busy || coolingDown()) return;
    busy = true;
    updateActions();
    try {
      const data = await request("sign-in/social", {
        provider: "google",
        callbackURL: location.origin + "/",
      });
      if (!data.url) throw Error("Google 로그인 주소를 불러오지 못했습니다.");
      const url = new URL(data.url);
      if (url.protocol !== 'https:' || url.hostname !== 'accounts.google.com')
        throw Error(ToDoI18n.t("Google 연결 주소를 확인하지 못했습니다."));
      location.assign(url.href);
    } catch (error) {
      $("#form-error").textContent = ToDoI18n.t(error.message);
      busy = false;
      updateActions();
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
        googleEnabled = !!data.googleEnabled;
        updateActions();
        $("#google-status").textContent = data.googleEnabled
          ? ""
          : ToDoI18n.t("Google 로그인은 연결 설정 후 사용할 수 있습니다.");
      })
      .catch(() => {
        $("#google-status").textContent =
          ToDoI18n.t("연결 상태를 확인한 뒤 다시 열어 주세요.");
      });
  }
  checkSession();
  window.addEventListener("pageshow", event => {
    if (event.persisted) checkSession();
  });
})();
