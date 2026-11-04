// Shared by local, Pages, and self-hosted modes.
(function(root,factory){
  const api=factory();
  if(typeof module==='object' && module.exports) module.exports=api;
  else root.ToDoDateTools=api;
})(globalThis,()=>{
  'use strict';
  function create(ToDoI18n) {
    const dayNames=['일','월','화','수','목','금','토'].map(x=>ToDoI18n.t(x));
  const dateKey = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const parseDate = (s) => new Date(s + "T12:00:00"),
    addDays = (s, n) => {
      let d = parseDate(s);
      d.setDate(d.getDate() + n);
      return dateKey(d);
    },
    today = () => dateKey(new Date());
  const weekStart = (s) => {
    let d = parseDate(s);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return dateKey(d);
  };
  const friendly = (s) => {
    if (!s) return ToDoI18n.t("날짜 미정");
    let d = parseDate(s);
    return `${d.getMonth() + 1}${ToDoI18n.language === "ja" ? "/" : "."}${d.getDate()} (${dayNames[d.getDay()]})`;
  };
    return {dayNames,dateKey,parseDate,addDays,today,weekStart,friendly};
  }
  return {create};
});
