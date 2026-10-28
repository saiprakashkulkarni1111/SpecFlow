export function renderMermaid(state) {
  const db = state.metadata.stack.find((item) => /sqlite|postgresql/i.test(item)) || "SQLite";
  document.querySelector("#diagramDb").innerHTML = `${db.toUpperCase()}<br><small>DATABASE</small>`;
  document.querySelector("#branchDb").textContent = db;
  return state.mermaidDiagram;
}
