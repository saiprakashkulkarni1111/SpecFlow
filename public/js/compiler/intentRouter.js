import { extractEntities } from "./entityExtractor.js";
import { applySurgicalMutation } from "./diffEngine.js";

function prepareMutation(state) {
  return {
    ...state,
    metadata: { ...state.metadata, stack: [...state.metadata.stack] },
    thoughtHistory: [...state.thoughtHistory],
    documentSections: state.documentSections.map((section, index) => index === 0 ? { ...section } : section),
    codeScaffolds: state.codeScaffolds.map((scaffold, index) => index === 0 ? { ...scaffold } : scaffold)
  };
}

export function compileIntent(state, rawTranscript, mode = "APPEND") {
  const text = rawTranscript.trim();
  const next = prepareMutation(state);
  const diffSummary = [];
  const entities = extractEntities(text);
  applySurgicalMutation(next, text, diffSummary);
  if (!diffSummary.length && !next.documentSections[0].content.includes(text)) {
    if (/websocket/i.test(text)) diffSummary.push("Confirmed WebSocket telemetry loop");
    if (/webhook/i.test(text)) diffSummary.push("Added emergency webhook path");
    if (/retry/i.test(text)) diffSummary.push("Added fail-safe retry logic");
    next.documentSections[0].content += ` ${text.replace(/^okay,?\s*/i, "").trim()}`;
  }
  next.metadata.lastUpdated = new Date().toISOString();
  next.thoughtHistory.push({ id: `thought-${Date.now()}`, timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }), rawTranscript: text, mode, entities, diffSummary, snapshotBefore: state });
  return next;
}
