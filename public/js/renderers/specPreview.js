export function renderSpec(state) {
  const db = state.metadata.stack.find((item) => /sqlite|postgresql/i.test(item)) || "SQLite";
  document.querySelector("#stackBadges").innerHTML = state.metadata.stack.map((item) => `<i>${item}</i>`).join("");
  document.querySelector("#tableDb").textContent = db;
  document.querySelector("#docBody").textContent = state.documentSections[0].content;
  document.querySelector("#retryText").textContent = `Failed writes use exponential backoff and preserve the original incident payload for auditability in ${db}.`;
  document.querySelector("#updated").textContent = `UPDATED ${new Date(state.metadata.lastUpdated).toLocaleTimeString()}`;
}
