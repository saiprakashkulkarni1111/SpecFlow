export function extractEntities(text) {
  const nodes = ["Edge Gateway", "WebSocket", "Express", "SQLite", "PostgreSQL", "Redis"].filter((item) => text.toLowerCase().includes(item.toLowerCase()));
  const logic = text.match(/every\s+\d+\s*(?:seconds?|minutes?)|gas|flame|threshold|webhook|retry|latency/gi) || [];
  const directives = text.match(/(?:security|compliance|fail-safe|retry|schema|document|diagram|cache)[^,.]*/gi) || [];
  return { nodes: [...new Set(nodes)], logic: [...new Set(logic)], directives: [...new Set(directives)] };
}
