const $ = (selector) => document.querySelector(selector);
const STORAGE_KEY = "specflow-project-state-v1";
const HISTORY_KEY = "specflow-history-v1";
const seedTranscript = "The edge gateway sends a JSON payload over WebSocket every 5 seconds. If the gas or flame threshold spikes, trigger an immediate webhook to the Express server, log the incident in SQLite, and add fail-safe retry logic.";

const initialState = {
  metadata: { title: "Telemetry Pipeline", version: "1.2", stack: ["WebSocket", "Express", "SQLite"], lastUpdated: new Date().toISOString() },
  thoughtHistory: [{ id: "thought-1", timestamp: "JUST NOW", rawTranscript: seedTranscript, mode: "APPEND", entities: { nodes: ["Edge Gateway", "WebSocket", "Express"], logic: ["Every 5 seconds", "Gas / flame spike"], directives: ["Fail-safe retry logic"] }, diffSummary: ["Added Section 4.2", "Added alert loop"], snapshotBefore: null }],
  documentSections: [{ id: "sec-4-2", heading: "4.2 / TELEMETRY & FAIL-SAFE BEHAVIOR", content: "Telemetry payloads are transmitted from the Edge Gateway via WebSocket at 5-second intervals. The Express ingestion layer validates each JSON payload before persistence.", tables: [] }],
  mermaidDiagram: "sequenceDiagram\n  participant EG as Edge Gateway\n  participant EX as Express Server\n  participant DB as SQLite\n  loop Every 5s\n    EG->>EX: JSON Telemetry (WebSocket)\n  end\n  alt Gas / Flame Spike\n    EG->>EX: Immediate Alert Webhook\n    EX->>DB: INSERT Incident Log\n  end",
  codeScaffolds: [{ filename: "server/routes/telemetry.js", language: "javascript", code: "router.post('/webhook/alert', async (req, res) => {\n  const incident = await validateTelemetry(req.body);\n  if (incident.gasSpike || incident.flameSpike) {\n    await sqlite.incidents.insert({ payload: incident, retry: 'exponential-backoff' });\n  }\n  res.status(202).json({ accepted: true });\n});" }]
};

let state = loadState();
let undoStack = [];
let redoStack = [];
let compileTimer;

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function loadState() { try { return { ...clone(initialState), ...JSON.parse(localStorage.getItem(STORAGE_KEY)) }; } catch { return clone(initialState); } }
function persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); localStorage.setItem(HISTORY_KEY, JSON.stringify({ undoStack, redoStack })); }
function notify(message) { const toast = $("#toast"); toast.textContent = message; toast.classList.add("show"); clearTimeout(notify.timer); notify.timer = setTimeout(() => toast.classList.remove("show"), 2800); }
function escapeHtml(text) { return text.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]); }
function timestamp() { return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }); }

function extractEntities(text) {
  const nodes = ["Edge Gateway", "WebSocket", "Express", "SQLite", "PostgreSQL"].filter((item) => text.toLowerCase().includes(item.toLowerCase()));
  const logic = text.match(/every\s+\d+\s*(?:seconds?|minutes?)|gas|flame|threshold|webhook|retry/gi) || [];
  const directives = text.match(/(?:security|compliance|fail-safe|retry|schema|document|diagram)[^,.]*/gi) || [];
  return { nodes: [...new Set(nodes)], logic: [...new Set(logic)], directives: [...new Set(directives)] };
}

function compileTranscript(raw, mode) {
  const text = raw.trim();
  const dbSwap = text.match(/(?:swap|replace|switch)\s+(SQLite|PostgreSQL)\s+(?:for|with)\s+(PostgreSQL|SQLite)/i);
  const addRedis = /add\s+Redis|Redis\s+cache|caching\s+layer/i.test(text);
  const next = clone(state);
  const entities = extractEntities(text);
  const diffSummary = [];
  if (dbSwap) {
    const target = dbSwap[2];
    next.metadata.stack = next.metadata.stack.map((item) => /sqlite|postgresql/i.test(item) ? target : item);
    next.documentSections[0].content = next.documentSections[0].content.replace(/SQLite|PostgreSQL/gi, target);
    next.mermaidDiagram = next.mermaidDiagram.replace(/SQLite|PostgreSQL/gi, target);
    next.codeScaffolds[0].code = next.codeScaffolds[0].code.replace(/sqlite|postgresql/gi, target.toLowerCase());
    diffSummary.push(`Updated database to ${target}`);
  } else {
    if (/websocket/i.test(text)) diffSummary.push("Confirmed WebSocket telemetry loop");
    if (/webhook/i.test(text)) diffSummary.push("Added emergency webhook path");
    if (/retry/i.test(text)) diffSummary.push("Added fail-safe retry logic");
    next.documentSections[0].content = `${next.documentSections[0].content} ${text.replace(/^okay,?\s*/i, "").trim()}`;
  }
  if (addRedis) {
    if (!next.metadata.stack.includes("Redis")) next.metadata.stack.splice(Math.max(next.metadata.stack.length - 1, 0), 0, "Redis");
    next.documentSections[0].content = `${next.documentSections[0].content} Redis caches hot telemetry reads before persistence.`;
    next.mermaidDiagram = next.mermaidDiagram.replace(/participant DB as (?:SQLite|PostgreSQL)/, `participant CACHE as Redis\n  participant DB as ${next.metadata.stack.find((item) => /sqlite|postgresql/i.test(item)) || "PostgreSQL"}`).replace(/EX->>DB: INSERT Incident Log/, "EX->>CACHE: SET incident TTL\n    CACHE->>DB: INSERT Incident Log");
    next.codeScaffolds[0].code = next.codeScaffolds[0].code.replace("const incident", "const cache = redisClient;\n  const incident").replace("await sqlite.incidents.insert", "await pgPool.query");
    diffSummary.push("Added Redis caching layer");
  }
  next.metadata.lastUpdated = new Date().toISOString();
  next.thoughtHistory.push({ id: `thought-${Date.now()}`, timestamp: timestamp(), rawTranscript: text, mode, entities, diffSummary, snapshotBefore: clone(state) });
  return next;
}

function applyCompiled(next, successMessage) {
  undoStack.push(clone(state)); redoStack = []; state = next; persist(); render(); notify(successMessage);
}

function commit() {
  const input = $("#input");
  if (!input.value.trim()) return;
  const mode = $(".mode.active")?.textContent.includes("SURGICAL") ? "SURGICAL_EDIT" : "APPEND";
  $("#dockStatus").textContent = "EXTRACTING ENTITIES…";
  const pending = document.createElement("article");
  pending.id = "pendingThought";
  pending.innerHTML = `<div class="meta"><b>••</b> NOW <strong>PROCESSING</strong></div><p class="skeleton-line">Compiling entities, patches, and artifacts…</p>`;
  $("#stream").append(pending);
  clearTimeout(compileTimer);
  compileTimer = setTimeout(() => {
    $("#dockStatus").textContent = "SYNCING ARTIFACTS…";
    const next = compileTranscript(input.value, mode);
    setTimeout(() => { pending.remove(); applyCompiled(next, "State graph compiled across spec, diagram, and code."); input.value = ""; $("#dockStatus").textContent = "READY FOR REQUIREMENTS"; }, 400);
  }, 1200);
}

function renderStream() {
  $("#stream").innerHTML = state.thoughtHistory.map((thought, index) => `<article><div class="meta"><b>${String(index + 1).padStart(2, "0")}</b> ${thought.timestamp} <strong>COMMITTED</strong></div><p>“${escapeHtml(thought.rawTranscript)}”</p><div class="tags">${thought.entities.nodes.map((item) => `<mark>${escapeHtml(item.toUpperCase())}</mark>`).join("")}${thought.entities.logic.map((item) => `<mark>${escapeHtml(item.toUpperCase())}</mark>`).join("")}</div><footer>📄 ${thought.diffSummary.join("　 🔗 ")}　 <button class="revert" data-id="${thought.id}">REVERT THIS THOUGHT</button></footer></article>`).join("");
  $("#count").textContent = `${String(state.thoughtHistory.length).padStart(2, "0")} THOUGHTS`;
  document.querySelectorAll(".revert").forEach((button) => button.addEventListener("click", () => revertThought(button.dataset.id)));
}

function renderArtifacts() {
  const db = state.metadata.stack.find((item) => /sqlite|postgresql/i.test(item)) || "SQLite";
  $("#stackBadges").innerHTML = state.metadata.stack.map((item) => `<i>${escapeHtml(item)}</i>`).join("");
  $("#tableDb").textContent = db;
  $("#diagramDb").innerHTML = `${db.toUpperCase()}<br><small>DATABASE</small>`; $("#branchDb").textContent = db; $("#codeDb").textContent = db.toLowerCase();
  $("#docBody").textContent = state.documentSections[0].content;
  $("#retryText").textContent = `Failed writes use exponential backoff and preserve the original incident payload for auditability in ${db}.`;
  $("#updated").textContent = `UPDATED ${new Date(state.metadata.lastUpdated).toLocaleTimeString()}`;
}
function render() { renderStream(); renderArtifacts(); }
function revertThought(id) {
  const thought = state.thoughtHistory.find((item) => item.id === id);
  if (!thought?.snapshotBefore) return notify("The seed thought cannot be reverted.");
  undoStack.push(clone(state)); state = clone(thought.snapshotBefore); redoStack = []; persist(); render(); notify("Thought reverted and artifacts restored.");
}
function undo() { if (!undoStack.length) return notify("Nothing to undo."); redoStack.push(clone(state)); state = undoStack.pop(); persist(); render(); notify("Undid the last state graph patch."); }
function redo() { if (!redoStack.length) return notify("Nothing to redo."); undoStack.push(clone(state)); state = redoStack.pop(); persist(); render(); notify("Reapplied the state graph patch."); }

function exportDocx() {
  const paragraphs = [state.metadata.title, state.documentSections[0].heading, state.documentSections[0].content, `Stack: ${state.metadata.stack.join(", ")}`].map((text) => `<w:p><w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`).join("");
  const files = {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
    "word/document.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs}<w:sectPr/></w:body></w:document>`,
    "word/styles.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:sz w:val="22"/></w:rPr></w:style></w:styles>`
  };
  const blob = new Blob([makeZip(files)], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  download(blob, `${state.metadata.title.replace(/\s+/g, "-").toLowerCase()}.docx`); notify("Specification exported for Word.");
}
function exportPdf() { const printWindow = window.open("", "_blank"); if (!printWindow) return notify("Allow pop-ups to export PDF."); printWindow.document.write(`<title>${escapeHtml(state.metadata.title)}</title><style>body{font-family:Georgia;max-width:760px;margin:50px auto;line-height:1.6}h1{font-size:30px}h2{font-size:20px} @media print{body{margin:20mm}}</style><h1>${escapeHtml(state.metadata.title)}</h1><h2>${escapeHtml(state.documentSections[0].heading)}</h2><p>${escapeHtml(state.documentSections[0].content)}</p><p>Stack: ${escapeHtml(state.metadata.stack.join(", "))}</p>`); printWindow.document.close(); printWindow.focus(); printWindow.print(); }
function download(blob, filename) { const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000); }
function escapeXml(text) { return text.replace(/[<>&'"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[char]); }
function crc32(bytes) { let crc = 0xffffffff; for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); } return (crc ^ 0xffffffff) >>> 0; }
function u16(value) { return [value & 255, (value >>> 8) & 255]; }
function u32(value) { return [value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255]; }
function makeZip(files) {
  const encoder = new TextEncoder(); const local = []; const central = []; let offset = 0;
  Object.entries(files).forEach(([name, content]) => {
    const nameBytes = encoder.encode(name); const data = encoder.encode(content); const crc = crc32(data);
    const header = new Uint8Array([...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(nameBytes.length), ...u16(0), ...nameBytes, ...data]);
    local.push(header);
    central.push(new Uint8Array([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(nameBytes.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset), ...nameBytes]));
    offset += header.length;
  });
  const centralBytes = central.reduce((total, item) => total + item.length, 0);
  const end = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(central.length), ...u16(central.length), ...u32(centralBytes), ...u32(offset), ...u16(0)]);
  return new Blob([...local, ...central, end], { type: "application/octet-stream" });
}

$("#commit").addEventListener("click", commit); $("#input").addEventListener("keydown", (event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); commit(); } }); $("#undo").addEventListener("click", undo); $("#redo").addEventListener("click", redo); $("#exportDocx").addEventListener("click", exportDocx); $("#exportPdf").addEventListener("click", exportPdf);
document.querySelectorAll(".tab").forEach((button) => button.addEventListener("click", () => { document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active")); button.classList.add("active"); document.querySelectorAll(".view").forEach((view) => { view.hidden = view.id !== button.dataset.tab; }); }));
document.querySelectorAll(".mode").forEach((button) => button.addEventListener("click", () => { document.querySelectorAll(".mode").forEach((item) => item.classList.remove("active")); button.classList.add("active"); }));
const presets = {
  initial: "Okay, let's spec out the authentication and telemetry pipeline. The edge gateway sends a JSON payload over WebSocket every 5 seconds. If the gas or flame threshold spikes, trigger an immediate webhook to the Express server, log the incident in SQLite, and add a section in the security compliance doc explaining our fail-safe retry logic.",
  followup: "Actually, SQLite won't scale if we have 50 edge gateways. Swap SQLite for PostgreSQL, add a Redis caching layer in front of it, and add a table comparing the latency of the 5-second WebSocket vs the emergency webhook.",
  custom: ""
};
document.querySelectorAll("[data-preset]").forEach((button) => button.addEventListener("click", () => { $("#input").value = presets[button.dataset.preset]; if (button.dataset.preset === "custom") $("#input").focus(); }));
$("#settingsButton").addEventListener("click", () => $("#settings").showModal());
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) { const speech = new SpeechRecognition(); speech.continuous = false; speech.interimResults = true; speech.lang = "en-US"; speech.onstart = () => { $("#speak").textContent = "● LISTENING…"; $("#dockStatus").textContent = "LISTENING FOR REQUIREMENTS…"; }; speech.onresult = (event) => { let text = ""; for (let i = event.resultIndex; i < event.results.length; i += 1) text += event.results[i][0].transcript; $("#input").value = text; }; speech.onend = () => { $("#speak").textContent = "● SPEAK"; if ($("#input").value.trim()) commit(); }; speech.onerror = () => notify("Speech service unavailable. Type the thought into the dock."); $("#speak").addEventListener("click", () => speech.start()); } else $("#speak").addEventListener("click", () => notify("Use Chrome or Edge for live voice, or type into the dock."));
render();
