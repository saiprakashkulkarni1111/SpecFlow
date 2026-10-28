export function renderCode(state) {
  const db = state.metadata.stack.find((item) => /sqlite|postgresql/i.test(item)) || "SQLite";
  document.querySelector("#codeDb").textContent = db.toLowerCase();
  return state.codeScaffolds;
}
