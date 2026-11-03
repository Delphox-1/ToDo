(() => {
  "use strict";
  const key = globalThis.ToDoAccount?.storageKey || "haru-planner-v1",
    metaKey = key + ".cloud-base";
  let base = null,
    revision = 0,
    busy = false,
    timer = null,
    dirty = false;
  const cloud = { status: "서버 연결 중", ready: null, changed, sync };
  globalThis.HaruCloud = cloud;
  const empty = () => ({
      version: 1,
      tasks: [],
      projects: [],
      trash: [],
      notes: {},
    }),
    equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  function status(message) {
    cloud.status = message;
    window.dispatchEvent(new CustomEvent("todo:sync-status"));
  }
  function local() {
    const raw = localStorage.getItem(key);
    return raw ? HaruCore.validate(JSON.parse(raw)) : null;
  }
  function apply(state) {
    const next = JSON.stringify(HaruCore.validate(state)),
      old = localStorage.getItem(key);
    if (old !== next) {
      localStorage.setItem(key, next);
      window.dispatchEvent(
        new StorageEvent("storage", { key, oldValue: old, newValue: next }),
      );
    }
  }
  function remember(state, rev) {
    base = state;
    revision = rev;
    localStorage.setItem(metaKey, JSON.stringify({ state, revision: rev }));
  }
  async function request(method, body) {
    const r = await fetch("/api/planner", {
      method,
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(globalThis.ToDoAccount
          ? { "X-ToDo-Account": globalThis.ToDoAccount.userId }
          : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10000),
    });
    if (r.status === 409) return { conflict: true };
    if (!r.ok) throw Error(r.status === 401 ? "login" : "network");
    return r.json();
  }
  async function sync() {
    if (busy) return;
    busy = true;
    dirty = false;
    try {
      status("동기화 중");
      for (let attempt = 0; attempt < 4; attempt++) {
        const remote = await request("GET"),
          mine = local(),
          remoteState = remote.state ? HaruCore.validate(remote.state) : null;
        if (!mine && !remoteState) {
          remember(empty(), 0);
          status("서버 연결됨");
          return;
        }
        const mergeMine =
          revision === 0 && mine ? ToDoMerge.meaningful(mine) : mine;
        let merged;
        if ((!base || revision === 0) && remoteState) {
          merged = mergeMine
            ? ToDoMerge.merge(
                empty(),
                ToDoMerge.meaningful(mergeMine),
                remoteState,
              )
            : remoteState;
        } else
          merged = ToDoMerge.merge(
            base || empty(),
            mergeMine || empty(),
            remoteState || empty(),
          );
        if (remoteState && equal(merged, remoteState)) {
          remember(remoteState, remote.revision);
          apply(remoteState);
          status("모든 기기 동기화 완료");
          return;
        }
        const sent = HaruCore.validate(merged),
          result = await request("PUT", {
            state: sent,
            revision: remote.revision,
          });
        if (result.conflict) continue;
        // Retain edits made while the request was in flight.
        const latest = local() || empty(),
          after = ToDoMerge.merge(mine || empty(), latest, sent);
        remember(sent, result.revision);
        apply(after);
        if (!equal(after, sent)) {
          setTimeout(sync, 20);
          status("동기화 중");
        } else status("모든 기기 동기화 완료");
        return;
      }
      throw Error("conflict");
    } catch (error) {
      status(
        error.message === "login"
          ? "로그인 필요 · 기기에 임시 저장"
          : "연결 대기 · 기기에 임시 저장",
      );
    } finally {
      busy = false;
      if (dirty) {
        clearTimeout(timer);
        timer = setTimeout(sync, 350);
      }
    }
  }
  function changed() {
    dirty = true;
    clearTimeout(timer);
    status("동기화 중");
    timer = setTimeout(sync, 350);
  }
  try {
    const saved = localStorage.getItem(metaKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      base = HaruCore.validate(parsed.state);
      revision = parsed.revision || 0;
    }
  } catch {}
  // Existing records remain usable immediately, even with a slow/offline network.
  let hasLocal = false;
  try {
    hasLocal = !!localStorage.getItem(key);
  } catch {}
  const initialSync = sync();
  cloud.ready = hasLocal ? Promise.resolve() : initialSync;
  window.addEventListener("online", () => sync());
  window.addEventListener("focus", () => sync());
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) sync();
  });
  setInterval(() => {
    if (!document.hidden) sync();
  }, 10000);
})();
