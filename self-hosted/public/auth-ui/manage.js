(async () => {
  const $ = (s) => document.querySelector(s);
  let user,
    busy = false;
  try {
    const r = await fetch("/api/account/me", { cache: "no-store" });
    if (!r.ok) throw Error();
    const data = await r.json();
    user = data.user;
    if (!user) {
      location.replace("/login");
      return;
    }
    $("#account-name").textContent = user.name;
    if (user.source !== "account") {
      $("#delete-form").hidden = true;
      $("#logout").hidden = true;
      $("#form-error").textContent =
        ToDoI18n.t("새로 가입한 ToDo 계정에서 사용할 수 있습니다.");
      return;
    }
    $("#google-section").hidden = false;
    const canLink =
      data.googleEnabled && data.passwordRequired && !data.googleLinked;
    $("#google-link-form").hidden = !canLink;
    $("#google-link-status").textContent = data.googleLinked
      ? ToDoI18n.t("Google 계정이 연결돼 있습니다. 두 로그인 방식으로 같은 기록을 사용할 수 있습니다.")
      : !data.googleEnabled
        ? ToDoI18n.t("Google 로그인 설정을 확인해 주세요.")
        : data.passwordRequired
          ? ToDoI18n.t("아직 Google 계정이 연결되지 않았습니다.")
          : ToDoI18n.t("Google로 로그인한 계정입니다.");
    const params = new URLSearchParams(location.search);
    if (params.get("google") === "error" || params.has("error"))
      $("#google-link-error").textContent =
        ToDoI18n.t("Google 계정을 연결하지 못했습니다. 다른 ToDo 계정에 이미 연결된 Google 계정은 연결할 수 없습니다. 기존 기록은 변경되지 않았습니다.");
    $("#password-field").hidden = !data.passwordRequired;
    $("#password").required = data.passwordRequired;
  } catch {
    $("#form-error").textContent = ToDoI18n.t("계정 정보를 불러오지 못했습니다.");
    return;
  }
  const sessions = ToDoSession.create(
    () => localStorage,
    (type, listener) => window.addEventListener(type, listener),
  );
  sessions.watch(user.userId, (event) => {
    if (
      event?.newValue?.startsWith("signed-out:") ||
      event?.newValue?.startsWith("deleted:" + user.userId + ":")
    )
      location.replace("/login");
    else location.reload();
  });
  function clearAccount(remove = false) {
    if (remove) sessions.announce(user.userId, true);
    else sessions.signedOut();
  }
  $("#google-link-form").onsubmit = async (event) => {
    event.preventDefault();
    if (busy) return;
    busy = true;
    const button = event.submitter || $("#google-link-form button");
    button.disabled = true;
    $("#google-link-error").textContent = "";
    try {
      const r = await fetch("/api/account/google/link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ToDo-Account": user.userId,
        },
        body: JSON.stringify({ password: $("#google-link-password").value }),
      });
      const data = await r.json();
      if (!r.ok)
        throw Error(data.message || ToDoI18n.t("Google 연결을 시작하지 못했습니다."));
      if (!data.url) throw Error("Google 연결 주소를 불러오지 못했습니다.");
      const url = new URL(data.url);
      if (url.protocol !== "https:" || url.hostname !== "accounts.google.com")
        throw Error("Google 연결 주소를 확인하지 못했습니다.");
      $("#google-link-password").value = "";
      location.assign(url.href);
    } catch (error) {
      $("#google-link-error").textContent = ToDoI18n.t(error.message);
      button.disabled = false;
      busy = false;
    }
  };
  $("#logout").onclick = async () => {
    if (busy) return;
    busy = true;
    try {
      const r = await fetch("/api/account/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ToDo-Account": user.userId,
        },
        body: "{}",
      });
      if (!r.ok) throw Error();
      clearAccount();
      location.replace("/login");
    } catch {
      $("#form-error").textContent =
        ToDoI18n.t("로그아웃하지 못했습니다. 다시 시도해 주세요.");
      busy = false;
    }
  };
  $("#delete-form").onsubmit = async (event) => {
    event.preventDefault();
    if (busy) return;
    const confirmation = $("#confirmation").value;
    if (confirmation !== "회원탈퇴") {
      $("#form-error").textContent = ToDoI18n.t("회원탈퇴를 정확히 입력해 주세요.");
      return;
    }
    busy = true;
    const button = event.submitter || $('#delete-form button[type="submit"]');
    button.disabled = true;
    try {
      const r = await fetch("/api/account/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ToDo-Account": user.userId,
        },
        body: JSON.stringify({ confirmation, password: $("#password").value }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.message || ToDoI18n.t("탈퇴하지 못했습니다."));
      clearAccount(true);
      location.replace("/login?deleted=1");
    } catch (error) {
      $("#form-error").textContent = ToDoI18n.t(error.message);
      busy = false;
      button.disabled = false;
    }
  };
})();
