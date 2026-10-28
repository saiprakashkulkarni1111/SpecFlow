import { store, seedTranscript } from "./state/store.js";
import { compileIntent } from "./compiler/intentRouter.js";
import { createVoiceIngest } from "./compiler/voiceIngest.js";
import { renderThoughtStream } from "./renderers/thoughtStream.js";
import { renderSpec } from "./renderers/specPreview.js";
import { renderMermaid } from "./renderers/mermaidCanvas.js";
import { renderCode } from "./renderers/codeScaffold.js";
import { exportDocx } from "./exporters/docxGenerator.js";
import { exportPdf } from "./exporters/pdfGenerator.js";

const $ = (selector) => document.querySelector(selector);
const input = $("#input");
const toast = $("#toast");
let compileTimer;

function notify(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => toast.classList.remove("show"), 2800);
}

function render() {
  const state = store.get();
  renderThoughtStream(state, $("#stream"), (id) => {
    if (store.revert(id)) { render(); notify("Thought reverted and artifacts restored."); }
    else notify("The seed thought cannot be reverted.");
  });
  renderSpec(state);
  renderMermaid(state);
  renderCode(state);
  $("#count").textContent = `${String(state.thoughtHistory.length).padStart(2, "0")} THOUGHTS`;
}

function commit() {
  const raw = input.value.trim();
  if (!raw) return;
  $("#dockStatus").textContent = "EXTRACTING ENTITIES…";
  const pending = document.createElement("article");
  pending.innerHTML = `<div class="meta"><b>••</b> NOW <strong>PROCESSING</strong></div><p class="skeleton-line">Compiling entities, patches, and artifacts…</p>`;
  $("#stream").append(pending);
  clearTimeout(compileTimer);
  compileTimer = setTimeout(() => {
    $("#dockStatus").textContent = "SYNCING ARTIFACTS…";
    const mode = $(".mode.active")?.textContent.includes("SURGICAL") ? "SURGICAL_EDIT" : "APPEND";
    const next = compileIntent(store.get(), raw, mode);
    setTimeout(() => {
      pending.remove();
      store.commit(next);
      render();
      input.value = "";
      $("#dockStatus").textContent = "READY FOR REQUIREMENTS";
      notify("State graph compiled across spec, diagram, and code.");
    }, 400);
  }, 1200);
}

$("#commit").addEventListener("click", commit);
input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); commit(); }
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") commit();
});
$("#undo").addEventListener("click", () => { if (store.undo()) { render(); notify("Undid the last state graph patch."); } else notify("Nothing to undo."); });
$("#redo").addEventListener("click", () => { if (store.redo()) { render(); notify("Reapplied the state graph patch."); } else notify("Nothing to redo."); });
$("#exportDocx").addEventListener("click", () => { exportDocx(store.get()); notify("Specification exported for Word."); });
$("#exportPdf").addEventListener("click", () => { if (!exportPdf(store.get())) notify("Allow pop-ups to export PDF."); });
$("#settingsButton").addEventListener("click", () => $("#settings").showModal());

const presets = {
  initial: "Okay, let's spec out the authentication and telemetry pipeline. The edge gateway sends a JSON payload over WebSocket every 5 seconds. If the gas or flame threshold spikes, trigger an immediate webhook to the Express server, log the incident in SQLite, and add a section in the security compliance doc explaining our fail-safe retry logic.",
  followup: "Actually, SQLite won't scale if we have 50 edge gateways. Swap SQLite for PostgreSQL, add a Redis caching layer in front of it, and add a table comparing the latency of the 5-second WebSocket vs the emergency webhook.",
  custom: ""
};
document.querySelectorAll("[data-preset]").forEach((button) => button.addEventListener("click", () => { input.value = presets[button.dataset.preset]; if (button.dataset.preset === "custom") input.focus(); }));
document.querySelectorAll(".tab").forEach((button) => button.addEventListener("click", () => { document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active")); button.classList.add("active"); document.querySelectorAll(".view").forEach((view) => { view.hidden = view.id !== button.dataset.tab; }); }));
document.querySelectorAll(".mode").forEach((button) => button.addEventListener("click", () => { document.querySelectorAll(".mode").forEach((item) => item.classList.remove("active")); button.classList.add("active"); }));
createVoiceIngest({ input, speakButton: $("#speak"), status: (message) => { $("#dockStatus").textContent = message; }, onFinal: commit });
if (!input.placeholder) input.placeholder = "Try: “Actually, SQLite won't scale for 50 edge gateways. Swap SQLite for PostgreSQL.”";
render();
