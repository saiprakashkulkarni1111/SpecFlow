export function applySurgicalMutation(next, text, diffSummary) {
  const dbSwap = text.match(/(?:swap|replace|switch)\s+(SQLite|PostgreSQL)\s+(?:for|with)\s+(PostgreSQL|SQLite)/i);
  const addRedis = /add\s+Redis|Redis\s+cache|caching\s+layer/i.test(text);
  const databaseIndex = next.metadata.stack.findIndex((item) => /sqlite|postgresql/i.test(item));
  let currentDatabase = databaseIndex === -1 ? "PostgreSQL" : next.metadata.stack[databaseIndex];
  if (dbSwap) {
    const target = dbSwap[2];
    if (!new RegExp(`^${target}$`, "i").test(currentDatabase)) {
      if (databaseIndex === -1) next.metadata.stack.push(target);
      else next.metadata.stack[databaseIndex] = target;
      currentDatabase = target;
      next.documentSections[0].content = next.documentSections[0].content.replace(/SQLite|PostgreSQL/gi, target);
      next.mermaidDiagram = next.mermaidDiagram.replace(/SQLite|PostgreSQL/gi, target);
      next.codeScaffolds[0].code = next.codeScaffolds[0].code.replace(/sqlite|postgresql/gi, target.toLowerCase());
      diffSummary.push(`Updated database to ${target}`);
    }
  }
  if (addRedis) {
    const hasRedis = next.metadata.stack.includes("Redis");
    if (!hasRedis) next.metadata.stack.splice(Math.max(databaseIndex, 0), 0, "Redis");
    if (!/Redis caches hot telemetry reads/i.test(next.documentSections[0].content)) {
      next.documentSections[0].content += " Redis caches hot telemetry reads before persistence.";
    }
    if (!/participant CACHE as Redis/i.test(next.mermaidDiagram)) {
      next.mermaidDiagram = next.mermaidDiagram.replace(/participant DB as (?:SQLite|PostgreSQL)/, `participant CACHE as Redis\n  participant DB as ${currentDatabase}`).replace(/EX->>DB: INSERT Incident Log/, "EX->>CACHE: SET incident TTL\n    CACHE->>DB: INSERT Incident Log");
    }
    if (!/const cache = redisClient/i.test(next.codeScaffolds[0].code)) {
      next.codeScaffolds[0].code = next.codeScaffolds[0].code.replace("const incident", "const cache = redisClient;\n  const incident").replace("await sqlite.incidents.insert", "await pgPool.query");
    }
    if (!hasRedis) diffSummary.push("Added Redis caching layer");
  }
  return next;
}
