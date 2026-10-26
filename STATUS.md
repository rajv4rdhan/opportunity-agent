# ScholarSwarm — build status (2026-10-26, v3)

> Handoff snapshot for the React rebuild. Everything was run and tested locally, as requested;
> E2B is not used by this build. No secrets are included.

## TL;DR

- **The React UI is complete and is now the only UI.** FastAPI serves the built SPA from
  `frontend/dist`; NiceGUI has been removed.
- **Backend: 70 tests pass.** **Frontend: 26 Vitest tests pass.** **Playwright: 116 passed,
  14 skipped** (the skipped ones are screenshot jobs for the two non-curated viewports).
- The swarm canvas uses React Flow with the binding coordinates: no overlapping nodes, visible
  hand-off labels, a parallel verifier pool and a mobile timeline below 1024px.
- Results lead with a deterministic summary, five match cards, requirement quotes, filters,
  Unlock more (What-If), deadlines with `.ics`, a printable view and the SOP.
- Every run can be replayed at 1× / 5× / 20× from History or the run header.

## What changed in v3

| Area | Status |
|---|---|
| Stack | Vite + React 19 + TypeScript strict + Tailwind v4 + shadcn/ui + React Flow |
| Design | Tokens in `frontend/src/styles/globals.css`, container-aligned shell, light/dark/system |
| Home | Centered composer; PDF drop, typed text, browser speech, coverage hints, samples, Advanced sheet |
| Live run | Run header, six-phase stepper, KPI strip, swarm canvas, verifier pool, inline clarifier |
| Panels | Profile, Activity (filter + jump-to-latest), Sources, Graph, Browser, equal-height rows |
| Results | Summary, MatchCards, requirement quotes, All table, Unlock more, Deadlines, SOP |
| Replay | Browser-side timing, 1× / 5× / 20×, restart, exit, History actions |
| API | `GET /api/meta`, `GET /api/runs/{id}/events.json`, typed run summaries/details |
| Production | Static `/assets`, SPA fallback with `index.html`, JSON 404s for `/api/*` |
| Removed | `backend/app/ui/`, NiceGUI, markdown2, Python replay service, old UI tests |

## Tests

```bash
cd backend && .venv/bin/python -m pytest -q        # 70 passed
cd frontend && npm test                            # 26 passed
cd frontend && npx playwright test                 # 116 passed, 14 skipped
```

The Playwright suite runs five projects: 1440, 1280, 1024, 390 and 1440 dark. It includes layout
invariants (no horizontal scroll, aligned containers, equal rows, no overlapping nodes, edges
attached, readable canvas zoom, no clipped text, 32px mobile tap targets), mocked API flows,
Ctrl+Enter, Escape, the failed state and screenshot generation.

## Real runs in `backend/data/app.db`

| Profile | Run id | Opportunities | Top 5 | SOP | Duration | Cost |
|---|---|---|---:|---:|---:|---:|
| Rahul (sample) | `28cec885bad4` | 10 | 5 | 694 w | 734 s | $0.254 |
| Description only | `b5ffc531ba50` | 12 | 5 | 772 w | 325 s | $0.102 |
| Demo seed (screenshots/replay) | `demoresults1` | 2 | 2 | 96 w | 612 s | $0.120 |
| Deliberately failed (error QA) | `79715358a30b` | — | — | — | — | — |

Description-only runs go through the Clarifier and start with no PDF at all. `demoresults1` is
clearly seeded demo data used by the screenshot and replay tests.

## How to run locally

```bash
# Development (two terminals)
cd backend && .venv/bin/uvicorn app.main:app --reload --port 8000
cd frontend && npm run dev

# Production (one process)
cd frontend && npm run build
cd backend && .venv/bin/uvicorn app.main:app --port 8000
```

- Development UI: <http://localhost:5173>
- Production UI: <http://localhost:8000>
- API docs: <http://localhost:8000/docs>

`frontend/dist` is gitignored; build it before using the single-process mode.

## Screenshots

`docs/screenshots/` now contains the React UI only:

- `home-*`, `home-with-files-*`
- `run-mid-*`, `run-finished-matches-*`, `run-finished-unlock-*`, `run-finished-sop-*`
- `history-*`

Each in `desktop-1440`, `desktop-1440-dark` and `mobile-390`.

## Remaining human tasks

1. Record the 5-minute demo using `human-plan.md` (prepare 2–3 finished runs first).
2. Push the public GitHub repo and confirm `.env` is absent.
3. Rewrite `docs/notes.md` in your own words.
4. Run the voice check in Chrome/Edge: allow the mic, speak, confirm the text lands in the
   composer and the clarifier.
5. Optional: rotate the E2B key shared in chat; E2B is not used by this build.

## Known limitations

- Voice recognition is browser-provided; Firefox does not expose `SpeechRecognition`.
- Replay reads stored events only; a run must be finished or failed before Replay is enabled.
- Many official pages say “check the faculty/institution”; the UI shows `deadline_text` rather than
  inventing a date. Only dated opportunities are exported to `.ics`.
- The final narrative in `docs/notes.md` is intentionally left for the human author.
