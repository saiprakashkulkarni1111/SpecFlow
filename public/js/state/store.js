const STORAGE_KEY = "specflow-project-state-v2";

export const seedTranscript = "The edge gateway sends a JSON payload over WebSocket every 5 seconds. If the gas or flame threshold spikes, trigger an immediate webhook to the Express server, log the incident in SQLite, and add fail-safe retry logic.";

export const initialState = {
  metadata: { title: "Telemetry Pipeline", version: "1.2", stack: ["WebSocket", "Express", "SQLite"], lastUpdated: new Date().toISOString() },
  thoughtHistory: [{ id: "thought-1", timestamp: "JUST NOW", rawTranscript: seedTranscript, mode: "APPEND", entities: { nodes: ["Edge Gateway", "WebSocket", "Express"], logic: ["Every 5 seconds", "Gas / flame spike"], directives: ["Fail-safe retry logic"] }, diffSummary: ["Added Section 4.2", "Added alert loop"], snapshotBefore: null }],
  documentSections: [{ id: "sec-4-2", heading: "4.2 / TELEMETRY & FAIL-SAFE BEHAVIOR", content: "Telemetry payloads are transmitted from the Edge Gateway via WebSocket at 5-second intervals. The Express ingestion layer validates each JSON payload before persistence.", tables: [] }],
  mermaidDiagram: "sequenceDiagram\n  participant EG as Edge Gateway\n  participant EX as Express Server\n  participant DB as SQLite\n  loop Every 5s\n    EG->>EX: JSON Telemetry (WebSocket)\n  end\n  alt Gas / Flame Spike\n    EG->>EX: Immediate Alert Webhook\n    EX->>DB: INSERT Incident Log\n  end",
  codeScaffolds: [{ filename: "server/routes/telemetry.js", language: "javascript", code: "router.post('/webhook/alert', async (req, res) => {\n  const incident = await validateTelemetry(req.body);\n  if (incident.gasSpike || incident.flameSpike) {\n    await sqlite.incidents.insert({ payload: incident, retry: 'exponential-backoff' });\n  }\n  res.status(202).json({ accepted: true });\n});" }]
};

export const clone = (value) => typeof structuredClone === "function"
  ? structuredClone(value)
  : JSON.parse(JSON.stringify(value));
let state = load();
const undoStack = [];
const redoStack = [];

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return clone(initialState);
    return {
      ...clone(initialState),
      ...saved,
      metadata: { ...clone(initialState.metadata), ...saved.metadata },
      thoughtHistory: Array.isArray(saved.thoughtHistory) ? saved.thoughtHistory : clone(initialState.thoughtHistory),
      documentSections: Array.isArray(saved.documentSections) ? saved.documentSections : clone(initialState.documentSections),
      codeScaffolds: Array.isArray(saved.codeScaffolds) ? saved.codeScaffolds : clone(initialState.codeScaffolds)
    };
  } catch { return clone(initialState); }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state, (key, value) => key === "snapshotBefore" ? undefined : value));
}

export const store = {
  get: () => state,
  commit(next) { undoStack.push(state); redoStack.length = 0; state = next; persist(); },
  undo() { if (!undoStack.length) return false; redoStack.push(state); state = undoStack.pop(); persist(); return true; },
  redo() { if (!redoStack.length) return false; undoStack.push(state); state = redoStack.pop(); persist(); return true; },
  revert(id) { const thought = state.thoughtHistory.find((item) => item.id === id); if (!thought?.snapshotBefore) return false; undoStack.push(state); state = thought.snapshotBefore; redoStack.length = 0; persist(); return true; }
};
