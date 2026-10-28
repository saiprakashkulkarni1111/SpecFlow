const express = require("express");
const path = require("path");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = Number(process.env.PORT) || 4173;
app.use(express.json({ limit: "1mb" }));
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, service: "specflow-studio", compiler: "deterministic-local" });
});

app.post("/api/compile", (request, response) => {
  if (!request.body || typeof request.body.transcript !== "string") {
    return response.status(400).json({ error: "transcript must be a string" });
  }
  response.json({ mode: "local-fallback", message: "Use the browser compiler for deterministic offline compilation." });
});

app.listen(port, () => {
  console.log(`SpecFlow Studio running at http://localhost:${port}`);
});
