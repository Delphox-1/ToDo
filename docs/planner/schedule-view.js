// Shared by local, Pages, and self-hosted modes.
(function(root,factory){
  const api=factory();
  if(typeof module==='object' && module.exports) module.exports=api;
  else root.ToDoScheduleView=api;
})(globalThis,()=>{
  'use strict';
  function create({Core,ToDoI18n,esc,today,icon,priority,timeLabel,pTag}) {
  function missedChoices(t) {
    if (!Core.isMissed(t, today())) return "";
    return `<div class="missed-choices" role="group" aria-label="${esc(t.title)} ${ToDoI18n.t("지난 할 일 처리")}">${[
      ["failed", ToDoI18n.t("실패")],
      ["deferred", ToDoI18n.t("미뤄짐")],
    ].map(([value, label]) => `<label class="missed-choice ${t.missedOutcome === value ? "selected" : ""}"><input type="checkbox" data-missed-task="${esc(t.id)}" value="${value}" ${t.missedOutcome === value ? "checked" : ""}>${label}</label>`).join("")}</div>`;
  }
  const scheduledTitle = (t) => esc(t.title) + (Core.isFailed(t) ? ` (${ToDoI18n.t("실패")})` : "");
  const scheduledClass = (t) => t.status === "done" || Core.isFailed(t) ? "done" : "";
  function weekCard(t) {
    return `<div class="week-card ${scheduledClass(t)}" draggable="true" data-drag="${esc(t.id)}"><div class="card-top"><button class="check ${t.status === "done" ? "checked" : ""}" data-toggle="${esc(t.id)}" aria-label="${esc(t.title)} ${t.status === "done" ? ToDoI18n.t("완료 취소") : ToDoI18n.t("완료")}">${t.status === "done" ? icon("check") : ""}</button>${priority(t)}</div><button class="task-text" data-edit="${esc(t.id)}"><span class="task-title">${scheduledTitle(t)}</span><span class="task-meta">${t.time ? `<span>${timeLabel(t)}</span>` : ""}${t.status === "doing" ? ToDoI18n.t("<span>진행 중</span>") : ""}</span><span class="task-meta">${pTag(t)}</span></button>${missedChoices(t)}</div>`;
  }
    return {missedChoices,scheduledTitle,scheduledClass,weekCard};
  }
  return {create};
});
