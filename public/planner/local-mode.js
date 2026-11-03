(() => {
  "use strict";
  // This identity only chooses a browser-local storage key. No sign-in or API is used.
  globalThis.ToDoAccount = { userId: "local", storageKey: "todo1-local-v1" };
})();
