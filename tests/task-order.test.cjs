const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const modes = ["public/planner/", "self-hosted/public/planner/", "docs/planner/"];
const task = (id, patch = {}) => ({
  id, title: id, date: "2026-11-05", time: "", priority: "medium",
  status: "todo", repeat: "none", project: "", notes: "", star: false, ...patch,
});
const examples = () => [
  task("DSA", { time: "09:00" }), task("Speaking", { time: "20:00" }),
  task("Interview", { priority: "high" }), task("Duolingo"),
];
const ids = (tasks) => Array.from(tasks, (t) => t.id);

function sorter(root, mode = "date") {
  const app = fs.readFileSync(root + "app.js", "utf8");
  const scope = vm.createContext({ sortMode: mode });
  vm.runInContext(app.slice(app.indexOf("  const priorityRank ="), app.indexOf("  function taskRow")), scope);
  return vm.runInContext("sortTasks", scope);
}

for (const root of modes) {
  test(root + " promotes untimed high tasks without mutating input", () => {
    const tasks = examples(), sorted = sorter(root)(tasks);
    assert.deepEqual(ids(sorted), ["Interview", "DSA", "Speaking", "Duolingo"]);
    assert.deepEqual(ids(tasks), ["DSA", "Speaking", "Interview", "Duolingo"]);
    assert.equal(sorted[0], tasks[2]);
  });

  test(root + " preserves midnight, date order, ties and completed grouping", () => {
    const tasks = [task("done", { priority: "high", status: "done" }),
      task("tomorrow", { date: "2026-11-06", priority: "high" }),
      task("midnight", { time: "00:00", priority: "high" }),
      task("first", { priority: "high" }), task("second", { priority: "high", status: "doing" }),
      task("undated", { date: "", priority: "high" })];
    assert.deepEqual(ids(sorter(root)(tasks)), ["first", "second", "midnight", "tomorrow", "undated", "done"]);
  });

  test(root + " retains priority mode and responds to time and priority edits", () => {
    const tasks = [...examples(), task("timedHigh", { priority: "high", time: "08:00" }),
      task("low", { priority: "low", time: "07:00" })];
    assert.deepEqual(ids(sorter(root, "priority")(tasks)),
      ["Interview", "timedHigh", "DSA", "Speaking", "Duolingo", "low"]);
    tasks[2].time = "21:00";
    assert.deepEqual(ids(sorter(root)(tasks)), ["low", "timedHigh", "DSA", "Speaking", "Interview", "Duolingo"]);
    tasks[2].time = ""; tasks[2].priority = "low";
    assert.equal(sorter(root)(tasks).at(-1).id, "Interview");
  });
}

function renderFixture(compact = false) {
  const app = fs.readFileSync("public/planner/app.js", "utf8");
  const main = { innerHTML: "" }, Core = require("../lib/planner-core.cjs");
  const ToDoI18n = require("./helpers/locale.cjs").create("ko");
  const scope = vm.createContext({
    Core, ToDoI18n, state: { tasks: examples(), projects: [], notes: {} },
    sortMode: "date", filter: "all", query: "", projectFilter: "",
    week: "2026-11-02", month: "2026-11", selectedDate: null,
    today: () => "2026-11-05", weekStart: () => "2026-11-02",
    parseDate: (s) => new Date(s + "T12:00:00"), addDays: Core.addDays,
    dayNames: ["일", "월", "화", "수", "목", "금", "토"],
    $: () => main, matches: () => true, heading: () => "", stats: () => "",
    projectSelector: () => "", filters: () => "", empty: () => "", addRow: () => "",
    rangeToolbar: () => "", friendly: (s) => s, esc: String,
    icon: () => "", priority: () => "", pTag: () => "", repeatLabel: () => "",
    timeLabel: (t) => t.time, deadlineLabel: () => "", matchMedia: () => ({ matches: compact }),
    calendarCountry: "KR", holidayData: { KR: { 2026: [] } },
    holidayRequests: new Map(), loadHolidayYear: () => {},
  });
  vm.runInContext(fs.readFileSync("public/planner/schedule-view.js", "utf8"), scope);
  vm.runInContext("const {scheduledTitle,scheduledClass,weekCard}=ToDoScheduleView.create({Core,ToDoI18n,esc,icon,priority,timeLabel,pTag,today})", scope);
  for (const [start, end] of [
    ["  const priorityRank =", "  const empty ="],
    ["  function renderToday()", "  function rangeToolbar"],
    ["  function renderWeek()", "  let calendarCountry"],
    ["  function renderCalendar()", "  function dayDetail"],
  ]) vm.runInContext(app.slice(app.indexOf(start), app.indexOf(end)), scope);
  return (name) => { vm.runInContext(name + "()", scope); return main.innerHTML; };
}

test("today, weekly overview and weekly cards show the untimed high task first", () => {
  const render = renderFixture(), html = render("renderToday");
  assert.deepEqual([...html.matchAll(/class="task-title">([^<]+)/g)].map((m) => m[1]),
    ["Interview", "DSA", "Speaking", "Duolingo"]);
  const overview = html.match(/data-date-view="2026-11-05">([\s\S]*?)<\/button>/)[1];
  assert.deepEqual([...overview.matchAll(/class="strip-task [^"]*">([^<]+)/g)].map((m) => m[1]),
    ["Interview", "DSA", "Speaking", "Duolingo"]);
  assert.deepEqual([...render("renderWeek").matchAll(/data-drag="([^"]+)"/g)].map((m) => m[1]),
    ["Interview", "DSA", "Speaking", "Duolingo"]);
});

for (const compact of [false, true]) test(`calendar orders before ${compact ? "mobile" : "desktop"} clipping`, () => {
  const html = renderFixture(compact)("renderCalendar");
  assert.deepEqual([...html.matchAll(/data-task-detail="([^"]+)"/g)].map((m) => m[1]),
    compact ? ["Interview", "DSA"] : ["Interview", "DSA", "Speaking"]);
  assert.match(html, /calendar-event priority-high/);
});
