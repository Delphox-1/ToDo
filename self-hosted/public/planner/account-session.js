(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ToDoSession = api;
})(globalThis, () => {
  const marker = "todo-active-account";
  const storageKey = (id) =>
    `haru-planner-v1.account.${encodeURIComponent(id)}`;
  function create(getStorage, listen) {
    function clear(id) {
      const storage = getStorage();
      for (const suffix of ["", ".cloud-base", ".recovery"])
        storage.removeItem(storageKey(id) + suffix);
    }
    return {
      announce(id, deleted = false) {
        try {
          if (deleted) clear(id);
          getStorage().setItem(
            marker,
            deleted ? "deleted:" + id + ":" + Date.now() : id,
          );
          return true;
        } catch {
          return false;
        }
      },
      signedOut() {
        try {
          getStorage().setItem(marker, "signed-out:" + Date.now());
        } catch {}
      },
      watch(id, changed) {
        listen("storage", (event) => {
          if (event.key !== marker || event.newValue === id) return;
          if (event.newValue?.startsWith("deleted:" + id + ":")) {
            try {
              clear(id);
            } catch {}
          }
          changed(event);
        });
      },
    };
  }
  return { storageKey, create };
});
