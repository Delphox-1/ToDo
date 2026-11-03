(async () => {
  try {
    const response = await fetch("/api/account/me", {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!response.ok) throw Error("계정 정보를 불러오지 못했습니다.");
    const { user } = await response.json();
    if (!user) {
      location.replace("/login");
      return;
    }
    globalThis.ToDoAccount = {
      ...user,
      storageKey: ToDoSession.storageKey(user.userId),
    };
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
    sessions.announce(user.userId);
    for (const file of ["holidays", "core", "merge", "cloud", "app", "install"])
      await new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = `/planner/${file}.js`;
        s.onload = resolve;
        s.onerror = reject;
        document.body.append(s);
      });
    const actions = document.createElement("div");
    actions.className = "account-actions";
    const button = document.createElement("button");
    button.className = "secondary account-button";
    button.textContent = `${user.username || user.name} 님`;
    button.title = "계정 관리";
    button.onclick = () => location.assign("/account");
    const logout = document.createElement("button");
    logout.className = "secondary logout-button";
    logout.textContent = "로그아웃";
    logout.onclick = async () => {
      logout.disabled = true;
      try {
        const r = await fetch("/api/account/logout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-ToDo-Account": user.userId,
          },
          body: "{}",
        });
        if (r.status === 409) {
          location.reload();
          return;
        }
        if (!r.ok && r.status !== 401) throw Error();
        sessions.signedOut();
        location.replace("/login");
      } catch {
        logout.disabled = false;
        logout.textContent = "로그아웃 재시도";
      }
    };
    actions.append(button, logout);
    document.querySelector(".topbar-actions").prepend(actions);
  } catch {
    const main = document.querySelector("#main");
    main.replaceChildren();
    const p = document.createElement("p");
    p.textContent =
      "연결을 확인한 뒤 다시 열어 주세요. 저장된 기록은 기기에 유지됩니다.";
    main.append(p);
    const b = document.createElement("button");
    b.className = "primary";
    b.textContent = "다시 시도";
    b.onclick = () => location.reload();
    main.append(b);
  }
})();
