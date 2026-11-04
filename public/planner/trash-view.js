// Trash rendering and selection live here; persistence stays in the planner core.
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ToDoTrashView = api;
})(globalThis, () => {
  function create({ document, i18n, esc, heading, empty }) {
    const selected = new Set();
    function row(item) {
      return i18n.html`<div class="task-row">
        <label class="trash-select">
          <input type="checkbox" data-trash-select="${esc(item.id)}"
            ${selected.has(item.id) ? "checked" : ""}
            aria-label="${esc(item.label)} ${i18n.t("선택")}">
        </label>
        <div class="task-text">
          <span class="task-title">${esc(item.label)}</span>
          <span class="task-meta">${new Date(item.deletedAt).toLocaleDateString(i18n.locale)} · 할 일 ${item.tasks.length}개${item.projects.length ? i18n.html` · 프로젝트 ${item.projects.length}개` : ""}</span>
        </div>
        <button class="secondary" data-restore="${esc(item.id)}">복원</button>
      </div>`;
    }
    function render(state, query = "") {
      const search = query.toLowerCase();
      const items = [...state.trash].reverse().filter((x) => x.label.toLowerCase().includes(search));
      const visibleIds = new Set(items.map((x) => x.id));
      for (const id of selected) if (!visibleIds.has(id)) selected.delete(id);
      const count = selected.size;
      const disabled = count ? "" : "disabled";
      document.querySelector("#main").innerHTML = heading(i18n.t("휴지통")) + i18n.html`
        <section class="panel list-panel">
          <div class="panel-heading"><h2>삭제한 항목<span>${items.length}개</span></h2></div>
          <p class="trash-retention">휴지통에 들어간 항목은 30일 후 자동으로 영구 삭제됩니다.</p>
          <div class="trash-toolbar">
            <label class="trash-select">
              <input type="checkbox" id="trash-select-all"
                ${items.length && count === items.length ? "checked" : ""}
                ${items.length ? "" : "disabled"}>전체 선택
            </label>
            <span class="trash-selection-count">${count}${i18n.t("개 선택")}</span>
            <div class="trash-actions">
              <button class="secondary" data-action="restore-selected" ${disabled}>선택 복원</button>
              <button class="secondary trash-danger" data-action="delete-selected-trash" ${disabled}>선택 영구 삭제</button>
              <button class="secondary trash-danger" data-action="empty-trash" ${state.trash.length ? "" : "disabled"}>휴지통 비우기</button>
            </div>
          </div>
          ${items.map(row).join("") || empty(i18n.t("삭제한 항목이 없습니다."))}
        </section>`;
      document.querySelector("#trash-select-all").indeterminate = count > 0 && count < items.length;
    }
    return { selected, render };
  }
  return { create };
});
