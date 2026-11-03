(() => {
  "use strict";
  const dialog = document.querySelector("#install-dialog"),
    launchers = [...document.querySelectorAll('[data-action="install"]')];
  const standalone = () =>
    matchMedia("(display-mode: standalone)").matches ||
    navigator.standalone === true;
  let prompt = null;
  function refresh() {
    for (const button of launchers) button.hidden = standalone();
  }
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    prompt = event;
  });
  window.addEventListener("appinstalled", () => {
    prompt = null;
    dialog.close();
    refresh();
  });
  matchMedia("(display-mode: standalone)").addEventListener?.(
    "change",
    refresh,
  );
  document.addEventListener("click", async (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.hasAttribute("data-install-close")) {
      dialog.close();
      return;
    }
    if (button.dataset.action === "install") {
      if (prompt) {
        const installPrompt = prompt;
        prompt = null;
        try {
          await installPrompt.prompt();
          await installPrompt.userChoice;
        } catch {}
        refresh();
        return;
      }
      document.querySelector("#install-copy-status").textContent = "";
      document.querySelector("#install-link").value = location.origin + "/";
      dialog.showModal();
    }
    if (button.id === "copy-install-link") {
      const status = document.querySelector("#install-copy-status"),
        input = document.querySelector("#install-link");
      try {
        await navigator.clipboard.writeText(input.value);
        status.textContent = "링크를 복사했습니다.";
      } catch {
        input.focus();
        input.select();
        status.textContent = "위 링크를 길게 눌러 복사해 주세요.";
      }
    }
  });
  refresh();
})();
