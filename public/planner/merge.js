(function (root, factory) {
  const api = factory(typeof module === "object" && module.exports
    ? require("./planner-core.cjs") : root.HaruCore);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ToDoMerge = api;
})(globalThis, (Core) => {
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b),
    clone = (x) => JSON.parse(JSON.stringify(x));
  function records(base, local, remote) {
    const b = new Map(base.map((x) => [x.id, x])),
      l = new Map(local.map((x) => [x.id, x])),
      r = new Map(remote.map((x) => [x.id, x])),
      out = [];
    for (const id of new Set([...b.keys(), ...r.keys(), ...l.keys()])) {
      const before = b.get(id),
        mine = l.get(id),
        theirs = r.get(id);
      if (!mine && before) continue;
      if (!mine) {
        if (theirs) out.push(clone(theirs));
        continue;
      }
      if (!theirs && before) continue;
      if (same(before, mine)) {
        if (theirs) out.push(clone(theirs));
        continue;
      }
      if (!before || !theirs) {
        if (
          !before &&
          theirs &&
          mine.series === theirs.series &&
          mine.series &&
          (mine.generatedFrom || mine.autoOccurrence)
        ) {
          const value = clone(
            mine.autoOccurrence === false
              ? { ...theirs, ...mine }
              : { ...mine, ...theirs },
          );
          value.status = [mine.status, theirs.status].includes("done")
            ? "done"
            : [mine.status, theirs.status].includes("doing")
              ? "doing"
              : mine.status;
          if (mine.star !== undefined || theirs.star !== undefined)
            value.star = !!(mine.star || theirs.star);
          out.push(value);
        } else out.push(clone(mine));
        continue;
      }
      const value = { ...theirs };
      for (const key of new Set([...Object.keys(before), ...Object.keys(mine)]))
        if (!same(before[key], mine[key])) {
          if (mine[key] === undefined) delete value[key];
          else value[key] = clone(mine[key]);
        }
      out.push(value);
    }
    return out;
  }
  function merge(base, local, remote) {
    const empty = { version: 1, tasks: [], projects: [], trash: [], notes: {} };
    base = base || empty;
    remote = remote || empty;
    local = local || empty;
    // Devices may have expanded the same recurrence with different random IDs.
    // Reconcile that identity before merging status, edits, or trash records.
    const aliases = new Map(),
      identities = new Map();
    for (const state of [base, remote, local])
      for (const task of [
        ...state.tasks,
        ...(state.trash || []).flatMap((x) => x.tasks),
      ]) {
        if (!task.series || (!task.autoOccurrence && !task.generatedFrom))
          continue;
        const identity = task.series + "|" + task.date,
          id = identities.get(identity) || task.id;
        identities.set(identity, id);
        if (task.id !== id) aliases.set(task.id, id);
      }
    const canonical = (state) => {
      const value = clone(state),
        fix = (task) => {
          task.id = aliases.get(task.id) || task.id;
          if (aliases.has(task.generatedFrom))
            task.generatedFrom = aliases.get(task.generatedFrom);
        };
      value.tasks.forEach(fix);
      for (const item of value.trash || []) {
        item.tasks.forEach(fix);
        for (const link of item.links || [])
          link.task = aliases.get(link.task) || link.task;
      }
      return value;
    };
    base = canonical(base);
    local = canonical(local);
    remote = canonical(remote);
    const result = {
      version: 1,
      tasks: records(base.tasks, local.tasks, remote.tasks),
      projects: records(base.projects, local.projects, remote.projects),
      trash: records(base.trash || [], local.trash || [], remote.trash || []),
      notes: { ...remote.notes },
    };
    // Compare the last synced snapshot to detect permanent removal without storing tombstones.
    const removed = [...Core.removedTrash(base, local), ...Core.removedTrash(base, remote)];
    if (removed.length) Core.removeDeletedRecords(result, removed);
    for (const key of new Set([
      ...Object.keys(base.notes || {}),
      ...Object.keys(local.notes || {}),
    ]))
      if (!same(base.notes[key], local.notes[key])) {
        if (local.notes[key] === undefined) delete result.notes[key];
        else result.notes[key] = local.notes[key];
      }
    const deleted = new Set(
      result.trash.flatMap((item) => item.tasks.map((t) => t.id)),
    );
    result.tasks = result.tasks.filter((t) => !deleted.has(t.id));
    return result;
  }
  function meaningful(local) {
    const tasks = local.tasks.filter((t) => !t.sample),
      used = new Set(tasks.map((t) => t.project));
    return {
      ...local,
      tasks,
      projects: local.projects.filter((p) => !p.sample || used.has(p.id)),
    };
  }
  return { merge, meaningful };
});
