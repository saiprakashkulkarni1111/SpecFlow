const escapeHtml = (text) => text.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
export function renderThoughtStream(state, root, onRevert) {
  root.innerHTML = state.thoughtHistory.map((thought, index) => `<article><div class="meta"><b>${String(index + 1).padStart(2, "0")}</b> ${thought.timestamp} <strong>COMMITTED</strong></div><p>“${escapeHtml(thought.rawTranscript)}”</p><div class="tags">${[...thought.entities.nodes, ...thought.entities.logic].map((item) => `<mark>${escapeHtml(item.toUpperCase())}</mark>`).join("")}</div><footer>📄 ${thought.diffSummary.join("　 🔗 ")}　 <button class="revert" data-id="${thought.id}">REVERT THIS THOUGHT</button></footer></article>`).join("");
  root.onclick = (event) => {
    const button = event.target.closest(".revert");
    if (button) onRevert(button.dataset.id);
  };
}
