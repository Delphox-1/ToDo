(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.HaruCore = api;
})(globalThis, () => {
  "use strict";
  const copy = (v) => JSON.parse(JSON.stringify(v));
  const dateKey = (d) =>
    `${String(d.getFullYear()).padStart(4, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const validDate = (s) =>
    typeof s === "string" &&
    (s === "" ||
      (/^\d{4}-\d{2}-\d{2}$/.test(s) &&
        Number.isFinite(+new Date(s + "T12:00:00")) &&
        dateKey(new Date(s + "T12:00:00")) === s));
  const addDays = (s, n) => {
    const d = new Date(s + "T12:00:00");
    d.setDate(d.getDate() + n);
    return dateKey(d);
  };
  function validate(data) {
    if (
      !data ||
      data.version !== 1 ||
      !Array.isArray(data.tasks) ||
      !Array.isArray(data.projects) ||
      !data.notes ||
      typeof data.notes !== "object" ||
      Array.isArray(data.notes)
    )
      throw Error("올바른 하루 백업 파일이 아닙니다.");
    if (data.tasks.length > 20000 || data.projects.length > 1000)
      throw Error("백업 파일의 항목이 너무 많습니다.");
    const d = copy(data),
      ids = new Set(),
      tids = new Set();
    const checkProject = (p) => {
      if (
        !p ||
        typeof p.id !== "string" ||
        !p.id ||
        typeof p.name !== "string" ||
        !p.name.trim() ||
        p.name.length > 200 ||
        !/^#[0-9a-f]{6}$/i.test(p.color)
      )
        throw Error("프로젝트 데이터가 올바르지 않습니다.");
    };
    const checkTask = (t) => {
      if (
        !t ||
        typeof t.id !== "string" ||
        !t.id ||
        typeof t.title !== "string" ||
        !t.title.trim() ||
        t.title.length > 1000 ||
        !validDate(t.date) ||
        !["todo", "doing", "done"].includes(t.status) ||
        !["high", "medium", "low"].includes(t.priority) ||
        !["none", "daily", "weekly", "monthly", "yearly"].includes(t.repeat) ||
        typeof t.project !== "string" ||
        typeof t.notes !== "string" ||
        t.notes.length > 100000 ||
        typeof t.star !== "boolean" ||
        typeof t.time !== "string" ||
        !(/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(t.time) || t.time === "") ||
        (t.repeat !== "none" && !t.date) ||
        ["series", "generatedFrom"].some(
          (k) => t[k] !== undefined && typeof t[k] !== "string",
        )
      )
        throw Error("할 일 데이터가 올바르지 않습니다.");
    };

    const checkSchedule = (t) => {
      if (
        t.showProjectInDetail !== undefined &&
        typeof t.showProjectInDetail !== "boolean"
      )
        throw Error("프로젝트 표시 설정이 올바르지 않습니다.");
      const time = (v) =>
        typeof v === "string" &&
        (v === "" || /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(v));
      for (const k of ["endTime", "dueTime", "repeatUntilTime"])
        if (t[k] !== undefined && !time(t[k]))
          throw Error("시간 형식이 올바르지 않습니다.");
      for (const k of ["dueDate", "repeatUntil", "repeatAnchor"])
        if (t[k] !== undefined && !validDate(t[k]))
          throw Error("날짜 형식이 올바르지 않습니다.");
      if (t.endTime && (!t.time || t.endTime <= t.time))
        throw Error("종료 시간은 시작 시간 이후로 설정해 주세요.");
      if (t.dueTime && !t.dueDate)
        throw Error("마감 날짜를 먼저 선택해 주세요.");
      if (
        t.dueDate &&
        t.date &&
        t.dueDate + (t.dueTime || "23:59") < t.date + (t.time || "00:00")
      )
        throw Error("마감은 시작 일시 이후로 설정해 주세요.");
      if (t.repeatUntilTime && !t.repeatUntil)
        throw Error("반복 종료 날짜를 먼저 선택해 주세요.");
      if (
        t.repeat !== "none" &&
        t.repeatUntil &&
        t.repeatUntil + (t.repeatUntilTime || "23:59") <
          t.date + (t.time || "00:00")
      )
        throw Error("반복 종료는 시작 일시 이후로 설정해 주세요.");
      if (
        t.repeatDays !== undefined &&
        (!Array.isArray(t.repeatDays) ||
          t.repeatDays.length === 0 ||
          t.repeatDays.some((x) => !Number.isInteger(x) || x < 0 || x > 6) ||
          new Set(t.repeatDays).size !== t.repeatDays.length)
      )
        throw Error("반복 요일을 하나 이상 선택해 주세요.");
      if (
        t.repeatExceptions !== undefined &&
        (!Array.isArray(t.repeatExceptions) ||
          t.repeatExceptions.length > 20000 ||
          t.repeatExceptions.some((x) => !x || !validDate(x)))
      )
        throw Error("반복 제외 날짜가 올바르지 않습니다.");
      if (
        t.repeatIndex !== undefined &&
        (!Number.isInteger(t.repeatIndex) || t.repeatIndex < 0)
      )
        throw Error("반복 정보가 올바르지 않습니다.");
    };
    for (const p of d.projects) {
      checkProject(p);
      if (ids.has(p.id)) throw Error("중복된 프로젝트입니다.");
      ids.add(p.id);
    }
    for (const t of d.tasks) {
      checkTask(t);
      checkSchedule(t);
      if (tids.has(t.id)) throw Error("중복된 할 일입니다.");
      tids.add(t.id);
      if (t.project && !ids.has(t.project)) t.project = "";
    }
    for (const [k, v] of Object.entries(d.notes))
      if (!validDate(k) || !k || typeof v !== "string")
        throw Error("메모 데이터가 올바르지 않습니다.");
    d.trash = d.trash ?? [];
    if (!Array.isArray(d.trash) || d.trash.length > 20000)
      throw Error("휴지통 데이터가 올바르지 않습니다.");
    const trashIds = new Set();
    for (const item of d.trash) {
      if (
        !item ||
        typeof item.id !== "string" ||
        trashIds.has(item.id) ||
        typeof item.label !== "string" ||
        typeof item.deletedAt !== "string" ||
        !Number.isFinite(Date.parse(item.deletedAt)) ||
        !Array.isArray(item.tasks) ||
        !Array.isArray(item.projects) ||
        !Array.isArray(item.links)
      )
        throw Error("휴지통 데이터가 올바르지 않습니다.");
      trashIds.add(item.id);
      item.tasks.forEach((t) => {
        checkTask(t);
        checkSchedule(t);
      });
      item.projects.forEach(checkProject);
      if (
        item.links.some(
          (l) =>
            !l || typeof l.task !== "string" || typeof l.project !== "string",
        )
      )
        throw Error("휴지통 연결 정보가 올바르지 않습니다.");
    }
    return d;
  }
  function nextScheduledDate(t) {
    const weekdays = t.repeatDays?.length
      ? t.repeatDays
      : t.repeat === "weekly"
        ? [new Date(t.date + "T12:00:00").getDay()]
        : [0, 1, 2, 3, 4, 5, 6];
    let nextDate,
      index = (t.repeatIndex || 0) + 1;
    if (t.repeat === "monthly" || t.repeat === "yearly") {
      const anchor = new Date((t.repeatAnchor || t.date) + "T12:00:00"),
        day = anchor.getDate();
      const target = new Date(
        anchor.getFullYear() + (t.repeat === "yearly" ? index : 0),
        anchor.getMonth() + (t.repeat === "monthly" ? index : 0),
        1,
        12,
      );
      const last = new Date(
        target.getFullYear(),
        target.getMonth() + 1,
        0,
      ).getDate();
      target.setDate(Math.min(day, last));
      nextDate = dateKey(target);
      for (
        let i = 0;
        i < 7 && !weekdays.includes(new Date(nextDate + "T12:00:00").getDay());
        i++
      )
        nextDate = addDays(nextDate, 1);
    } else {
      nextDate = addDays(t.date, 1);
      for (
        let i = 0;
        i < 7 && !weekdays.includes(new Date(nextDate + "T12:00:00").getDay());
        i++
      )
        nextDate = addDays(nextDate, 1);
    }
    if (
      t.repeatUntil &&
      nextDate + (t.time || "00:00") >
        t.repeatUntil + (t.repeatUntilTime || "23:59")
    )
      return null;
    if (!validDate(nextDate)) return null;
    return { date: nextDate, index };
  }
  function nextOccurrence(t) {
    const excluded = new Set(t.repeatExceptions || []);
    let cursor = t;
    for (let count = 0; count <= excluded.size; count++) {
      const next = nextScheduledDate(cursor);
      if (!next || !excluded.has(next.date)) return next;
      cursor = {
        ...cursor,
        date: next.date,
        repeatIndex: next.index,
        repeatAnchor: t.repeatAnchor || t.date,
      };
    }
    return null;
  }
  function scheduleNext(d, t, idFactory) {
    if (t.status !== "done" || t.repeat === "none" || !t.date) return false;
    const next = nextOccurrence(t);
    if (!next) return false;
    const nextDate = next.date,
      lineage = t.series || t.id;
    t.series = lineage;
    // A moved or deleted generated occurrence must not be recreated by toggling its parent.
    const exists = (items) =>
      items.some(
        (x) =>
          x.generatedFrom === t.id ||
          (x.series === lineage && x.date === nextDate),
      );
    if (exists(d.tasks) || d.trash.some((x) => exists(x.tasks))) return false;
    let dueDate = t.dueDate || "";
    if (dueDate) {
      const delta = Math.round(
        (new Date(nextDate + "T12:00:00") - new Date(t.date + "T12:00:00")) /
          86400000,
      );
      dueDate = addDays(dueDate, delta);
    }
    d.tasks.push({
      ...t,
      id: idFactory(),
      date: nextDate,
      dueDate,
      status: "todo",
      repeatAnchor: t.repeatAnchor || t.date,
      repeatIndex: next.index,
      series: lineage,
      generatedFrom: t.id,
      sample: false,
      autoOccurrence: true,
    });
    return true;
  }
  function updateTask(d, id, patch, idFactory) {
    let t = id ? d.tasks.find((x) => x.id === id) : null;
    if (id && !t) throw Error("이 할 일은 다른 탭에서 삭제되었습니다.");
    if (t) {
      const fields = [
        "date",
        "time",
        "endTime",
        "repeat",
        "repeatDays",
        "repeatUntil",
        "repeatUntilTime",
        "title",
        "notes",
        "project",
        "priority",
        "dueDate",
        "dueTime",
      ];
      const changed = fields.some(
        (k) =>
          k in patch &&
          JSON.stringify(t[k] ?? "") !== JSON.stringify(patch[k] ?? ""),
      );
      if (changed) {
        t.series = idFactory();
        const descendants = new Set([t.id]),
          trashed = d.trash.flatMap((x) => x.tasks),
          all = [...d.tasks, ...trashed];
        let more = true;
        while (more) {
          more = false;
          for (const child of all)
            if (
              descendants.has(child.generatedFrom) &&
              !descendants.has(child.id)
            ) {
              descendants.add(child.id);
              more = true;
            }
        }
        const preserved = d.tasks.filter(
          (x) =>
            x.id !== t.id &&
            descendants.has(x.id) &&
            (!x.autoOccurrence || x.status === "done"),
        );
        const skipped = all
          .filter(
            (x) =>
              x.id !== t.id &&
              descendants.has(x.id) &&
              (preserved.includes(x) || trashed.includes(x)),
          )
          .map((x) => x.date)
          .filter(Boolean);
        if (skipped.length)
          t.repeatExceptions = [
            ...new Set([...(t.repeatExceptions || []), ...skipped]),
          ];
        d.tasks = d.tasks.filter(
          (x) =>
            x.id === t.id ||
            !descendants.has(x.id) ||
            !x.autoOccurrence ||
            x.status === "done",
        );
        for (const x of preserved) {
          delete x.generatedFrom;
          delete x.series;
          x.repeat = "none";
        }
        for (const x of trashed)
          if (descendants.has(x.id)) {
            delete x.generatedFrom;
            delete x.series;
            x.repeat = "none";
          }
      }
      t.autoOccurrence = false;
    }
    const previous = t?.status;
    if (!t) {
      t = { id: idFactory() };
      d.tasks.push(t);
    }
    Object.assign(t, patch, { sample: false });
    if (t.status === "done" && previous !== "done")
      scheduleNext(d, t, idFactory);
    return t;
  }
  function expandRecurrences(d, through, idFactory) {
    const active = new Map(d.tasks.map((t) => [t.id, t])),
      all = [...d.tasks, ...d.trash.flatMap((x) => x.tasks)],
      byParent = new Map(
        all.filter((t) => t.generatedFrom).map((t) => [t.generatedFrom, t]),
      ),
      byDate = new Map(
        all.filter((t) => t.series).map((t) => [t.series + "|" + t.date, t]),
      );
    const roots = d.tasks.filter(
      (t) =>
        t.repeat !== "none" &&
        (!t.generatedFrom || !active.has(t.generatedFrom)),
    );
    let added = 0;
    for (const root of roots) {
      let cursor = root;
      const seen = new Set();
      while (cursor && cursor.repeat !== "none" && !seen.has(cursor.id)) {
        seen.add(cursor.id);
        const next = nextOccurrence(cursor);
        if (
          !next ||
          next.date > (root.repeatUntil || through) ||
          next.date <= cursor.date
        )
          break;
        const lineage = cursor.series || root.series || root.id;
        let existing = byParent.get(cursor.id);
        if (existing && existing.series !== lineage) existing = null;
        existing = existing || byDate.get(lineage + "|" + next.date);
        if (existing) {
          cursor = existing;
          continue;
        }
        if (d.tasks.length >= 20000)
          throw Error(
            "반복 일정이 너무 많습니다. 반복 종료 날짜를 설정해 주세요.",
          );
        cursor.series = lineage;
        let dueDate = cursor.dueDate || "";
        if (dueDate)
          dueDate = addDays(
            dueDate,
            Math.round(
              (new Date(next.date + "T12:00:00") -
                new Date(cursor.date + "T12:00:00")) /
                86400000,
            ),
          );
        const item = {
          ...cursor,
          id: idFactory(),
          date: next.date,
          dueDate,
          status: "todo",
          series: lineage,
          generatedFrom: cursor.id,
          repeatAnchor: cursor.repeatAnchor || cursor.date,
          repeatIndex: next.index,
          sample: false,
          autoOccurrence: true,
        };
        d.tasks.push(item);
        active.set(item.id, item);
        byParent.set(cursor.id, item);
        byDate.set(lineage + "|" + item.date, item);
        cursor = item;
        added++;
      }
    }
    return added;
  }
  // Moving a card keeps its deadline at the same offset from its start date.
  function moveTask(d, id, date) {
    const t = d.tasks.find((task) => task.id === id);
    if (!t) throw Error("이 할 일은 다른 탭에서 삭제되었습니다.");
    if (!date || !validDate(date))
      throw Error("날짜 형식이 올바르지 않습니다.");
    if (t.date === date) return;
    if (t.date && t.dueDate) {
      const offset = Math.round(
        (new Date(date + "T12:00:00") - new Date(t.date + "T12:00:00")) /
          86400000,
      );
      t.dueDate = addDays(t.dueDate, offset);
    }
    t.date = date;
    t.sample = false;
    t.autoOccurrence = false;
  }
  function moveToTrash(d, taskIds, projectIds, label, idFactory) {
    const tasks = d.tasks.filter((t) => taskIds.includes(t.id)),
      projects = d.projects.filter((p) => projectIds.includes(p.id));
    if (!tasks.length && !projects.length) return null;
    const item = {
      id: idFactory(),
      label,
      deletedAt: new Date().toISOString(),
      tasks: copy(tasks),
      projects: copy(projects),
      links: [],
    };
    d.tasks = d.tasks.filter((t) => !taskIds.includes(t.id));
    d.projects = d.projects.filter((p) => !projectIds.includes(p.id));
    for (const t of d.tasks)
      if (projectIds.includes(t.project)) {
        item.links.push({ task: t.id, project: t.project });
        t.project = "";
      }
    d.trash.push(item);
    return item.id;
  }
  function restore(d, id) {
    const item = d.trash.find((x) => x.id === id);
    if (!item) throw Error("복원할 항목이 없습니다.");
    for (const p of item.projects)
      if (!d.projects.some((x) => x.id === p.id)) d.projects.push(copy(p));
    for (const task of item.tasks)
      if (!d.tasks.some((x) => x.id === task.id)) {
        const t = copy(task);
        if (t.project && !d.projects.some((p) => p.id === t.project))
          t.project = "";
        const parent = d.tasks.find((x) => x.id === t.generatedFrom);
        if (parent?.series && parent.series !== t.series) {
          delete t.generatedFrom;
          delete t.series;
          t.repeat = "none";
        }
        d.tasks.push(t);
      }
    for (const l of item.links) {
      const t = d.tasks.find((x) => x.id === l.task);
      if (t && !t.project && d.projects.some((p) => p.id === l.project))
        t.project = l.project;
    }
    d.trash = d.trash.filter((x) => x.id !== id);
  }
  function createStore(storage, key, seed) {
    let state,
      loadError = null;
    try {
      const raw = storage.getItem(key);
      state = raw ? validate(JSON.parse(raw)) : validate(seed());
      if (!raw) storage.setItem(key, JSON.stringify(state));
    } catch (e) {
      loadError = e;
      state = { version: 1, tasks: [], projects: [], notes: {}, trash: [] };
    }
    if (!loadError) globalThis.HaruCloud?.changed();
    const read = () => {
      const raw = storage.getItem(key);
      if (!raw)
        return { version: 1, tasks: [], projects: [], notes: {}, trash: [] };
      return validate(JSON.parse(raw));
    };
    return {
      get state() {
        return state;
      },
      get error() {
        return loadError;
      },
      transact(fn) {
        if (loadError)
          throw Error(
            "저장 데이터를 읽지 못했습니다. 원본을 백업한 뒤 백업 파일을 가져와 주세요.",
          );
        const next = read();
        fn(next);
        const checked = validate(next);
        storage.setItem(key, JSON.stringify(checked));
        state = checked;
        globalThis.HaruCloud?.changed();
        return state;
      },
      reload() {
        try {
          state = read();
          loadError = null;
          return state;
        } catch (e) {
          loadError = e;
          throw e;
        }
      },
      replace(data) {
        const next = validate(data),
          old = storage.getItem(key);
        if (old) storage.setItem(key + ".recovery", old);
        storage.setItem(key, JSON.stringify(next));
        state = next;
        loadError = null;
        globalThis.HaruCloud?.changed();
        return state;
      },
      raw() {
        return storage.getItem(key) || "";
      },
      recovery() {
        return storage.getItem(key + ".recovery") || "";
      },
    };
  }
  return {
    validate,
    addDays,
    nextOccurrence,
    scheduleNext,
    expandRecurrences,
    updateTask,
    moveTask,
    moveToTrash,
    restore,
    createStore,
  };
});
