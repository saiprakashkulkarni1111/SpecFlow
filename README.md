# SpecFlow Studio

SpecFlow Studio is a voice-driven living architecture and document workbench. A developer can dictate a brain dump or follow-up into the left pane, then watch one persisted Project State Graph update the specification, architecture view, and backend scaffold.

## Run

```powershell
npm install
npm start
```

Open `http://localhost:4173`.

The server exposes `GET /api/health`. The local compiler is deterministic and keyless for reliable demos. `POST /api/compile` is reserved for an optional server-side LLM proxy; no API keys are shipped to the browser.

The root `index.html` also points at the modular browser entry under `public/js/`, so static artifact hosts and the Express server load the same implementation.

## Demo

1. Click **INITIAL BRAIN DUMP**, then **COMMIT THOUGHT**.
2. Click **SWAP DB + ADD REDIS**, then **COMMIT THOUGHT**.
3. Watch the stack, specification table, diagram database node, code scaffold, latency table, and thought history update.
4. Use **UNDO**, **REDO**, **REVERT THIS THOUGHT**, **DOCX**, and **PDF**.

The browser microphone button uses `SpeechRecognition` when supported. Manual entry and presets remain available when browser speech services are blocked.

## State model

The browser persists `specflow-project-state-v1` in `localStorage`. It contains project metadata, thought history with snapshots, document sections, Mermaid-compatible diagram source, and code scaffolds. Follow-ups are compiled into surgical state mutations before all renderers run.

## Export

- **DOCX** creates a minimal valid Office Open XML package in the browser with a Blob download.
- **PDF** opens a print-ready document so the browser can save it as PDF.

## Project files

- `server.js` — Express static server and health/compile contracts.
- `public/index.html` — split-pane application UI.
- `public/js/app.js` — modular application controller and event wiring.
- `public/js/state/` — immutable persisted state graph, undo/redo, and surgical patches.
- `public/js/compiler/` — voice ingestion, entity extraction, deterministic intent routing, and idempotent mutations.
- `public/js/renderers/` — thought stream, specification, diagram, and code artifact renderers.
- `public/js/exporters/` — DOCX and print-to-PDF download adapters.
- `public/styles.css` — dark developer workspace styling.
