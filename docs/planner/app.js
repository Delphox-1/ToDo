(async () => {
  "use strict";
  await globalThis.HaruCloud?.ready;
  const $ = (s) => document.querySelector(s),
    $$ = (s) => [...document.querySelectorAll(s)];
  const icon = (n) => `<svg aria-hidden="true"><use href="#i-${n}"/></svg>`,
    esc = (v) =>
      String(v ?? "").replace(
        /[&<>"']/g,
        (c) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[c],
      );
  const Core = HaruCore;
  const key = globalThis.ToDoAccount?.storageKey || "haru-planner-v1",
    uid = () => crypto.randomUUID(),
    dayNames = ["일", "월", "화", "수", "목", "금", "토"];
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
    if (!s) return "날짜 미정";
    let d = parseDate(s);
    return `${d.getMonth() + 1}.${d.getDate()} (${dayNames[d.getDay()]})`;
  };
  let state,
    view = "today",
    query = "",
    filter = "all",
    projectFilter = "",
    week = weekStart(today()),
    month = today().slice(0, 7),
    editId = null,
    editProjectId = null,
    selectedDate = null,
    toastTimer,
    sortMode = "date";
  function samples() {
    if (globalThis.ToDoAccount)
      return { version: 1, tasks: [], projects: [], notes: {}, trash: [] };
    const t = today();
    return {
      version: 1,
      projects: [
        {
          id: "p-work",
          name: "업무 & 사이드 프로젝트",
          color: "#6c7de0",
          sample: true,
        },
        { id: "p-life", name: "나의 일상", color: "#44876e", sample: true },
        { id: "p-learn", name: "배움과 성장", color: "#d1954d", sample: true },
      ],
      notes: {},
      tasks: [
        {
          id: uid(),
          title: "이번 주 가장 중요한 목표 정하기",
          date: t,
          time: "09:00",
          priority: "high",
          project: "p-work",
          status: "done",
          star: true,
          notes: "예시 할 일이에요. 자유롭게 수정하거나 지워보세요.",
          repeat: "none",
          sample: true,
        },
        {
          id: uid(),
          title: "새 프로젝트 아이디어 정리하기",
          date: t,
          time: "10:00",
          priority: "high",
          project: "p-work",
          status: "doing",
          star: true,
          notes: "아이디어 3개를 적고, 가장 해보고 싶은 하나를 골라보세요.",
          repeat: "none",
          sample: true,
        },
        {
          id: uid(),
          title: "책 20페이지 읽고 한 줄 남기기",
          date: t,
          time: "13:00",
          priority: "medium",
          project: "p-learn",
          status: "todo",
          star: true,
          notes: "오늘 배운 것 한 가지는 무엇인가요?",
          repeat: "none",
          sample: true,
        },
        {
          id: uid(),
          title: "가볍게 산책하며 리프레시",
          date: t,
          time: "17:30",
          priority: "low",
          project: "p-life",
          status: "todo",
          star: false,
          notes: "",
          repeat: "none",
          sample: true,
        },
        {
          id: uid(),
          title: "다음 주 일정 미리 살펴보기",
          date: t,
          time: "20:00",
          priority: "medium",
          project: "p-life",
          status: "todo",
          star: false,
          notes: "",
          repeat: "none",
          sample: true,
        },
        {
          id: uid(),
          title: "프로젝트 초안 작성",
          date: addDays(t, 2),
          time: "10:00",
          priority: "high",
          project: "p-work",
          status: "todo",
          star: false,
          notes: "",
          repeat: "none",
          sample: true,
        },
        {
          id: uid(),
          title: "온라인 강의 한 편 듣기",
          date: addDays(t, 3),
          time: "19:00",
          priority: "medium",
          project: "p-learn",
          status: "todo",
          star: false,
          notes: "",
          repeat: "none",
          sample: true,
        },
        {
          id: uid(),
          title: "언젠가 해보고 싶은 일 적기",
          date: "",
          time: "",
          priority: "low",
          project: "p-life",
          status: "todo",
          star: false,
          notes: "",
          repeat: "none",
          sample: true,
        },
      ],
    };
  }
  const persistence = Core.createStore(localStorage, key, samples);
  state = persistence.state;
  let storageFailed = !!persistence.error;
  function toast(message, undo = "") {
    const el = $("#toast");
    el.replaceChildren(document.createTextNode(message));
    if (undo) {
      const b = document.createElement("button");
      b.textContent = "실행 취소";
      b.dataset.restore = undo;
      el.append(b);
    }
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(
      () => el.classList.remove("show"),
      undo ? 9000 : 4000,
    );
  }
  const project = (id) => state.projects.find((p) => p.id === id),
    pTag = (t) => {
      let p = project(t.project);
      return p
        ? `<span class="project-tag"><i class="dot" style="background:${p.color}"></i>${esc(p.name)}</span>`
        : "";
    };
  const timeLabel = (t) => t.time + (t.endTime ? " – " + t.endTime : "");
  const repeatLabel = (t) =>
    ({ daily: "매일", weekly: "매주", monthly: "매월", yearly: "매년" })[
      t.repeat
    ] || "";
  const deadlineLabel = (t) =>
    t.dueDate
      ? "마감 " + friendly(t.dueDate) + (t.dueTime ? " " + t.dueTime : "")
      : "";
  const priority = (t) =>
    `<span class="priority ${t.priority}">${{ high: "높음", medium: "보통", low: "낮음" }[t.priority]}</span>`;
  const matches = (t) =>
    (!query ||
      `${t.title} ${t.notes} ${project(t.project)?.name || ""}`
        .toLowerCase()
        .includes(query.toLowerCase())) &&
    (!projectFilter || t.project === projectFilter);
  const sortTasks = (ts) =>
    [...ts].sort(
      (a, b) =>
        (a.status === "done") - (b.status === "done") ||
        (sortMode === "priority"
          ? { high: 0, medium: 1, low: 2 }[a.priority] -
            { high: 0, medium: 1, low: 2 }[b.priority]
          : 0) ||
        (a.date || "9999").localeCompare(b.date || "9999") ||
        (a.time || "99").localeCompare(b.time || "99") ||
        { high: 0, medium: 1, low: 2 }[a.priority] -
          { high: 0, medium: 1, low: 2 }[b.priority],
    );
  function taskRow(t, showDate = false) {
    return `<div class="task-row ${t.status === "done" ? "done" : ""}"><button class="check ${t.status === "done" ? "checked" : ""}" data-toggle="${esc(t.id)}" aria-label="${esc(t.title)} ${t.status === "done" ? "완료 취소" : "완료"}">${t.status === "done" ? icon("check") : ""}</button><button class="task-text" data-edit="${esc(t.id)}"><span class="task-title">${esc(t.title)}</span><span class="task-meta">${showDate ? `<span>${friendly(t.date)}</span>` : ""}${t.time ? `<span>${timeLabel(t)}</span>` : ""}${pTag(t)}${t.dueDate ? `<span class="deadline-tag">${deadlineLabel(t)}</span>` : ""}${t.status === "doing" ? "<span>진행 중</span>" : ""}${t.repeat !== "none" ? `<span>↻ ${repeatLabel(t)}</span>` : ""}</span></button>${priority(t)}<button class="task-edit" data-edit="${esc(t.id)}" aria-label="${esc(t.title)} 수정" title="수정 및 삭제">수정</button><button class="star ${t.star ? "on" : ""}" data-star="${esc(t.id)}" aria-label="${t.star ? "중요 표시 해제" : "중요한 일로 표시"}" aria-pressed="${t.star}">${icon("star")}</button></div>`;
  }
  const empty = (title = "할 일이 없습니다.", desc = "") =>
    `<div class="empty">${icon("check")}<strong>${title}</strong>${desc}</div>`;
  const addRow = (date = "") =>
    `<button class="row-add" data-add-date="${date}">${icon("plus")}할 일 추가하기</button>`;
  function heading(title) {
    const pageIcons = {
      "오늘의 할 일": "☑️",
      "주간 계획": "🗓️",
      캘린더: "📅",
      프로젝트: "📁",
      "완료한 일": "✅",
      "전체 할 일": "📋",
      휴지통: "🗑️",
      더보기: "⚙️",
    };
    return `<div class="page-heading"><span class="page-icon" aria-hidden="true">${pageIcons[title] || "📄"}</span><h1>${title}</h1></div>`;
  }
  function renderNav() {
    const ns = [
      ["today", "sun", "오늘"],
      ["all", "check", "전체 할 일"],
      ["week", "week", "이번 주"],
      ["calendar", "week", "캘린더"],
      ["projects", "grid", "프로젝트"],
      ["completed", "check", "완료한 일"],
    ];
    $("#navigation").innerHTML = ns
      .map(
        ([id, i, n]) =>
          `<button data-view="${id}" class="${view === id ? "active" : ""}">${icon(i)}${n}${id === "today" ? `<span class="count">${state.tasks.filter((t) => t.date === today() && t.status !== "done").length}</span>` : ""}</button>`,
      )
      .join("");
    const bottom = [
        ["today", "sun", "오늘"],
        ["all", "check", "할 일"],
        ["week", "week", "이번 주"],
        ["calendar", "week", "캘린더"],
        ["more", "more", "더보기"],
      ],
      active = ["projects", "project", "completed", "trash", "more"].includes(
        view,
      )
        ? "more"
        : view;
    $("#mobile-navigation").innerHTML = bottom
      .map(
        ([id, i, label]) =>
          `<button data-view="${id}" ${active === id ? 'aria-current="page"' : ""}>${icon(i)}<span>${label}</span></button>`,
      )
      .join("");
    $("#project-nav").innerHTML = state.projects
      .map(
        (p) =>
          `<div class="project-nav-row ${view === "project" && projectFilter === p.id ? "active" : ""}"><button class="project-nav-item" data-project-view="${esc(p.id)}"><i class="dot" style="background:${p.color}"></i><span>${esc(p.name)}</span></button><button class="project-edit" data-edit-project="${esc(p.id)}" aria-label="${esc(p.name)} 수정 및 삭제">···</button></div>`,
      )
      .join("");
    $("#crumb").textContent =
      ns.find((n) => n[0] === view)?.[2] ||
      project(projectFilter)?.name ||
      (view === "trash" ? "휴지통" : "할 일");
    $(".sample-clear").hidden =
      !state.tasks.some((t) => t.sample) &&
      !state.projects.some((p) => p.sample);
  }
  function stats() {
    let ts = state.tasks.filter((t) => t.date === today()),
      done = ts.filter((t) => t.status === "done").length,
      pct = ts.length ? Math.round((done / ts.length) * 100) : 0,
      remaining = ts.length - done,
      upcoming = state.tasks.filter(
        (t) =>
          t.date > today() &&
          t.date <= addDays(today(), 7) &&
          t.status !== "done",
      ).length;
    return `<div class="stats">${[
      ["오늘의 할 일", remaining, "개", "", "sun"],
      ["완료한 일", done, "개", "", "check"],
      ["7일 내 일정", upcoming, "개", "", "week"],
      ["오늘의 달성률", pct, "%", "", "grid"],
    ]
      .map(
        ([n, v, u, c, i]) =>
          `<div class="stat"><span class="stat-name">${n}</span><div class="stat-icon">${icon(i)}</div><div class="stat-number">${v}<small>${u}</small></div><span class="stat-caption">${c}</span>${i === "grid" ? `<div class="progress-mini"><span style="width:${pct}%"></span></div>` : ""}</div>`,
      )
      .join("")}</div>`;
  }
  function filters() {
    return `<div class="tabs">${[
      ["all", "전체"],
      ["todo", "할 일"],
      ["doing", "진행 중"],
      ["done", "완료"],
    ]
      .map(
        ([id, n]) =>
          `<button data-filter="${id}" class="${filter === id ? "selected" : ""}">${n}</button>`,
      )
      .join("")}</div>`;
  }
  function projectSelector() {
    return `<select id="project-filter" aria-label="프로젝트 필터"><option value="">모든 프로젝트</option>${state.projects.map((p) => `<option value="${esc(p.id)}" ${p.id === projectFilter ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select>`;
  }
  function renderToday() {
    let ts = sortTasks(
        state.tasks.filter(
          (t) =>
            t.date === today() &&
            matches(t) &&
            (filter === "all" || t.status === filter),
        ),
      ),
      overdue = sortTasks(
        state.tasks.filter(
          (t) =>
            t.date &&
            t.date < today() &&
            t.status !== "done" &&
            matches(t) &&
            (filter === "all" || t.status === filter),
        ),
      ),
      focus = sortTasks(
        state.tasks.filter(
          (t) => t.star && t.status !== "done" && t.date === today(),
        ),
      ).slice(0, 3),
      start = weekStart(today());
    $("#main").innerHTML =
      heading("오늘의 할 일") +
      stats() +
      `<div class="today-layout"><div><section class="panel"><div class="panel-heading"><h2>오늘의 할 일<span>${state.tasks.filter((t) => t.date === today()).length}</span></h2>${projectSelector()}</div>${filters()}${overdue.length ? `<div class="overdue-label">미뤄진 할 일 · ${overdue.length}개</div>${overdue.map((t) => taskRow(t, true)).join("")}` : ""}${ts.length ? ts.map((t) => taskRow(t)).join("") : empty(query ? "검색 결과가 없습니다." : "오늘의 할 일이 없습니다.")}${addRow(today())}</section><section class="panel weekly-preview"><div class="panel-heading"><h2>이번 주 한눈에</h2><button class="text-link" data-view="week">주간 계획 보기 ${icon("right")}</button></div><div class="week-strip">${Array.from(
        { length: 7 },
        (_, i) => {
          let d = addDays(start, i),
            ts = state.tasks.filter((t) => t.date === d && matches(t));
          return `<button class="strip-day ${d === today() ? "current" : ""}" data-date-view="${d}"><small>${dayNames[parseDate(d).getDay()]}</small><strong>${parseDate(d).getDate()}</strong>${
            ts.length
              ? sortTasks(ts)
                  .map(
                    (t) =>
                      `<span class="strip-task ${t.priority} ${t.status === "done" ? "done" : ""}">${esc(t.title)}</span>`,
                  )
                  .join("")
              : '<span class="strip-task-empty">—</span>'
          }</button>`;
        },
      ).join(
        "",
      )}</div></section></div><div class="side-stack"><section class="focus-panel"><h2>${icon("star")}오늘의 중요한 일</h2><p>별표 표시한 오늘의 할 일 · 최대 3개</p>${focus.length ? focus.map((t, i) => `<div class="focus-item"><span>0${i + 1}</span><button data-edit="${esc(t.id)}">${esc(t.title)}</button></div>`).join("") : '<div class="focus-empty">별표 표시한 할 일이 없습니다.</div>'}</section><section class="note-panel"><h2>주간 메모</h2><textarea id="weekly-note" aria-label="이번 주 메모" placeholder="메모 입력">${esc(state.notes[start] || "")}</textarea></section></div></div>`;
  }
  function rangeToolbar(kind) {
    let d = parseDate(week),
      end = parseDate(addDays(week, 6)),
      label =
        kind === "week"
          ? `${d.getMonth() + 1}월 ${d.getDate()}일 – ${end.getMonth() + 1}월 ${end.getDate()}일`
          : `${month.slice(0, 4)}년 ${Number(month.slice(5))}월`;
    return `<div class="toolbar"><div class="range-control"><button class="icon-button" data-action="prev" aria-label="이전 ${kind === "week" ? "주" : "달"}">${icon("left")}</button><strong>${label}</strong><button class="icon-button" data-action="next" aria-label="다음 ${kind === "week" ? "주" : "달"}">${icon("right")}</button><button class="secondary" data-action="current">오늘</button></div><div class="toolbar-group">${projectSelector()}<select id="status-filter" aria-label="상태 필터"><option value="all">모든 상태</option><option value="todo" ${filter === "todo" ? "selected" : ""}>할 일</option><option value="doing" ${filter === "doing" ? "selected" : ""}>진행 중</option><option value="done" ${filter === "done" ? "selected" : ""}>완료</option></select></div></div>`;
  }
  function weekCard(t) {
    return `<div class="week-card ${t.status === "done" ? "done" : ""}" draggable="true" data-drag="${esc(t.id)}"><div class="card-top"><button class="check ${t.status === "done" ? "checked" : ""}" data-toggle="${esc(t.id)}" aria-label="${esc(t.title)} ${t.status === "done" ? "완료 취소" : "완료"}">${t.status === "done" ? icon("check") : ""}</button>${priority(t)}</div><button class="task-text" data-edit="${esc(t.id)}"><span class="task-title">${esc(t.title)}</span><span class="task-meta">${t.time ? `<span>${timeLabel(t)}</span>` : ""}${t.status === "doing" ? "<span>진행 중</span>" : ""}</span><span class="task-meta">${pTag(t)}</span></button></div>`;
  }
  function renderWeek() {
    let visible = state.tasks.filter(
        (t) => matches(t) && (filter === "all" || t.status === filter),
      ),
      undated = visible.filter((t) => !t.date);
    $("#main").innerHTML =
      heading("주간 계획") +
      rangeToolbar("week") +
      `<section class="week-board">${Array.from({ length: 7 }, (_, i) => {
        let date = addDays(week, i),
          ts = sortTasks(visible.filter((t) => t.date === date));
        return `<div class="day-column ${date === today() ? "current" : ""}" data-drop="${date}"><div class="day-head"><div>${dayNames[parseDate(date).getDay()]}요일 <span>· ${ts.length}</span></div><b>${parseDate(date).getDate()}</b></div>${ts.map(weekCard).join("")}<button class="day-add" data-add-date="${date}">${icon("plus")}추가</button></div>`;
      }).join(
        "",
      )}</section><p class="week-note">카드를 다른 요일로 옮겨 일정을 조정하세요. 카드를 누르면 상세 내용도 수정할 수 있어요.</p><section class="panel unscheduled"><div class="panel-heading"><h2>아직 날짜를 정하지 않은 일<span>${undated.length}</span></h2></div>${
        undated.length
          ? sortTasks(undated)
              .map((t) => taskRow(t))
              .join("")
          : empty("날짜 미정인 할 일이 없습니다.")
      }${addRow("")}</section>`;
  }
  let calendarCountry = "KR";
  try {
    calendarCountry =
      localStorage.getItem("haru-calendar-country") === "JP" ? "JP" : "KR";
  } catch {}
  const holidayData = globalThis.HaruHolidays || { KR: {}, JP: {} },
    holidayRequests = new Map();
  function loadHolidayYear(country, year) {
    const requestKey = country + year;
    if (holidayRequests.has(requestKey)) return;
    holidayRequests.set(requestKey, "loading");
    const url =
      country === "KR"
        ? `https://holidays.dist.be/${year}.json`
        : "https://holidays-jp.github.io/api/v1/date.json";
    fetch(url, {
      credentials: "omit",
      referrerPolicy: "no-referrer",
      signal: AbortSignal.timeout(7000),
    })
      .then((r) => {
        if (!r.ok) throw Error("unavailable");
        return r.json();
      })
      .then((data) => {
        const entries =
          country === "KR"
            ? Array.isArray(data)
              ? data
                  .filter((x) => x.holiday === true)
                  .map((x) => ({ date: x.date, name: x.name }))
              : []
            : Object.entries(data)
                .filter(([date]) => date.startsWith(year + "-"))
                .map(([date, name]) => ({ date, name }));
        const valid = entries.filter(
          (x) =>
            typeof x.date === "string" &&
            /^\d{4}-\d{2}-\d{2}$/.test(x.date) &&
            typeof x.name === "string",
        );
        if (!valid.length) throw Error("unavailable");
        holidayData[country][year] = valid;
        holidayRequests.set(requestKey, "ready");
      })
      .catch(() => holidayRequests.set(requestKey, "unavailable"))
      .finally(() => {
        if (
          view === "calendar" &&
          calendarCountry === country &&
          month.startsWith(year)
        )
          renderCalendar();
      });
  }
  document.addEventListener("change", (e) => {
    if (e.target.id === "calendar-country") {
      calendarCountry = e.target.value;
      try {
        localStorage.setItem("haru-calendar-country", calendarCountry);
      } catch {}
      renderCalendar();
    }
  });
  function renderCalendar() {
    const compact = matchMedia("(max-width:620px)").matches,
      limit = compact ? 2 : 3;
    const first = month + "-01",
      d = parseDate(first),
      start = addDays(first, -d.getDay()),
      last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(),
      cells = Math.ceil((d.getDay() + last) / 7) * 7,
      year = month.slice(0, 4);
    loadHolidayYear(calendarCountry, year);
    const holidays = new Map();
    for (const entries of Object.values(holidayData[calendarCountry]))
      for (const item of entries)
        holidays.set(
          item.date,
          [holidays.get(item.date), item.name].filter(Boolean).join(" · "),
        );
    const known = !!holidayData[calendarCountry][year],
      loading = holidayRequests.get(calendarCountry + year) === "loading";
    $("#main").innerHTML =
      heading("캘린더") +
      `<div class="calendar-priority-legend"><span class="priority high">높음</span><span class="priority medium">보통</span><span class="priority low">낮음</span></div><div class="country-control"><label for="calendar-country">공휴일 달력</label><select id="calendar-country"><option value="KR" ${calendarCountry === "KR" ? "selected" : ""}>한국 달력</option><option value="JP" ${calendarCountry === "JP" ? "selected" : ""}>일본 달력</option></select></div>` +
      rangeToolbar("month") +
      `<section class="panel calendar-panel"><div class="calendar-weekdays">${["일", "월", "화", "수", "목", "금", "토"].map((n, i) => `<span class="${i === 0 ? "sunday" : i === 6 ? "saturday" : ""}">${n}</span>`).join("")}</div><div class="calendar-grid">${Array.from(
        { length: cells },
        (_, i) => {
          const date = addDays(start, i),
            weekday = parseDate(date).getDay(),
            name = holidays.get(date) || "",
            ts = sortTasks(
              state.tasks.filter(
                (t) =>
                  t.date === date &&
                  matches(t) &&
                  (filter === "all" || t.status === filter),
              ),
            );
          return `<div class="calendar-cell ${date.slice(0, 7) !== month ? "other" : ""} ${date === today() ? "current" : ""} ${date === selectedDate ? "selected-date" : ""} ${name || weekday === 0 ? "holiday" : weekday === 6 ? "saturday" : ""}" data-drop="${date}"><div class="calendar-day-heading"><button class="calendar-date" data-calendar-date="${date}" aria-label="${friendly(date)}${name ? " " + esc(name) : ""} ${compact ? "일정 보기" : "할 일 추가"}">${parseDate(date).getDate()}</button>${name ? `<span class="holiday-name" title="${esc(name)}">${esc(name)}</span>` : ""}</div>${ts
            .slice(0, limit)
            .map(
              (t) =>
                `<button class="calendar-event priority-${t.priority} ${t.status === "done" ? "done" : ""}" data-task-detail="${esc(t.id)}" title="${esc(t.title)}${t.time ? " · " + esc(timeLabel(t)) : ""}" aria-label="${esc(t.title)} 상세 보기"><span class="calendar-event-title">${esc(t.title)}</span>${t.time ? `<span class="calendar-time">${esc(t.time)}</span>` : ""}</button>`,
            )
            .join(
              "",
            )}${ts.length > limit ? `<button class="calendar-more" data-date-view="${date}">+${ts.length - limit}개 더 보기</button>` : ""}</div>`;
        },
      ).join(
        "",
      )}</div></section>${selectedDate ? dayDetail(selectedDate) : ""}<p class="calendar-data-note">${known ? "공휴일·대체공휴일 표시" : loading ? "공휴일 정보 확인 중…" : "해당 연도의 공휴일 정보를 불러오지 못했습니다."} · <a href="${calendarCountry === "KR" ? "https://github.com/distbe/holidays" : "https://holidays-jp.github.io/"}" target="_blank" rel="noopener noreferrer">데이터 출처</a></p>`;
  }

  function dayDetail(date) {
    let ts = sortTasks(
      state.tasks.filter(
        (t) =>
          t.date === date &&
          matches(t) &&
          (filter === "all" || t.status === filter),
      ),
    );
    return `<section id="day-detail" class="panel unscheduled"><div class="panel-heading"><h2>${friendly(date)}의 할 일</h2><button class="text-link" data-action="close-date">닫기</button></div>${ts.map((t) => taskRow(t)).join("") || empty()}${addRow(date)}</section>`;
  }
  function renderMore() {
    const row = (label, attribute, iconName = "right") =>
      `<button class="more-row" ${attribute}><span>${label}</span>${icon(iconName)}</button>`;
    $("#main").innerHTML =
      heading("더보기") +
      `<section class="more-section"><h2>관리</h2>${row("프로젝트", 'data-view="projects"', "folder")}${row("새 프로젝트", 'data-action="new-project"', "plus")}${row("완료한 일", 'data-view="completed"', "check")}${row("휴지통", 'data-view="trash"')}</section><section class="more-section"><h2>데이터</h2><button class="more-row" data-action="storage-info"><span>로컬 저장<small id="more-sync-status">${esc(globalThis.HaruCloud?.status || "기기에 저장됨")}</small></span>${icon("right")}</button>${row("백업 내려받기", 'data-action="export"', "download")}${row("백업 가져오기", 'data-action="import"', "upload")}${row("가져오기 전 백업", 'data-action="export-recovery"')}${state.tasks.some((t) => t.sample) || state.projects.some((p) => p.sample) ? row("예시 데이터 지우기", 'data-action="clear-samples"') : ""}</section><section class="more-section"><h2>ToDo</h2>${!(matchMedia("(display-mode: standalone)").matches || navigator.standalone) ? row("앱 설치 안내", 'data-action="install"') : ""}<p class="more-note">현재 브라우저에 저장 · 다른 기기로 옮길 때는 백업 파일 사용</p></section>`;
  }
  function renderProjects() {
    let ps = state.projects.filter(
      (p) => !query || p.name.toLowerCase().includes(query.toLowerCase()),
    );
    $("#main").innerHTML =
      heading("프로젝트") +
      `<div class="project-cards">${ps
        .map((p) => {
          let ts = state.tasks.filter((t) => t.project === p.id),
            done = ts.filter((t) => t.status === "done").length,
            pct = ts.length ? Math.round((done / ts.length) * 100) : 0;
          return `<section class="project-card" style="--project-color:${p.color}"><div class="project-card-top"><div class="folder-icon">${icon("folder")}</div><button class="text-link" data-edit-project="${esc(p.id)}">수정</button></div><h2>${esc(p.name)}</h2><p>할 일 ${ts.length}개 · 진행 중 ${ts.filter((t) => t.status === "doing").length}개</p><div class="project-progress"><span>${done} / ${ts.length} 완료</span><b>${pct}%</b></div><div class="progress-mini"><span style="width:${pct}%;background:${p.color}"></span></div><button class="project-open" data-project-view="${esc(p.id)}">프로젝트 열기 ${icon("right")}</button></section>`;
        })
        .join(
          "",
        )}<button class="new-project-card" data-action="new-project">${icon("plus")}새로운 프로젝트 만들기</button></div>`;
  }
  function renderList() {
    const completed = view === "completed",
      all = view === "all",
      p = project(projectFilter),
      ts = sortTasks(
        state.tasks.filter(
          (t) =>
            matches(t) &&
            (completed
              ? t.status === "done"
              : filter === "all" || t.status === filter),
        ),
      );
    $("#main").innerHTML =
      heading(
        completed
          ? "완료한 일"
          : all
            ? "전체 할 일"
            : esc(p?.name || "전체 할 일"),
      ) +
      '<section class="panel list-panel"><div class="panel-heading"><h2>할 일<span>' +
      ts.length +
      '개</span></h2><div class="toolbar-group">' +
      (all || completed ? projectSelector() : "") +
      '<select id="sort-order" aria-label="할 일 정렬"><option value="date" ' +
      (sortMode === "date" ? "selected" : "") +
      '>날짜순</option><option value="priority" ' +
      (sortMode === "priority" ? "selected" : "") +
      ">우선순위순</option></select></div></div>" +
      (!completed ? filters() : "") +
      (view === "project" && p
        ? `<button class="project-settings-link secondary" data-edit-project="${esc(p.id)}">프로젝트 수정 · 삭제</button>`
        : "") +
      (ts.map((t) => taskRow(t, true)).join("") ||
        empty(completed ? "완료한 할 일이 없습니다." : "할 일이 없습니다.")) +
      (completed ? "" : addRow("")) +
      "</section>";
  }
  function recurrenceHorizon() {
    return [
      addDays(today(), 366),
      addDays(week, 6),
      dateKey(
        new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0, 12),
      ),
    ]
      .sort()
      .at(-1);
  }
  function expandForView() {
    if (storageFailed) return;
    try {
      const draft = JSON.parse(JSON.stringify(state));
      if (Core.expandRecurrences(draft, recurrenceHorizon(), uid)) {
        state = persistence.transact((d) =>
          Core.expandRecurrences(d, recurrenceHorizon(), uid),
        );
      }
    } catch (error) {
      failure(error);
    }
  }
  function render() {
    expandForView();
    if (view === "project" && !project(projectFilter)) {
      view = "projects";
      projectFilter = "";
    }
    renderNav();
    (
      ({
        today: renderToday,
        all: renderList,
        week: renderWeek,
        calendar: renderCalendar,
        projects: renderProjects,
        completed: renderList,
        project: renderList,
        trash: renderTrash,
        more: renderMore,
      })[view] || renderToday
    )();
  }
  function routeHash() {
    return (
      "#" +
      view +
      (view === "project" ? "/" + encodeURIComponent(projectFilter) : "")
    );
  }
  function navigate(v, p = "") {
    view = v;
    projectFilter = p;
    filter = "all";
    selectedDate = null;
    query = "";
    $("#search").value = "";
    if (v === "week") week = weekStart(today());
    if (v === "calendar") month = today().slice(0, 7);
    history.replaceState(null, "", routeHash());
    render();
    window.scrollTo({ top: 0, behavior: "auto" });
  }
  function defaultDate() {
    if (view === "calendar")
      return (
        selectedDate ||
        (month === today().slice(0, 7) ? today() : month + "-01")
      );
    if (view === "week") return week === weekStart(today()) ? today() : week;
    return today();
  }
  let editOriginal = null,
    projectOriginal = null;
  function openTaskDetail(id) {
    const t = state.tasks.find((t) => t.id === id);
    if (!t) {
      toast("할 일을 찾을 수 없습니다.");
      return;
    }
    const row = (label, value) =>
      `<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`;
    const days = (t.repeatDays || []).map((d) => dayNames[d]).join(" · ");
    $("#task-detail-content").innerHTML =
      `<h3 class="task-detail-title">${esc(t.title)}</h3><dl class="task-detail-fields">${row("날짜", t.date ? t.date.slice(0, 4) + "년 " + friendly(t.date) : "날짜 미정")}${row("시간", t.time ? timeLabel(t) : "시간 미정")}${row("우선순위", { high: "높음", medium: "보통", low: "낮음" }[t.priority])}${t.showProjectInDetail && project(t.project) ? row("프로젝트", project(t.project).name) : ""}${row("반복", t.repeat && t.repeat !== "none" ? repeatLabel(t) + (days ? " · " + days : "") : "반복 안 함")}${t.repeatUntil ? row("반복 종료", friendly(t.repeatUntil) + (t.repeatUntilTime ? " " + t.repeatUntilTime : "")) : ""}${t.dueDate ? row("마감", friendly(t.dueDate) + (t.dueTime ? " " + t.dueTime : "")) : ""}</dl>${t.notes ? `<section class="task-detail-notes"><h3>메모</h3><p>${esc(t.notes)}</p></section>` : ""}`;
    $("#task-detail-edit").dataset.detailEdit = id;
    if (!$("#task-detail-dialog").open) $("#task-detail-dialog").showModal();
  }
  function openTask(id = null, date = defaultDate()) {
    editId = id;
    let t = state.tasks.find((t) => t.id === id);
    if (id && !t) {
      toast("할 일을 찾을 수 없습니다.");
      return;
    }
    editOriginal = t ? JSON.stringify(t) : null;
    $("#task-form").reset();
    $("#task-form .form-error")?.remove();
    $("#dialog-title").textContent = t ? "할 일 수정" : "새로운 할 일";
    $("#delete-task").hidden = !t;
    $("#project-select").innerHTML =
      '<option value="">프로젝트 없음</option>' +
      state.projects
        .map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`)
        .join("");
    const f = $("#task-form").elements;
    for (const n of [
      "title",
      "date",
      "time",
      "endTime",
      "dueDate",
      "dueTime",
      "repeatUntil",
      "repeatUntilTime",
      "priority",
      "project",
      "repeat",
      "notes",
    ])
      f[n].value = t
        ? t[n] || ""
        : { date, priority: "medium", repeat: "none", project: projectFilter }[
            n
          ] || "";
    f.showProjectInDetail.checked = t?.showProjectInDetail === true;
    f.star.checked = t?.star || false;
    $("#task-form .deadline-settings").open = !!t?.dueDate;
    setRepeatDays(t);
    updateRepeatSettings();
    updateDateWeekdays();
    $("#task-dialog").showModal();
    setTimeout(() => f.title.focus(), 20);
  }
  function updateDateWeekdays() {
    document
      .querySelectorAll('#task-form input[type="date"]')
      .forEach((input) => {
        let badge = input.parentElement.querySelector(".date-weekday");
        if (!badge) {
          badge = document.createElement("span");
          badge.className = "date-weekday";
          badge.setAttribute("aria-live", "polite");
          input.parentElement.insertBefore(badge, input);
        }
        const date = parseDate(input.value);
        badge.textContent =
          input.value && Number.isFinite(+date)
            ? `(${dayNames[date.getDay()]})`
            : "";
      });
  }
  $("#task-form").addEventListener("change", (e) => {
    if (e.target.type === "date") updateDateWeekdays();
  });
  function setRepeatDays(t) {
    const f = $("#task-form").elements,
      day = f.date.value
        ? parseDate(f.date.value).getDay()
        : new Date().getDay();
    const days =
      t?.repeatDays ||
      (f.repeat.value === "weekly" ? [day] : [0, 1, 2, 3, 4, 5, 6]);
    document
      .querySelectorAll("#task-form [name=repeatDays]")
      .forEach((x) => (x.checked = days.includes(Number(x.value))));
  }
  function updateRepeatSettings() {
    const kind = $("#task-form").elements.repeat.value;
    $("#repeat-settings").hidden = kind === "none";
    $("#repeat-help").textContent =
      kind === "monthly" || kind === "yearly"
        ? "시작 날짜를 기준으로 반복합니다. 기준일이 없는 달은 말일을 사용하고, 제외한 요일이면 다음 선택 요일로 옮깁니다."
        : "선택한 요일에만 다음 일정이 생성됩니다.";
  }
  $("#task-form").addEventListener("change", (e) => {
    if (e.target.name === "repeat") {
      setRepeatDays();
      updateRepeatSettings();
    }
  });
  function openProject(id = null) {
    editProjectId = id;
    let p = project(id);
    if (id && !p) {
      toast("프로젝트를 찾을 수 없습니다.");
      return;
    }
    projectOriginal = p ? JSON.stringify(p) : null;
    $("#project-form").reset();
    $("#project-form .form-error")?.remove();
    $("#project-dialog-title").textContent = p
      ? "프로젝트 수정"
      : "새 프로젝트";
    $("#project-form").elements.name.value = p?.name || "";
    $("#project-form").elements.color.value = p?.color || "#6c7de0";
    $("#delete-project").hidden = !p;
    $("#project-dialog").showModal();
  }
  function confirmAction(title, description) {
    return new Promise((resolve) => {
      $("#confirm-title").textContent = title;
      $("#confirm-description").textContent = description;
      const d = $("#confirm-dialog");
      d.showModal();
      $("#confirm-no").onclick = () => {
        d.close();
        resolve(false);
      };
      $("#confirm-yes").onclick = () => {
        d.close();
        resolve(true);
      };
      d.oncancel = () => resolve(false);
    });
  }
  window.addEventListener("todo:sync-status", () => showStorageState());
  function showStorageState() {
    for (const id of ["mobile-sync-status", "more-sync-status"]) {
      const el = document.getElementById(id);
      if (el) el.textContent = globalThis.HaruCloud?.status || "기기에 저장됨";
    }
    const indicator = $(".storage");
    indicator.innerHTML = storageFailed
      ? '<span class="live-dot"></span>저장 오류 · 백업 필요'
      : '<span class="live-dot"></span><button class="sync-status-button" data-action="storage-info" title="로컬 저장 안내">' +
        esc(globalThis.HaruCloud?.status || "기기에 저장됨") +
        "</button>" +
        "<small>이 브라우저에만 저장 · 정기적으로 백업하세요</small>";
    $("#storage-warning").hidden = !storageFailed;
  }
  function notifyError(message) {
    const form = $("dialog[open] form");
    if (form) {
      let el = form.querySelector(".form-error");
      if (!el) {
        el = document.createElement("p");
        el.className = "form-error";
        el.setAttribute("role", "alert");
        form.prepend(el);
      }
      el.textContent = message;
    }
    toast(message);
  }
  function failure(error) {
    storageFailed = true;
    showStorageState();
    notifyError(
      error?.message?.includes("다른 탭")
        ? error.message
        : "저장하지 못했습니다. 입력 내용은 유지됩니다. 저장 공간과 백업 파일을 확인해 주세요.",
    );
  }
  function change(fn, message = "", undo = "") {
    try {
      state = persistence.transact((d) => {
        fn(d);
        Core.expandRecurrences(d, recurrenceHorizon(), uid);
      });
      storageFailed = false;
      showStorageState();
      renderPreservingNote();
      if (message) toast(message, undo);
      return true;
    } catch (error) {
      if (/다른 탭|찾을 수|삭제되었|복원할/.test(error.message))
        notifyError(error.message);
      else failure(error);
      return false;
    }
  }
  function renderPreservingNote() {
    const detail = $("#task-detail-dialog");
    if (detail.open) {
      const id = $("#task-detail-edit").dataset.detailEdit;
      if (state.tasks.some((t) => t.id === id)) openTaskDetail(id);
      else {
        detail.close();
        toast("이 일정이 다른 곳에서 삭제되었습니다.");
      }
    }
    const note = $("#weekly-note"),
      focused = document.activeElement === note,
      selection = focused ? [note.selectionStart, note.selectionEnd] : null;
    render();
    if (focused && $("#weekly-note")) {
      $("#weekly-note").focus();
      $("#weekly-note").setSelectionRange(...selection);
    }
  }
  function download(text, name) {
    const blob = new Blob([text], { type: "application/json" }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function restoreItem(id) {
    change((d) => Core.restore(d, id), "복원했습니다.");
  }
  function renderTrash() {
    const items = [...state.trash]
      .reverse()
      .filter(
        (x) => !query || x.label.toLowerCase().includes(query.toLowerCase()),
      );
    $("#main").innerHTML =
      heading("휴지통") +
      `<section class="panel list-panel"><div class="panel-heading"><h2>삭제한 항목<span>${items.length}개</span></h2></div>${items.map((item) => `<div class="task-row"><div class="task-text"><span class="task-title">${esc(item.label)}</span><span class="task-meta">${new Date(item.deletedAt).toLocaleDateString("ko-KR")} · 할 일 ${item.tasks.length}개${item.projects.length ? ` · 프로젝트 ${item.projects.length}개` : ""}</span></div><button class="secondary" data-restore="${esc(item.id)}">복원</button></div>`).join("") || empty("삭제한 항목이 없습니다.")}</section>`;
  }
  function toggleTask(id) {
    change((d) => {
      const t = d.tasks.find((t) => t.id === id);
      if (!t) throw Error("할 일을 찾을 수 없습니다.");
      Core.updateTask(
        d,
        id,
        { status: t.status === "done" ? "todo" : "done" },
        uid,
      );
    });
  }
  $("#task-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target.elements,
      title = f.title.value.trim();
    if (!title) {
      f.title.setCustomValidity("할 일을 입력해 주세요.");
      f.title.reportValidity();
      return;
    }
    const data = {
      title,
      date: f.date.value,
      time: f.time.value,
      endTime: f.endTime.value,
      dueDate: f.dueDate.value,
      dueTime: f.dueTime.value,
      repeatUntil: f.repeat.value === "none" ? "" : f.repeatUntil.value,
      repeatUntilTime: f.repeat.value === "none" ? "" : f.repeatUntilTime.value,
      repeatDays:
        f.repeat.value === "none"
          ? undefined
          : [
              ...$("#task-form").querySelectorAll("[name=repeatDays]:checked"),
            ].map((x) => Number(x.value)),
      priority: f.priority.value,
      project: f.project.value,
      status: state.tasks.find((t) => t.id === editId)?.status || "todo",
      showProjectInDetail: f.showProjectInDetail.checked,
      repeat: f.repeat.value,
      notes: f.notes.value,
      star: f.star.checked,
    };
    if (data.repeat !== "none" && !data.date) {
      f.date.setCustomValidity("반복할 날짜를 선택해 주세요.");
      f.date.reportValidity();
      return;
    }
    try {
      Core.validate({
        version: 1,
        tasks: [{ id: editId || "draft", ...data }],
        projects: state.projects,
        notes: {},
      });
    } catch (error) {
      notifyError(error.message);
      return;
    }
    if (
      change((d) => {
        const current = d.tasks.find((t) => t.id === editId);
        if (editId && JSON.stringify(current) !== editOriginal)
          throw Error(
            "다른 탭에서 이 할 일이 변경되었습니다. 내용을 확인하고 다시 열어 주세요.",
          );
        if (data.project && !d.projects.some((p) => p.id === data.project))
          data.project = "";
        if (
          current &&
          (current.date !== data.date ||
            current.repeat !== data.repeat ||
            JSON.stringify(current.repeatDays || []) !==
              JSON.stringify(data.repeatDays))
        ) {
          data.repeatAnchor = data.date;
          data.repeatIndex = 0;
        }
        Core.updateTask(d, editId, data, uid);
      }, "저장했습니다.")
    )
      $("#task-dialog").close();
  });
  $("#task-form").addEventListener("input", (e) => {
    if (e.target.setCustomValidity) e.target.setCustomValidity("");
    if (e.target.type === "date") updateDateWeekdays();
  });
  $("#project-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target.elements,
      name = f.name.value.trim();
    if (!name) {
      f.name.setCustomValidity("이름을 입력해 주세요.");
      f.name.reportValidity();
      return;
    }
    if (
      change((d) => {
        let p = d.projects.find((p) => p.id === editProjectId);
        if (editProjectId && JSON.stringify(p) !== projectOriginal)
          throw Error(
            "다른 탭에서 이 프로젝트가 변경되었습니다. 다시 열어 주세요.",
          );
        if (p) Object.assign(p, { name, color: f.color.value, sample: false });
        else
          d.projects.push({
            id: uid(),
            name,
            color: f.color.value,
            sample: false,
          });
      }, "저장했습니다.")
    )
      $("#project-dialog").close();
  });
  $("#project-form").addEventListener("input", (e) => {
    if (e.target.setCustomValidity) e.target.setCustomValidity("");
  });
  document.addEventListener("click", async (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.view) {
      navigate(b.dataset.view);
      return;
    }
    if (b.dataset.projectView) {
      navigate("project", b.dataset.projectView);
      return;
    }
    if (b.dataset.taskDetail) {
      openTaskDetail(b.dataset.taskDetail);
      return;
    }
    if (b.dataset.detailEdit) {
      const id = b.dataset.detailEdit;
      $("#task-detail-dialog").close();
      openTask(id);
      return;
    }
    if (b.dataset.edit) {
      if (
        view === "calendar" &&
        b.closest("#day-detail") &&
        !b.classList.contains("task-edit")
      )
        openTaskDetail(b.dataset.edit);
      else openTask(b.dataset.edit);
      return;
    }
    if (b.dataset.toggle) {
      toggleTask(b.dataset.toggle);
      return;
    }
    if (b.dataset.star) {
      change((d) => {
        let t = d.tasks.find((t) => t.id === b.dataset.star);
        if (t) {
          t.star = !t.star;
          t.sample = false;
        }
      });
      return;
    }
    if (b.dataset.restore) {
      restoreItem(b.dataset.restore);
      return;
    }
    if (b.dataset.editProject) {
      openProject(b.dataset.editProject);
      return;
    }
    if (b.hasAttribute("data-add-date")) {
      openTask(null, b.dataset.addDate);
      return;
    }
    if (b.dataset.calendarDate) {
      if (matchMedia("(max-width:620px)").matches) {
        selectedDate = b.dataset.calendarDate;
        render();
        $("#day-detail")?.scrollIntoView({
          block: "start",
          behavior: "smooth",
        });
      } else openTask(null, b.dataset.calendarDate);
      return;
    }
    if (b.dataset.dateView) {
      const date = b.dataset.dateView;
      if (view === "today") {
        view = "calendar";
        month = date.slice(0, 7);
        filter = "all";
        history.replaceState(null, "", routeHash());
      }
      selectedDate = date;
      render();
      $("#day-detail")?.scrollIntoView({ block: "start", behavior: "smooth" });
      return;
    }
    if (b.dataset.filter) {
      filter = b.dataset.filter;
      render();
      return;
    }
    const action = b.dataset.action;
    if (action === "storage-info") toast("이 브라우저에 저장됩니다. 백업 파일로 다른 기기에 옮길 수 있어요.");
    if (action === "add") openTask();
    if (action === "new-project") openProject();
    if (action === "close") b.closest("dialog").close();
    if (action === "close-date") {
      selectedDate = null;
      render();
    }
    if (action === "delete-task") {
      const id = editId;
      let trashId;
      const label = state.tasks.find((t) => t.id === id)?.title || "할 일";
      if (
        change((d) => {
          trashId = Core.moveToTrash(d, [id], [], label, uid);
        }, "휴지통으로 이동했습니다.")
      ) {
        $("#task-dialog").close();
        if (trashId) toast("휴지통으로 이동했습니다.", trashId);
      }
    }
    if (action === "delete-project") {
      const id = editProjectId;
      $("#project-dialog").close();
      if (
        await confirmAction(
          "프로젝트를 휴지통으로 옮길까요?",
          "할 일은 유지하고 프로젝트 연결만 해제합니다. 휴지통에서 복원할 수 있습니다.",
        )
      ) {
        let trashId;
        const name = project(id)?.name || "프로젝트";
        if (
          change((d) => {
            trashId = Core.moveToTrash(d, [], [id], name, uid);
          }, "휴지통으로 이동했습니다.")
        ) {
          if (projectFilter === id) navigate("projects");
          if (trashId) toast("휴지통으로 이동했습니다.", trashId);
        }
      }
    }
    if (["prev", "next", "current"].includes(action)) {
      const n = action === "prev" ? -1 : 1;
      if (view === "week")
        week = action === "current" ? weekStart(today()) : addDays(week, n * 7);
      else {
        const d = parseDate(month + "-01");
        d.setMonth(d.getMonth() + n);
        month =
          action === "current" ? today().slice(0, 7) : dateKey(d).slice(0, 7);
      }
      selectedDate = null;
      render();
    }
    if (
      action === "clear-samples" &&
      (await confirmAction(
        "예시 데이터를 휴지통으로 옮길까요?",
        "직접 추가하거나 수정한 항목은 유지됩니다. 휴지통에서 복원할 수 있습니다.",
      ))
    ) {
      let trashId;
      if (
        change((d) => {
          const ids = d.tasks.filter((t) => t.sample).map((t) => t.id),
            ps = d.projects
              .filter(
                (p) =>
                  p.sample &&
                  !d.tasks.some(
                    (t) => t.project === p.id && !ids.includes(t.id),
                  ),
              )
              .map((p) => p.id);
          trashId = Core.moveToTrash(d, ids, ps, "예시 데이터", uid);
        }, "예시 데이터를 정리했습니다.") &&
        trashId
      )
        toast("휴지통으로 이동했습니다.", trashId);
    }
    if (action === "export") {
      download(JSON.stringify(state, null, 2), `haru-backup-${today()}.json`);
      toast("백업 파일을 내려받았습니다.");
    }
    if (action === "export-raw") {
      try {
        download(persistence.raw(), `haru-original-${today()}.json`);
      } catch {
        toast("브라우저 저장소에 접근할 수 없습니다.");
      }
    }
    if (action === "export-recovery") {
      try {
        const raw = persistence.recovery();
        if (raw) download(raw, `haru-before-import-${today()}.json`);
        else toast("가져오기 전 백업이 없습니다.");
      } catch {
        toast("백업을 읽지 못했습니다.");
      }
    }
    if (action === "import") $("#import-file").click();
  });
  document.addEventListener("change", (e) => {
    if (e.target.id === "project-filter") {
      projectFilter = e.target.value;
      render();
    }
    if (e.target.id === "status-filter") {
      filter = e.target.value;
      render();
    }
    if (e.target.id === "sort-order") {
      sortMode = e.target.value;
      render();
    }
  });
  document.addEventListener("input", (e) => {
    if (e.target.id === "weekly-note") {
      const text = e.target.value,
        start = weekStart(today());
      try {
        state = persistence.transact((d) => {
          d.notes[start] = text;
        });
        storageFailed = false;
        showStorageState();
      } catch (error) {
        failure(error);
      }
    }
  });
  $("#search").addEventListener("input", (e) => {
    query = e.target.value;
    if (query && view !== "trash" && view !== "projects") {
      view = "all";
      projectFilter = "";
      filter = "all";
      history.replaceState(null, "", routeHash());
    }
    render();
  });
  $("#import-file").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      if (file.size > 10000000)
        throw Error("10MB 이하의 백업 파일을 선택해 주세요.");
      const data = Core.validate(JSON.parse(await file.text()));
      if (
        await confirmAction(
          "백업 파일을 가져올까요?",
          `현재 내용을 할 일 ${data.tasks.length}개, 프로젝트 ${data.projects.length}개로 교체합니다. 가져오기 전 데이터는 별도 복구 백업으로 보관합니다.`,
        )
      ) {
        state = persistence.replace(data);
        storageFailed = false;
        showStorageState();
        navigate("today");
        toast("백업을 가져왔습니다.");
      }
    } catch (error) {
      toast(
        error instanceof SyntaxError
          ? "올바른 JSON 백업 파일을 선택해 주세요."
          : error.message || "백업을 가져오지 못했습니다.",
      );
    }
    e.target.value = "";
  });
  document.addEventListener("keydown", (e) => {
    const editing =
      ["INPUT", "TEXTAREA", "SELECT"].includes(
        document.activeElement.tagName,
      ) || document.activeElement.isContentEditable;
    if (e.key === "/" && !editing && !$("dialog[open]")) {
      e.preventDefault();
      $("#search").focus();
    }
    if (
      (e.key === "n" || e.key === "N") &&
      !editing &&
      !e.ctrlKey &&
      !e.metaKey &&
      !$("dialog[open]")
    ) {
      e.preventDefault();
      openTask();
    }
    if (e.key === "Escape" && !$("dialog[open]")) {
      $("#search").value = "";
      query = "";
      render();
    }
  });
  let dragged = null;
  document.addEventListener("dragstart", (e) => {
    const card = e.target.closest("[data-drag]");
    if (card) {
      dragged = card.dataset.drag;
      e.dataTransfer.setData("text/plain", dragged);
      e.dataTransfer.effectAllowed = "move";
    }
  });
  document.addEventListener("dragover", (e) => {
    const col = e.target.closest("[data-drop]");
    if (col && dragged) {
      e.preventDefault();
      col.classList.add("drag-over");
    }
  });
  document.addEventListener("dragleave", (e) => {
    const col = e.target.closest("[data-drop]");
    if (col && !col.contains(e.relatedTarget))
      col.classList.remove("drag-over");
  });
  document.addEventListener("drop", (e) => {
    const col = e.target.closest("[data-drop]");
    if (!col || !dragged) return;
    e.preventDefault();
    const id = dragged,
      date = col.dataset.drop;
    change((d) => {
      Core.moveTask(d, id, date);
    }, "일정을 옮겼습니다.");
    dragged = null;
  });
  document.addEventListener("dragend", () => {
    dragged = null;
    $$(".drag-over").forEach((el) => el.classList.remove("drag-over"));
  });
  document.addEventListener("click", (e) => {
    if (e.target.closest(".brand,.mobile-brand")) {
      e.preventDefault();
      navigate("today");
    }
  });
  window.addEventListener("storage", (e) => {
    if (e.key !== key && e.key !== null) return;
    if (storageFailed && document.activeElement.id === "weekly-note") return;
    try {
      state = persistence.reload();
      storageFailed = false;
      showStorageState();
      renderPreservingNote();
    } catch (error) {
      failure(error);
    }
  });
  let seenDay = today();
  function refreshDay() {
    if (today() !== seenDay) {
      const old = seenDay;
      seenDay = today();
      if (week === weekStart(old)) week = weekStart(seenDay);
      if (month === old.slice(0, 7)) month = seenDay.slice(0, 7);
      renderPreservingNote();
    }
  }
  window.addEventListener("focus", () => {
    if (storageFailed && document.activeElement.id === "weekly-note") return;
    try {
      state = persistence.reload();
      storageFailed = false;
      showStorageState();
      renderPreservingNote();
    } catch (error) {
      failure(error);
    }
    refreshDay();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refreshDay();
  });
  setInterval(refreshDay, 60000);
  function readRoute() {
    const [route, projectId] = location.hash.slice(1).split("/");
    projectFilter = "";
    if (
      [
        "today",
        "all",
        "week",
        "calendar",
        "projects",
        "completed",
        "trash",
        "more",
      ].includes(route)
    )
      view = route;
    else if (route === "project" && projectId) {
      try {
        projectFilter = decodeURIComponent(projectId);
        view = state.projects.some((p) => p.id === projectFilter)
          ? "project"
          : "projects";
      } catch {
        view = "projects";
        projectFilter = "";
      }
    } else view = "today";
    render();
  }
  function updateVisibleViewport() {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const inset = Math.max(
      0,
      Math.round(innerHeight - viewport.height - viewport.offsetTop),
    );
    document.documentElement.style.setProperty(
      "--app-visible-height",
      Math.round(viewport.height) + "px",
    );
    document.documentElement.style.setProperty(
      "--keyboard-inset",
      inset + "px",
    );
    document.body.classList.toggle(
      "keyboard-open",
      inset > 120 && document.activeElement.matches("input,textarea,select"),
    );
  }
  window.visualViewport?.addEventListener("resize", updateVisibleViewport);
  window.visualViewport?.addEventListener("scroll", updateVisibleViewport);
  document.addEventListener("focusin", updateVisibleViewport);
  document.addEventListener("focusout", () =>
    requestAnimationFrame(updateVisibleViewport),
  );
  updateVisibleViewport();
  matchMedia("(max-width:620px)").addEventListener("change", () => {
    if (!$("dialog[open]")) renderPreservingNote();
  });
  window.addEventListener("hashchange", readRoute);
  showStorageState();
  readRoute();
})();
