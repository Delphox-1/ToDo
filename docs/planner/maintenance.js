(() => {
  "use strict";
  let busy = false;
  const ja = () => globalThis.ToDoI18n?.language === "ja";
  const copy = (ko, jp) => ja() ? jp : ko;
  const dialog = document.createElement("dialog");
  dialog.className = "database-check-dialog";
  const title = document.createElement("h2");
  const description = document.createElement("p");
  const output = document.createElement("p");
  output.setAttribute("role", "status"); output.style.whiteSpace = "pre-line";
  const close = document.createElement("button"); close.type = "button"; close.className = "primary";
  close.textContent = copy("닫기", "閉じる"); close.onclick = () => dialog.close();
  dialog.append(title, description, output, close); document.body.append(dialog);
  document.addEventListener("click", async event => {
    const button = event.target.closest?.('[data-action="database-check"]');
    if (!button || busy) return;
    busy = true; button.disabled = true; close.textContent = copy("닫기", "閉じる");
    title.textContent = copy("데이터베이스 검사", "データベースをチェック");
    description.textContent = copy("현재 브라우저에 저장된 데이터만 검사하고 불필요한 공백을 정리합니다. 휴지통의 30일 보관 기간이 지난 항목은 영구 삭제되며 내부 복구본도 정리됩니다. 사용 중인 일정과 메모는 유지됩니다.", "このブラウザーの保存データだけを検査し、不要な空白を整理します。ゴミ箱で30日を過ぎた項目は完全削除され、内部の復元用データからも除去されます。使用中の予定とメモは保持されます。");
    output.textContent = copy("검사 중…", "検査中…"); dialog.showModal();
    try {
      const user = globalThis.ToDoAccount;
      if (!user?.userId) throw Error("sign_in_required");
      const key = user.storageKey;
      const before = localStorage.getItem(key);
      let parsed, state;
      try { parsed = before ? JSON.parse(before) : {version:1,tasks:[],projects:[],trash:[],notes:{}};
        state = HaruCore.validate(structuredClone(parsed));
      } catch { throw Error("invalid_data"); }
      const compact = JSON.stringify(state);
      HaruCore.scrubRecovery(localStorage, key, HaruCore.removedTrash(parsed, state));
      if (before !== compact) {
        localStorage.setItem(key, compact);
        window.dispatchEvent(new StorageEvent("storage", {key, oldValue:before, newValue:compact}));
      }
      const result = {tasks:state.tasks.length,projects:state.projects.length,trash:state.trash.length,notes:Object.keys(state.notes).length,
        bytesBefore:new TextEncoder().encode(before || "").length,bytesAfter:new TextEncoder().encode(compact).length,
        expiredSessionsRemoved:0,compacted:before!==compact};
      output.textContent = copy(
        `검사 완료 · 데이터 정상\n할 일 ${result.tasks}개 · 프로젝트 ${result.projects}개 · 메모 ${result.notes}개 · 휴지통 ${result.trash}개\n저장 크기 ${result.bytesBefore.toLocaleString()} → ${result.bytesAfter.toLocaleString()}바이트\n${result.compacted ? "불필요한 공백을 정리했습니다." : "저장 데이터가 이미 정리되어 있습니다."}\n검사·정리 후에도 데이터 양과 접속 상황에 따라 속도는 달라질 수 있습니다.`,
        `検査完了 · データは正常です\nタスク ${result.tasks}件 · プロジェクト ${result.projects}件 · メモ ${result.notes}件 · ゴミ箱 ${result.trash}件\n保存サイズ ${result.bytesBefore.toLocaleString()} → ${result.bytesAfter.toLocaleString()}バイト\n${result.compacted ? "不要な空白を整理しました。" : "保存データはすでに整理されています。"}\n処理後の速度はデータ量やアクセス状況によって異なります。`);
      if (result.compacted) await globalThis.HaruCloud?.sync();
    } catch (error) {
      const messages = {
        invalid_data: copy("저장 데이터의 이상을 발견했습니다. 데이터를 변경하지 않았습니다. 백업을 보관하고 확인해 주세요.", "保存データの異常を検出しました。データは変更していません。バックアップを保管して確認してください。"),
        revision_conflict: copy("다른 기기에서 데이터가 변경되었습니다. 잠시 후 다시 검사해 주세요. 데이터는 덮어쓰지 않았습니다.", "別の端末でデータが更新されました。しばらくしてから再検査してください。データは上書きしていません。"),
        sign_in_required: copy("로그인 계정을 확인하고 다시 열어 주세요.", "ログイン中のアカウントを確認して開き直してください。")
      };
      output.textContent = messages[error.message] || copy("검사하지 못했습니다. 연결을 확인하고 다시 시도해 주세요. 기기의 기록은 그대로 유지됩니다.", "検査できませんでした。接続を確認して再試行してください。端末の記録は保持されています。");
    } finally { busy = false; button.disabled = false; }
  });
})();
