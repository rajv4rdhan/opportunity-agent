# AGENT PLAN v3 — Rebuild the UI in React (professional, symmetric, unbreakable layout)

> **Audience:** the coding agent. Follow this file literally, top to bottom. Every size, color, coordinate and file name is specified on purpose. Don't improvise layout values. If something is unclear, re-read the matching section before asking.
> **Human tasks** are in `human-plan.md`.
> **Backend:** the swarm (LangGraph agents, Neo4j, fallbacks, chaos, SOP, calendar, what-if) **works and stays**. This plan replaces only the NiceGUI UI with a React single-page app and makes small API additions.

---

## 0. Hard rules (read twice)

1. **Never run anything on the local machine** except the thin E2B client `backend/scripts/e2b_run.py` (and `npx @e2b/cli` for the template build). `npm install`, `npm run build`, `vitest`, `playwright`, `pytest` and `uvicorn` run **only inside E2B**.
2. **Never guess layout.** Use the exact sizes, grid columns and coordinates in §6–§11. Every page must pass the automated **layout invariant tests** in §14.3 before a phase is done.
3. **One source of truth per concern:**
   | Concern | Only place |
   |---|---|
   | Data shapes | Python Pydantic models → OpenAPI → generated `frontend/src/api/schema.d.ts` (never hand-copy types) |
   | HTTP calls from the browser | `frontend/src/api/client.ts` |
   | Live run state (event reducer) | `frontend/src/state/runReducer.ts` |
   | Agent metadata (names, roles, icons, phases, edges, layout coordinates) | `frontend/src/swarm/agents.ts` |
   | Design tokens | `frontend/src/styles/globals.css` (`@theme` block) |
   | Page width and gutters | the `<Container>` component (header and pages both use it) |
   | Chaos captions | `backend/app/core/chaos.py` (`CHAOS_CAPTIONS`), served by `/api/meta` |
   | Sample descriptions | `backend/app/services/samples.py`, served by `/api/meta` |
4. **No ad-hoc styling.** Use Tailwind utility classes with token-based colors only (`bg-surface`, `text-muted`, `border-line`, `text-accent` …). No hex values in TSX. No inline `style={{}}` except computed geometry (React Flow, progress widths).
5. **TypeScript strict mode.** No `any` (use `unknown` and narrow it).
6. **Don't break the backend.** `pytest` must stay green in E2B after every phase.
7. Commit after every phase (`ui: …`, `api: …`, `test: …`), ending each message with the attribution line the session requires. Never commit `.env`, `node_modules`, `dist`, `test-results`.

---

## 1. Diagnosis — why the current UI looks broken

I checked the v2 UI live in E2B at 1440×900 with a real Rahul run.

| # | Problem seen | Root cause in code |
|---|---|---|
| 1 | Swarm canvas: agent cards overlap, names are cut off ("Clarifie", "Matche", "Supervi"), lines run through cards and don't touch them | `swarm_canvas.py` places **fixed-pixel** nodes at **percentage** positions inside a box with `aspect-ratio`, while the SVG edges use `preserveAspectRatio="none"` (stretched). Nodes and edges live in different coordinate systems. At an 8/12 column (~720px), each "column" is ~120px but a node needs ~184px. |
| 2 | The verifier worker pool is squeezed into a ~120px node; its stats stack vertically ("Verifiers · 5 / running · 1 / verified · 2 …") | Same as #1, plus the pool is rendered inside a node that can't grow. |
| 3 | Page looks lopsided: the left column (canvas) ends at ~300px height, the right column (profile + tabs) runs to ~1,200px, leaving a huge empty area bottom-left | Two columns with independent heights; no equal-height rows. |
| 4 | Header logo and nav don't line up with page content on the home page | Header inner is 1200px wide; home content is a separate 760px column. Different containers. |
| 5 | Activity text is clipped at the right edge of the panel | Fixed-width rows with `overflow: hidden` and no wrapping or line-clamp. |
| 6 | Duplicate titles ("Activity" tab, then an "Activity" heading) and stats strip placed far below, detached from context | No layout system; components added ad hoc. |
| 7 | Composer toolbar: primary button not right-aligned, language selector more prominent than the mic, a drop-zone strip awkwardly inside the box | Flex rows without a defined left/right structure. |
| 8 | Global feel: Quasar defaults leaking through (font sizes, spacing, focus styles) and a 1,126-line hand-written CSS fighting them | NiceGUI/Quasar component styles vs. custom CSS overrides. |
| 9 | **The app was killed for running out of memory (OOM) in the default E2B sandbox** (≈470 MB RAM): uvicorn reached ~390 MB during a real run, and `pip install` also OOMs | The default E2B template is too small. Fixed in §15 with a custom template (4 GB). |

**Decision:** replace NiceGUI with a **React + Vite + TypeScript + Tailwind v4 + shadcn/ui + React Flow** single-page app. React Flow has one coordinate system for nodes and edges, automatic `fitView`, and real custom nodes, which removes problems 1–2 by construction. A strict container and equal-height row grid removes 3–6. shadcn/ui gives professional, consistent primitives (8).

---

## 2. Target architecture

```
Browser (React SPA)
   │  REST  /api/*            (fetch via TanStack Query)
   │  SSE   /api/runs/{id}/events   (EventSource, live)
   ▼
FastAPI (backend/app/main.py)
   ├─ /api/*            existing routers + new /api/meta, /api/runs/{id}/events.json
   ├─ /assets/*         built JS/CSS from frontend/dist/assets   (Phase 9)
   └─ /{anything else}  → frontend/dist/index.html (SPA fallback) (Phase 9)
LangGraph swarm, Neo4j, SQLite: unchanged
```

During development (Phases 2–8), the React dev server (Vite, port 5173) proxies `/api` to uvicorn (port 8000). NiceGUI keeps running on 8000 until Phase 9 removes it.

**Kept:** all of `backend/app` except `backend/app/ui/`.
**Deleted in Phase 9:** `backend/app/ui/` (whole folder), `nicegui` from `requirements.txt`, `backend/tests/test_ui_pages.py`, `backend/tests/ui_app.py`, `backend/tests/test_live_state.py`, `backend/tests/test_replay.py`, `backend/app/services/replay.py` (replay moves to the browser).
**Moved:** intake `coverage()`/`COVERAGE`/`COUNTRIES` → `frontend/src/lib/coverage.ts` (Python keeps `classify_document` and `word_count`, which `runner.py` uses). `backend/tests/test_intake.py` keeps only the classify/word_count tests.

---

## 3. Tech stack (exact)

Create the app with Vite's React-TS template, then add:

| Package | Purpose |
|---|---|
| `react`, `react-dom` (19.x) | UI |
| `react-router` (7.x) | routing (`createBrowserRouter`) |
| `@tanstack/react-query` (5.x) | server state |
| `@xyflow/react` (12.x) | swarm canvas |
| `motion` (12.x) | small enter/exit animations |
| `lucide-react` | icons (only icon set allowed) |
| `react-markdown` + `remark-gfm` | SOP and "why it fits" text |
| `react-force-graph-2d` | knowledge graph |
| `sonner` | toasts |
| `clsx`, `tailwind-merge`, `class-variance-authority` | class helpers (shadcn standard `cn()`) |
| `date-fns` | dates ("in 20 days", "15 Nov 2026") |
| `@fontsource-variable/inter`, `@fontsource-variable/jetbrains-mono` | self-hosted fonts |
| dev: `typescript`, `vite`, `@vitejs/plugin-react`, `tailwindcss` (v4), `@tailwindcss/vite`, `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@playwright/test`, `openapi-typescript` | build and tests |

**shadcn/ui** (`npx shadcn@latest init`, style "new-york", base color "zinc", CSS variables on). Add exactly these components: `button card badge tabs sheet select switch slider tooltip accordion table separator scroll-area textarea input label dropdown-menu popover skeleton toggle-group`.

Install with `npm install <pkg>` (latest) **inside E2B**, then commit `package.json` **and** `package-lock.json`.

---

## 4. Repository layout (create exactly)

```
opportunity-agent/
├─ e2b/
│  ├─ e2b.Dockerfile            # §15.1
│  └─ README.md                 # how the template is built
├─ backend/                     # unchanged except §5
│  └─ scripts/e2b_run.py        # §15.2 (NEW — it does not exist yet)
└─ frontend/
   ├─ index.html
   ├─ package.json / package-lock.json
   ├─ vite.config.ts            # react + tailwind plugins, /api proxy → :8000, alias @ → src
   ├─ tsconfig.json             # strict: true
   ├─ components.json           # shadcn
   ├─ playwright.config.ts      # §14.2
   ├─ public/favicon.svg        # the logo mark (§6.6)
   ├─ e2e/
   │  ├─ fixtures.ts            # API mocking helpers (page.route)
   │  ├─ layout.spec.ts         # layout invariants (§14.3)
   │  ├─ flows.spec.ts          # user flows (§14.2)
   │  └─ screenshots.spec.ts    # writes docs/screenshots/*.png
   └─ src/
      ├─ main.tsx               # fonts, QueryClientProvider, RouterProvider, Toaster, theme init
      ├─ router.tsx             # routes (§9)
      ├─ styles/globals.css     # Tailwind import + @theme tokens (§6)
      ├─ api/
      │  ├─ schema.d.ts         # GENERATED (openapi-typescript) — do not edit
      │  ├─ types.ts            # re-exports named types from schema.d.ts
      │  ├─ client.ts           # all fetch calls
      │  └─ queries.ts          # TanStack Query hooks
      ├─ state/
      │  ├─ runReducer.ts       # port of backend/app/ui/live_state.py
      │  ├─ runReducer.test.ts
      │  ├─ useRunStream.ts     # SSE → reducer
      │  ├─ useReplay.ts        # events.json → reducer with timing
      │  └─ replay.test.ts
      ├─ swarm/
      │  ├─ agents.ts           # port of backend/app/ui/agents.py + layout (§11)
      │  ├─ SwarmCanvas.tsx
      │  ├─ AgentNode.tsx
      │  ├─ VerifierPoolNode.tsx
      │  ├─ LaneLabelNode.tsx
      │  ├─ FlowEdge.tsx        # normal edge with particle + label
      │  ├─ LoopEdge.tsx        # orthogonal waypoint edge for re-plan / revise loops
      │  └─ MobileTimeline.tsx
      ├─ lib/
      │  ├─ cn.ts
      │  ├─ coverage.ts         # moved from Python intake.py
      │  ├─ coverage.test.ts
      │  ├─ format.ts           # durations, money, relative dates, initials
      │  ├─ speech.ts           # useSpeechRecognition hook (Web Speech API)
      │  └─ theme.ts            # light/dark/system
      ├─ components/
      │  ├─ ui/                 # shadcn generated (do not edit except via shadcn)
      │  ├─ layout/AppShell.tsx, Container.tsx, Header.tsx, LogoMark.tsx, PageHeader.tsx
      │  ├─ common/StatusPill.tsx, KpiTile.tsx, Panel.tsx, EmptyState.tsx, ScoreRing.tsx, SourceChip.tsx, Favicon.tsx
      │  ├─ intake/Composer.tsx, AttachmentChip.tsx, VoiceButton.tsx, CoverageHints.tsx, SampleRow.tsx, AdvancedSheet.tsx, HowItWorks.tsx
      │  ├─ run/RunHeader.tsx, PhaseStepper.tsx, KpiStrip.tsx, InputRequestCard.tsx, ProfilePanel.tsx, ActivityPanel.tsx, SourcesPanel.tsx, GraphPanel.tsx, BrowserPanel.tsx, ReplayBar.tsx, SwarmSection.tsx
      │  └─ results/ResultSummary.tsx, MatchCard.tsx, RequirementList.tsx, OpportunityTable.tsx, UnlockMore.tsx, WhatIfForm.tsx, DeadlineList.tsx, SopDocument.tsx
      └─ pages/HomePage.tsx, RunPage.tsx, HistoryPage.tsx, NotFoundPage.tsx
```

---

## 5. Backend changes (small)

### 5.1 New response models — `backend/app/models/api.py`
```
RunSummary:  id, created_at, status, student_name | None, duration_sec | None, verified_count | None
RunDetail:   id, created_at, status, student_name | None, error | None, report: FinalReport | None, pending_questions: dict | None
SampleInfo:  name, label, description, form: dict
ChaosPoint:  key, label, caption
MetaResponse: providers: dict[str, bool], samples: list[SampleInfo], chaos_points: list[ChaosPoint], median_duration_sec: float | None
```
Set `response_model=` on: `GET /api/runs` (list[RunSummary]), `GET /api/runs/{id}` (RunDetail), `GET /api/meta` (MetaResponse), `GET /api/runs/{id}/events.json` (list[Event]). Make `store.list_runs` also compute `duration_sec` and `verified_count` from `report_json` (`stats.duration_sec`, `len(all_opportunities)`), with `None` when there's no report.

### 5.2 New endpoints (in `api/runs.py`, or a new `api/meta.py` router)
- `GET /api/meta` → `MetaResponse`:
  - `providers`: the same logic as the old home page provider row (`settings.configured`, with GitHub via `resolve_token()`).
  - `samples`: read `backend/samples/*/form.json`. `description` comes from `services/samples.sample_description(name, form)`; move `_sample_description` there from `ui/pages/home.py`.
  - `chaos_points`: from `core/chaos.CHAOS_POINTS` plus `CHAOS_CAPTIONS` (move captions and labels from `ui/components/advanced_options.py` into `core/chaos.py`).
  - `median_duration_sec`: `store.median_duration_sec()`.
- `GET /api/runs/{id}/events.json` → all stored events in order (used by replay and as test fixtures).
- Keep every existing endpoint unchanged: `POST /api/runs`, `GET /api/runs/{id}/events` (SSE), `POST /resume`, `GET /graph`, `POST /whatif`, `report.md`, `sop.md`, `deadlines.ics`, `/api/samples`, `/api/health`.

### 5.3 SPA serving (Phase 9 only)
In `main.py` remove `ui.run_with` and `register_pages`. Then:
- `FRONTEND_DIST = REPO_ROOT / "frontend" / "dist"`.
- If it exists: mount `StaticFiles(directory=FRONTEND_DIST / "assets")` at `/assets`, plus a catch-all `GET /{path:path}` registered **after** the API routers. It returns a 404 JSON for paths starting with `api/`, a file from `dist` if it exists (favicon.svg), otherwise `index.html` with `Cache-Control: no-cache`.
- If it doesn't exist: `GET /` returns a plain message "Frontend not built. Run e2b_run.py build."

### 5.4 Python tests
- Add `tests/test_api_meta.py`: meta shape, the samples list contains `rahul` with a non-empty description, and chaos points have captions.
- Add `tests/test_api_events_json.py`: seed 3 events with `store.insert_event`, then GET returns them in order.
- Phase 9: add `tests/test_spa.py` (temp `dist/index.html` via monkeypatching `FRONTEND_DIST`): `/runs/abc` returns index.html; `/api/nope` returns 404 JSON.
- Phase 9: delete the UI tests listed in §2.

---

## 6. Design system — `frontend/src/styles/globals.css`

### 6.1 Tokens (Tailwind v4 `@theme` + dark overrides on `.dark`)
| Token (Tailwind name) | Light | Dark | Used for |
|---|---|---|---|
| `--color-canvas` | `#FAFAFA` | `#09090B` | page background |
| `--color-surface` | `#FFFFFF` | `#18181B` | cards, panels |
| `--color-subtle` | `#F4F4F5` | `#27272A` | icon tiles, table headers, hover |
| `--color-line` | `#E4E4E7` | `#27272A` | all borders |
| `--color-line-strong` | `#D4D4D8` | `#3F3F46` | idle edges, inputs |
| `--color-ink` | `#18181B` | `#FAFAFA` | primary text |
| `--color-muted` | `#71717A` | `#A1A1AA` | secondary text |
| `--color-accent` | `#4F46E5` | `#818CF8` | primary actions, running state |
| `--color-accent-soft` | `#EEF2FF` | `#1E1B4B` | running tiles, selected |
| `--color-ok` | `#059669` | `#34D399` | done, verified, eligible |
| `--color-ok-soft` | `#ECFDF5` | `#052E2B` | |
| `--color-warn` | `#D97706` | `#FBBF24` | fallback, partial, waiting |
| `--color-warn-soft` | `#FFFBEB` | `#2D1B04` | |
| `--color-err` | `#DC2626` | `#F87171` | failed, not eligible |
| `--color-err-soft` | `#FEF2F2` | `#2B0B0B` | |
| `--font-sans` | `"Inter Variable", system-ui, sans-serif` | | |
| `--font-mono` | `"JetBrains Mono Variable", ui-monospace, monospace` | | |
| `--radius-card` | `12px` | | cards, panels |
| `--radius-control` | `8px` | | buttons, inputs |
| `--shadow-card` | `0 1px 2px rgb(0 0 0 / 0.04)` | `none` | the ONLY shadow |

Map shadcn's variables (`--background`, `--foreground`, `--primary`, `--border`, `--ring`, …) to these tokens so shadcn components match automatically.

### 6.2 Typography (only these)
| Name | Class recipe | Use |
|---|---|---|
| Display | `text-[44px] leading-[52px] font-semibold tracking-[-0.02em]` (mobile: `text-[32px] leading-[40px]`) | home headline only |
| H1 | `text-[28px] leading-9 font-semibold tracking-[-0.01em]` | page titles |
| H2 | `text-xl leading-7 font-semibold` | section titles |
| H3 | `text-base leading-6 font-semibold` | card titles |
| Body | `text-sm leading-[22px]` | default |
| Small | `text-xs leading-[18px] text-muted` | captions, labels |
| Overline | `text-[11px] leading-4 font-semibold uppercase tracking-[0.08em] text-muted` | section eyebrows, KPI labels |
| Mono | `font-mono text-xs tabular-nums` | ids, timers, counts |

Numbers everywhere use `tabular-nums`.

### 6.3 Spacing and layout rules
- 4-px base. Allowed gaps: 4, 8, 12, 16, 24, 32, 48, 64.
- Page vertical rhythm: sections are separated by `gap-8` (32px). Inside a card, use `p-5` (20px) for panels, `p-6` (24px) for content cards.
- **Container:** `mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8` with `data-testid="container"`. The header and every page section use `<Container>`. This alone fixes the header/content misalignment.
- **Equal-height rows:** any row of panels is `grid grid-cols-N gap-6` with a fixed `h-[XXXpx]` on the row, and each panel `h-full min-h-0 flex flex-col` with an internal `ScrollArea` (`flex-1 min-h-0`). Give rows `data-row="<name>"` for the tests.
- Breakpoints: `sm 640`, `md 768`, `lg 1024`, `xl 1280`.

### 6.4 Component rules
- Card/Panel: `bg-surface border border-line rounded-[var(--radius-card)] shadow-card`.
- Buttons: shadcn `Button`. Primary uses accent; secondary is `variant="outline"`; tertiary is `variant="ghost"`. Height `h-9` (36px), large `h-10`.
- Status is always **dot or icon plus text** (`StatusPill`), never color alone.
- Text that can be long always uses `truncate` (one line) or `line-clamp-2`, with the full text in `title=` or a Tooltip. **Never `overflow-hidden` on a text container without truncate or line-clamp.**
- Icons: lucide, `size-4` (16px) inline, `size-[18px]` in tiles; stroke width 1.75.

### 6.5 Motion
- Durations: 150ms (hover), 200ms (enter), 1.6s (pulse loop). Easing `cubic-bezier(.2,.8,.2,1)`.
- `@keyframes ss-pulse` (box-shadow ring 0 → 6px accent at 15% opacity), `@keyframes ss-dash` (stroke-dashoffset 20 → 0).
- `@media (prefers-reduced-motion: reduce)`: disable both keyframes and the edge particles.

### 6.6 Logo mark (`LogoMark.tsx` + `public/favicon.svg`)
A 20×20 SVG of three circles: (6,13) r=3, (14,13) r=3, (10,6) r=3, filled `currentColor` (accent), plus two 1px lines connecting the bottom circles to the top one at 40% opacity. Wordmark "ScholarSwarm" in `text-[15px] font-semibold tracking-[-0.01em]` next to it, with an 8px gap.

---

## 7. App shell

### 7.1 `Header.tsx`
- `<header class="sticky top-0 z-40 h-14 border-b border-line bg-surface/80 backdrop-blur">` containing `<Container class="h-full flex items-center justify-between">`.
- Left: `LogoMark` + wordmark (link to `/`).
- Right: nav links "New search" (`/`) and "History" (`/runs`) as ghost buttons `h-8 px-3 text-sm text-muted hover:text-ink`. The active route gets `text-ink bg-subtle`. Then a theme toggle (ghost icon button, Sun/Moon icon, cycling light → dark → system, with the tooltip showing the current mode).

### 7.2 `AppShell.tsx`
`min-h-dvh bg-canvas text-ink font-sans`, then `<Header/>`, then `<main class="py-8 sm:py-10">{outlet}</main>`. No footer.

### 7.3 Theme (`lib/theme.ts`)
Store `ss-theme` (`light|dark|system`) in localStorage, wrapped in try/catch. Apply the `.dark` class on `<html>` before React renders (a tiny inline script in `index.html`) to avoid a flash.

---

## 8. Data layer

### 8.1 Types
`npm run gen:api` = `openapi-typescript http://localhost:8000/openapi.json -o src/api/schema.d.ts`, run in E2B with uvicorn up. `types.ts` exports: `Event, EventType, FinalReport, TopMatch, Opportunity, Requirement, Source, Gap, StudentProfile, RunSummary, RunDetail, MetaResponse, SampleInfo, ChaosPoint`.

### 8.2 `api/client.ts`
Functions: `getMeta()`, `listRuns()`, `getRun(id)`, `getEventsJson(id)`, `createRun(form: CreateRunInput)` (builds `FormData` exactly like the API's form fields in `api/runs.py`, with lists as comma-joined strings and `test_scores_json`/`chaos_json` as JSON strings), `resumeRun(id, answers)`, `getGraph(id)`, `whatIf(id, overrides)`, and URL helpers `eventsUrl(id, after)`, `reportUrl(id)`, `sopUrl(id)`, `icsUrl(id)`. Throw `ApiError(status, message)` with the FastAPI `detail` text.

### 8.3 `api/queries.ts`
`useMeta()` (staleTime 60s), `useRuns()`, `useRun(id)` (refetch when the stream reports finished), `useGraph(id, version)` (query key includes `graphVersion` so it refetches on `graph_update`), `useCreateRun()`, `useResumeRun()`, `useWhatIf()`.

### 8.4 `state/runReducer.ts` — port of `backend/app/ui/live_state.py`
- Before writing it, **read `backend/app/ui/live_state.py` fully** and port every field and every event branch **1:1**: agent_status, thoughts, workers (and their transitions), handoffs, active_edges, phase/phase_done, verifier counters, candidates, interrupt, live_view_url, graph_version, stats, profile_snapshot, student_name, finished/failed, tick.
- Shape: `type RunState = {...}`; `function reduceEvent(state: RunState, event: Event): RunState`. Pure and immutable (spread copies).
- Add `traversedEdges: string[]` (edge ids `"src->dst"` that have ever carried a hand-off) for the done-edge style.
- Port **every test case** from `backend/tests/test_live_state.py` into `runReducer.test.ts` (same inputs, same expected outputs).
- `initialRunState(runId)`.

### 8.5 `state/useRunStream.ts`
- Takes `runId`. Opens `new EventSource(eventsUrl(runId, lastId))`. On each message, parse the JSON `Event` and dispatch `reduceEvent` with `useReducer`. Buffer events and flush at most every 100ms with `requestAnimationFrame` batching so the UI doesn't re-render 50 times a second.
- On `error`: close, wait `min(1000 * 2^attempt, 10000)` ms, reopen with `after=lastId`. Stop after `run_finished`/`run_failed`.
- Returns `{ state, connected }`. Every 3 s, `state.tick++` through a dispatch of the synthetic `{type: "tick"}` action, so time-based UI (labels fading, ETA) moves even without events.

### 8.6 `state/useReplay.ts`
- `replayDelays(timestamps: string[], speed: number, capMs = 1500): number[]` (pure, tested; the same algorithm as the deleted Python `replay_delays`: `min((t[i]-t[i-1]) / speed, cap)`, first delay 0).
- The hook loads `getEventsJson(id)`, then schedules dispatches with `setTimeout` chains and exposes `{state, speed, setSpeed, restart, done}`.

### 8.7 `lib/coverage.ts`
Port `COUNTRIES`, `COVERAGE` and `coverage(text)` from `backend/app/services/intake.py` exactly (same regexes with the `i` flag; keep the same hint keys `degree, grades, goal, countries, budget, tests, projects`). Port the coverage test cases from `test_intake.py` into `coverage.test.ts`, then delete them from Python.

### 8.8 `lib/speech.ts` — `useSpeechRecognition({lang})`
- `supported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window`.
- `continuous = true`, `interimResults = true`. Returns `{supported, listening, interim, start(), stop(), error}` plus an `onFinal(text)` callback option.
- Error mapping: `not-allowed` → "Microphone permission denied", `no-speech` → "Didn't catch that — try again", others → "Voice input stopped".
- Only one instance listens at a time: a module-level `activeStop` function stops the previous one.

---

## 9. Routes

| Path | Page |
|---|---|
| `/` | HomePage |
| `/runs` | HistoryPage |
| `/runs/:id` | RunPage (live or finished) |
| `/runs/:id?replay=1&speed=20` | RunPage in replay mode |
| `*` | NotFoundPage |

---

## 10. Pages (wireframes are binding)

### 10.1 HomePage (`/`)
Everything is **centered on one vertical axis**. Column width `max-w-[720px] mx-auto`, except HowItWorks, which is `max-w-[880px]`.

```
┌ Header (Container 1280) ───────────────────────────────────────────────┐
│ ◦◦◦ ScholarSwarm                                  New search  History ◐ │
└────────────────────────────────────────────────────────────────────────┘
                     ( ● 11 AI agents · official sources only )      ← pill, mx-auto
                    Find funding you actually qualify for.           ← Display, text-center
        Upload a resume, type, or just talk. Agents research, verify  ← Body 16px muted,
        every requirement and draft your application.                    text-center max-w-[560px]
   ┌────────────────────────── Composer (720) ───────────────────────────┐
   │ [resume.pdf · Resume ▾ ✕] [marks.pdf · Transcript ▾ ✕]  (if files)  │
   │ Tell us about yourself — degree, grades, projects, and what…       │
   │                                                                     │
   │ listening… "i want a funded masters in"        (interim, if voice)  │
   ├─────────────────────────────────────────────────────────────────────┤
   │ (📎) (🎤) EN-IN ▾                         42 words  [Find scholarships →] │
   └─────────────────────────────────────────────────────────────────────┘
          ✓Degree  ✓Grades  ·Goal  ·Countries  ·Budget  ·Tests  ·Projects   ← centered
          Try a sample:  Rahul · Priya · Arjun · Meera      |   ⚙ Advanced  ← centered
   ─────────────────────────── How it works (880) ───────────────────────────
     (1)────────(2)────────(3)────────(4)────────(5)────────(6)
   Understand    Plan     Research    Verify     Decide     Write
   reads you   picks      searches    checks     ranks     drafts
               queries    the web     official   matches   your SOP
                                      pages
          ✓ Official sources only   ❝ Every fact cited   🔒 Files stay in this session
```

Spacing top to bottom: pill → 16 → Display → 12 → sub → 32 → Composer → 12 → hints → 16 → sample row → 64 → HowItWorks → 48 → trust row.

**Composer (`Composer.tsx`)**
- Card (`rounded-[16px] border border-line bg-surface shadow-card`). `focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/10`.
- Attachment row (`px-4 pt-4 flex flex-wrap gap-2`) is shown only with files. `AttachmentChip` is `h-8 rounded-full border border-line bg-subtle pl-2 pr-1 text-xs`, with a FileText icon, a truncated name (`max-w-[180px]`), a role dropdown (Resume/Transcript), and an ✕ ghost icon button.
- Textarea: shadcn `Textarea` restyled `border-0 shadow-none focus-visible:ring-0 resize-none px-4 pt-4 pb-2 text-[15px] leading-6 min-h-[132px] max-h-[320px]`, auto-growing (set height to `scrollHeight` on input). Placeholder: "Tell us about yourself — your degree, grades, projects, and what you want to study and where. Or drop your resume here."
- Interim line (only while listening): `px-4 pb-2 text-sm italic text-muted` with a red 6px pulsing dot and "Listening…" plus the interim text.
- Toolbar: `flex items-center justify-between border-t border-line px-3 py-2`.
  - **Left group** (`flex items-center gap-1`): Attach (ghost icon button, Paperclip, tooltip "Attach PDF (resume or transcript)"), `VoiceButton` (ghost icon button, Mic; while listening it's a filled accent circle with MicOff and a pulse ring; tooltip "Speak"), then a language `Select` styled `h-8 w-[92px] border-0 bg-transparent text-xs text-muted` with options `EN-IN` (English India, default), `EN-US`, `HI-IN`. Hide the voice button and language select when speech isn't supported, and show a tooltip on a disabled mic: "Voice works in Chrome or Edge".
  - **Right group** (`flex items-center gap-3`): word count (`text-xs text-muted tabular-nums`, e.g. "42 words"), then the primary Button `h-9 px-4` "Find scholarships" with ArrowRight. Disabled until valid. The disabled tooltip says "Add a resume or at least 20 words about you".
- Drag & drop: the whole card is the drop target. On dragover, show an absolute overlay `inset-0 rounded-[16px] border-2 border-dashed border-accent bg-accent-soft/80 flex items-center justify-center text-sm font-medium text-accent` "Drop PDF to attach". Accept `.pdf`, max 2 files, 10 MB each; otherwise show a toast error.
- Role auto-detection: use the filename heuristic (`/transcript|marksheet|grade|semester/i` → Transcript, otherwise Resume; with two files and both "Resume", the second becomes Transcript). The backend `classify_document` still re-checks the content.
- Valid when: files ≥ 1, or words ≥ 20, or a sample is selected.
- `Ctrl/Cmd+Enter` submits.
- Voice: final text is appended to the textarea (one space separator), and the interim text is shown in the interim line.
- Submit: `createRun({description, files, input_modes, sample, ...advancedValues, chaos})` → on success `navigate('/runs/' + run_id)`. On error, a toast with the API detail. The button shows a spinner and "Starting…" while pending.

**CoverageHints**: `flex flex-wrap justify-center gap-2`. Each chip is `h-7 rounded-full px-3 text-xs border`. Covered: `border-ok/30 bg-ok-soft text-ok` with a Check icon. Not covered: `border-line text-muted` with a 6px dot. Debounce 250ms. When files are attached, chips not covered by text show the label "in resume?" in muted italic (the resume probably covers them).

**SampleRow**: `flex items-center justify-center gap-3 text-sm`. "Try a sample:" is muted, then one ghost link button per `meta.samples` (label). Clicking one fills the textarea with `sample.description`, sets the sample, shows a toast "Loaded sample: Rahul". Then a vertical `Separator` (h-4), then the "Advanced" ghost button (SlidersHorizontal icon) that opens `AdvancedSheet`.

**AdvancedSheet** (shadcn `Sheet`, side right, width `w-[440px]`): title "Advanced options", Tabs "Details | Demo".
- Details: a 2-column grid (`grid grid-cols-2 gap-4`): GitHub URL (col-span-2), LinkedIn/portfolio (col-span-2), Target countries (multi chips input, col-span-2), Degree (Select: MS, MEng, MBA, PhD, MA, Other), Budget INR/yr (number), IELTS, TOEFL, GRE (numbers; the third goes col-span-2 or use a 3-col subgrid), Notes (textarea, col-span-2).
- Demo: "Chaos Mode" with each `meta.chaos_points` item as a row (`flex justify-between items-start gap-4 py-3 border-b border-line`): label (`text-sm font-medium`) and caption (Small) on the left, Switch on the right. Then a "Providers" list: a 2-column grid of `StatusPill` (ready/not set).
- Footer: "Done" button. The values live in the HomePage state.

**HowItWorks**: `grid grid-cols-6` (mobile: `grid-cols-3 gap-y-8`). Each column is centered: a 40px circle `bg-surface border border-line` with the phase icon (accent), then the label (`text-sm font-medium mt-3`), then a 2-line caption (Small). A 1px `bg-line` line runs behind the circles at the circle center (absolutely positioned, from the first circle center to the last). Phase icons: Understand `UserSearch`, Plan `Map`, Research `Search`, Verify `ShieldCheck`, Decide `Scale`, Write `PenLine`.

### 10.2 RunPage (`/runs/:id`) — live state (desktop ≥ 1280)

```
Container
┌ RunHeader ───────────────────────────────────────────────────────────────┐
│ (RS) Rahul Sharma   ● Running   run 4b80b7d7                01:37 · ~8 min left  [Replay][⋯] │
└──────────────────────────────────────────────────────────────────────────┘
┌ PhaseStepper: 6 equal segments ─────────────────────────────────────────┐
│ ▬▬▬▬▬▬ ▬▬▬▬▬▬ ▬▬▬▬▬▬ ▬▬▬░░░ ░░░░░░ ░░░░░░                               │
│ ✓Understand ✓Plan ✓Research ●Verify ○Decide ○Write                       │
└──────────────────────────────────────────────────────────────────────────┘
[ InputRequestCard — full width, only while waiting ]
┌ KPI strip: grid-cols-6 equal ────────────────────────────────────────────┐
│ LLM CALLS 13 │ PAGES READ 10 │ CANDIDATES 15 │ VERIFIED 2 │ RECOVERIES 0 │ COST $0.04 │
└──────────────────────────────────────────────────────────────────────────┘
┌ SwarmSection card (full width, canvas height 460) ───────────────────────┐
│  UNDERSTAND   PLAN & RESEARCH   VERIFY      DECIDE        WRITE          │
│  [Profile]    [Scout]         ┌Verifiers┐  [Matcher]     [Report]        │
│  [Clarifier]  [Planner]       │ chips…  │  [Supervisor]  [Critic]        │
│  [GitHub]                     └─────────┘  [Ranker]      [SOP]           │
│                                         (fit view, dotted background)    │
└──────────────────────────────────────────────────────────────────────────┘
┌ data-row="panels" h-[440px] grid-cols-3 gap-6 ───────────────────────────┐
│ [ProfilePanel]         │ [ActivityPanel]        │ [SourcesPanel]          │
└──────────────────────────────────────────────────────────────────────────┘
┌ data-row="insight" h-[400px] grid-cols-2 gap-6 ──────────────────────────┐
│ [GraphPanel]                      │ [BrowserPanel]                        │
└──────────────────────────────────────────────────────────────────────────┘
```
Vertical gaps between all blocks: `gap-6` (24px).

**Responsive:**
- `lg` (1024–1279): same order. The canvas is still shown (fitView scales it). The `panels` row becomes a single `Panel` with Tabs (Profile | Activity | Sources) at `h-[480px]`. The `insight` row stays 2 columns at `h-[360px]`.
- `< lg` (mobile/tablet): RunHeader stacks (name row, then meta row). PhaseStepper is compact (only "Step 4 of 6 · Verify" plus a thin progress bar). KPI strip is `grid-cols-2` (3 rows). Instead of the canvas, show `MobileTimeline` inside the SwarmSection card. Then one Tabs panel (Profile | Activity | Sources | Graph | Browser) at `h-[520px]`.

**Components**
- **RunHeader**: `flex items-center justify-between`.
  - Left: avatar (`size-9 rounded-full bg-accent-soft text-accent text-sm font-semibold`, initials), name (H2), `StatusPill`, and the run id (Mono, muted, first 8 chars, copy-on-click with a toast).
  - Right: timer (Mono `text-sm`, "01:37") · ETA (Small, "~8 min left", or "almost done" when below 30s, from `meta.median_duration_sec`). Then a "Replay" outline button (only when finished or failed), then a `DropdownMenu` (⋯) with "Download report (.md)", "Download SOP (.md)", "Add deadlines to calendar (.ics)" and "Print results" (only when finished), plus "Copy run link".
- **PhaseStepper**: `grid grid-cols-6 gap-2`. Each cell has a bar `h-1.5 rounded-full` (done `bg-ok`, active `bg-accent` with an animated shimmer gradient, pending `bg-line`), then below it (mt-2) `flex items-center gap-1.5 text-xs font-medium`: an icon (done CheckCircle2 in ok, active a 6px accent pulsing dot, pending a Circle in muted) and the phase label. The active label uses `text-ink`, done `text-ink`, pending `text-muted`.
- **KpiStrip**: `grid grid-cols-6 gap-4` of `KpiTile` (`Panel p-4`): Overline label, value `text-2xl font-semibold tabular-nums mt-1`. Values come from the reducer `stats`: LLM calls, pages read, candidates (`candidates.length`), verified, recoveries (retries + fallbacks), and cost (`$0.00` format). When recoveries > 0, the value is `text-warn`.
- **InputRequestCard**: `Panel border-warn/40 bg-warn-soft/40 p-5`. Header row: an amber icon tile (Hand icon), the H3 "The swarm needs one detail", and Small "Answer or skip — agents continue either way". The questions grid is `grid grid-cols-2 gap-4 mt-4` (one question → col-span-2). Field types: `multi` → chips input with suggestions from `COUNTRIES` when the field is target_countries; `text` → Input plus a VoiceButton inside the input's right side; `number` → Input type number. Actions are right-aligned: "Skip" (ghost) and "Continue" (primary). Submitting calls `resumeRun` with a pending spinner, and the card hides when the `resumed` event arrives. The canvas Clarifier node shows the "waiting" state at the same time.
- **SwarmSection**: a Panel with a header row (`flex items-center justify-between px-5 pt-4`): H3 "Agent swarm" and Small "{n} agents · {k} working now", plus on the right a legend of 4 small StatusPills (Working, Done, Waiting, Failed). Body: `SwarmCanvas` (§11) at `h-[460px]` on lg+, `MobileTimeline` below lg.
- **ProfilePanel**: Panel. Header "What the agents understood" (H3) and, on the right, Small "from resume + description". Body (ScrollArea): a definition grid `grid grid-cols-[96px_1fr] gap-x-4 gap-y-2 text-sm` with rows Degree, University, CGPA, Target, Countries, Tests, Budget (labels Small muted; empty values become "—"). Then a "Skills" Overline plus a wrap of `Badge variant="secondary"` (max 10, then "+N"). Then "Projects" Overline with two subsections: "From resume" (FileText icon rows) and "Found on GitHub" (Github icon rows, each with a small "new" ok badge). Then "Not provided" Overline with a muted list. Skeleton loading state (5 rows) until `profile_snapshot` exists.
- **ActivityPanel**: Panel. Header: H3 "Activity" (the **only** title; the Tabs version omits it) and on the right a `ToggleGroup` (Important | All) plus an agent `Select` (`w-[140px] h-8`). Body: ScrollArea with rows `grid grid-cols-[44px_20px_1fr] gap-2 py-2 border-b border-line/60`:
  - col 1: Mono `text-[11px] text-muted` mm:ss
  - col 2: a 20px round icon tile in the event's tone color
  - col 3: `text-xs font-semibold` agent name plus `text-[11px] text-muted uppercase` type on one line, then the message `text-[13px] leading-5 line-clamp-2` (click toggles clamp), then the optional URL as `text-xs text-accent truncate block` link.
  Tone left border: fallback/retry/chaos → `border-l-2 border-warn pl-2`; errors → `border-err`; decision → `border-accent`. Auto-scroll to the bottom unless the user scrolled up more than 48px; then show a floating "Jump to latest" small pill at the bottom center.
- **SourcesPanel**: Panel. Header "Sources" plus Small "{verified} verified · {rejected} rejected · {total} found". Rows `flex items-center gap-3 py-2 border-b border-line/60`: `Favicon` (16px img from `https://www.google.com/s2/favicons?domain=<domain>&sz=32`, falling back to a Globe icon on error), then a `min-w-0 flex-1` block with the title (`text-[13px] truncate`) and the domain (Small truncate), then a `StatusPill` of the worker state, then ShieldCheck (ok) if official.
- **GraphPanel**: Panel. Header "Knowledge graph" plus a legend (dots: Student, Skill, Project, Opportunity, Requirement, Organization, Country). Body: `react-force-graph-2d` sized to the panel body via `ResizeObserver`. Node color by type using these exact hex values in a TS constant (the one allowed place besides tokens, since canvas drawing can't use CSS vars): Student `#4F46E5`, Skill `#0EA5E9`, Project `#8B5CF6`, Opportunity `#059669`, Requirement `#D97706`, Organization `#64748B`, Country `#A1A1AA`. Draw labels only for Student and Opportunity nodes. MEETS links in ok green, MISSES in err red, others `#D4D4D8`. `cooldownTicks=80`, then `zoomToFit(400, 24)`. Empty state: "The graph fills in once the Matcher runs."
- **BrowserPanel**: Panel. Header "Live browser" plus a red "LIVE" pill while a URL exists. Body: an `iframe` filling the body (`w-full h-full rounded-b-[12px] border-0`). Empty states: before any URL, "An agent's browser appears here when it opens a website"; after finishing, "Browser session closed".
- **ReplayBar** (replay mode only): a sticky bar under the header `h-12 bg-accent-soft border-b border-accent/20`, with a Container row: a "Replay" pill, a speed ToggleGroup (1× 5× 20×), "Restart", and "Exit replay" (navigates to the same URL without the query).

### 10.3 RunPage — finished state
When `status` is finished and the report is loaded, the order becomes:
```
RunHeader (● Finished · 10m 12s · actions)
ResultSummary
Tabs: Matches | All opportunities | Unlock more | Deadlines | SOP
Accordion (collapsed by default): "How the swarm worked" → PhaseStepper + KpiStrip + SwarmSection + panels rows (final state)
```
- **ResultSummary**: Panel `p-6`. The H2 sentence is built deterministically: "We verified **{n} opportunities** from official sources — **{e} are strong matches** for you." Second line (Body muted): "Nearest deadline: **{date}** ({name})" or "Most deadlines are rolling — check each official page." Below, `grid grid-cols-3 gap-4 mt-5` of KpiTiles: Verified · Eligible now · Unlockable with one step (`gaps[0].unlocks.length`, or 0).
- **Tabs** (shadcn, `TabsList` full width `grid grid-cols-5`). Content area `mt-6`.
- **Matches** → `flex flex-col gap-4` of `MatchCard`:
  ```
  ┌──────────────────────────────────────────────────────────────────────────┐
  │ 01   DAAD EPOS Scholarship                                  ( 87% )      │
  │      DAAD · Germany                                          match       │
  │ ┌ Funding ─────┬ Deadline ──────┬ Eligibility ──┬ Source ──────────┐      │
  │ │ Full + stipend│ 15 Nov · 20 d │ ● Eligible     │ ✓ Official page  │      │
  │ └───────────────┴───────────────┴───────────────┴──────────────────┘      │
  │ Why you — 3 lines of markdown, "Show more"                               │
  │ ▸ Requirements (6)   ▸ How to apply   ▸ Sources (3)          [Apply ↗]   │
  └──────────────────────────────────────────────────────────────────────────┘
  ```
  - Grid: `grid grid-cols-[56px_1fr_120px] gap-x-4 p-6`. Col 1: rank `text-2xl font-semibold text-muted tabular-nums` ("01"). Col 2: name (H3, `text-lg`) and org · country (Small). Col 3: `ScoreRing` (56px SVG ring, stroke 5, accent, center text `text-sm font-semibold`, "match" Small under it), right-aligned.
  - Facts row: `col-span-3 mt-4 grid grid-cols-4 divide-x divide-line rounded-[10px] border border-line bg-subtle/50`. Each cell `px-4 py-3` has an Overline label, then a value `text-sm font-medium truncate` with a title tooltip. Deadline value: date plus a days-left badge (red < 14, amber < 45, ok otherwise; "rolling" muted when there's no date).
  - Why you: `col-span-3 mt-4`, markdown `text-sm leading-6 line-clamp-3`, with a "Show more"/"Show less" ghost xs toggle.
  - Footer: `col-span-3 mt-4 flex items-center justify-between`. Left: an `Accordion type="multiple"` whose triggers are rendered as ghost xs buttons in a row (Requirements (n), How to apply, Sources (n)); their content opens **below the footer** at full width. Right: the primary Button "Apply" with ExternalLink (`application_url || official_url`, new tab).
  - **RequirementList**: rows `grid grid-cols-[20px_1fr_auto] gap-3 py-2 border-b border-line/60`: an icon (met yes → CheckCircle2 ok, no → XCircle err, unknown → HelpCircle muted), then the description (`text-sm`) with the evidence (Small) below, then an Info icon button with a Tooltip containing `“quote”` (italic, max-w-[320px]) and the domain.
  - How to apply: an ordered list `list-decimal pl-5 text-sm space-y-1`, then "Documents" Overline with check-square rows.
  - Sources: `SourceChip` list (favicon + domain + verification icon; Tooltip with the quote).
- **All opportunities** → a toolbar (`flex items-center justify-between mb-4`): left, a filter ToggleGroup (All | Eligible | Partial | Not eligible); right, a country `Select` and a search `Input` (`w-[220px]`). Then a shadcn `Table` inside a Panel: columns Opportunity (name `font-medium` + org Small, `min-w-[260px]`), Country, Funding, Deadline, Eligibility (StatusPill), Score (`tabular-nums` + a thin 48px bar), Verification (icon + text), and a link (ExternalLink icon button). Sortable by Score (default desc) and Deadline via clickable headers with an arrow icon. Below it, an `Accordion` "Rejected ({n})" with a simple 2-column table (URL domain, reason).
- **Unlock more** → `grid grid-cols-2 gap-6` (mobile 1 column):
  - Left: H3 "One step away", then a list of gap cards (Panel `p-4`): the title `text-sm font-semibold` (e.g. "IELTS ≥ 6.5"), a Badge "unlocks {k}", the suggestion (Small), and the unlocked names as small chips.
  - Right: `WhatIfForm` Panel `p-5 sticky top-20`: H3 "What if…", then rows with Label + Slider + value (Mono) for CGPA (0–10, 0.1), IELTS (0–9, 0.5), TOEFL (0–120, 1), GRE (260–340, 1) and Work experience (0–10, 0.5), each prefilled from the profile (default slider position at the student's value or the minimum). A "Recalculate" primary button calls `whatIf`. The result is a list "Newly eligible" (ok) and "Still blocked" (muted) compared with the original report.
- **Deadlines** → a header row with H3 "Deadlines", a "Show expired" Switch on the right, and the "Add all to calendar" outline button (`icsUrl`, CalendarPlus icon). The list is grouped by month (Overline "NOVEMBER 2026"). Rows `grid grid-cols-[56px_1fr_auto] gap-4 items-center py-3 border-b`: a date block (day `text-xl font-semibold tabular-nums` over a month Small, centered, in a `bg-subtle rounded-[10px] h-14 w-14` box), name and org, then a days-left badge. Opportunities without a date go under a "Rolling / check official page" group at the end.
- **SOP** → `grid grid-cols-[1fr_300px] gap-6` (mobile 1 column):
  - Left: `SopDocument` Panel `p-8 sm:p-10` with a header row (Small "Statement of purpose for" plus H3 program name; right side: "{words} words · {revisions} revisions", Copy and Download icon buttons). The body is markdown with `prose`-like styles defined in globals.css (`.sop h2 {…} .sop p {margin: 0 0 1em; line-height: 1.75; font-size: 15px}`), max line length `max-w-[68ch]`. Highlight `[ADD: …]` placeholders by splitting text nodes with `/\[ADD:[^\]]+\]/g` and wrapping matches in `<mark class="rounded px-1 bg-warn-soft text-warn">`.
  - Right: a "Critic notes" Panel `p-5` with a numbered list of `critic_notes` (Small), or "No open issues" (ok).
- Print (`window.print()`): `@media print` hides the header, accordion, buttons and tabs list, shows all tab contents stacked (render all tab contents with `forceMount` and CSS show/hide), white background.

### 10.4 RunPage — failed state
RunHeader with a ● Failed pill, then an error Panel (`border-err/40 bg-err-soft/40`) with the H3 "This run stopped", the error text (Mono xs, wrapped), and buttons "Replay what happened" and "Start a new search". Below it, the "How the swarm worked" accordion (expanded).

### 10.5 HistoryPage (`/runs`)
`PageHeader`: H1 "History" plus Small "Every search you ran, with a replay." Right side: the primary Button "New search".
A Panel with a shadcn Table: Student (avatar initials + name), Started (relative, with the absolute date in a tooltip), Duration (Mono), Verified (tabular), Status (StatusPill), and right-aligned actions (`Open` ghost and `Replay` ghost, Play icon, only for finished/failed). The whole row is clickable to Open. Empty state (`EmptyState`): LogoMark at 40px, H3 "No searches yet", Small text, and the primary "Start a search" button, centered with `py-16`.

### 10.6 NotFoundPage
A centered EmptyState with "Page not found" and a "Go home" button.

---

## 11. Swarm canvas (React Flow) — exact spec

### 11.1 Settings
`<ReactFlow nodes edges nodeTypes edgeTypes fitView fitViewOptions={{padding: containerWidth >= 1200 ? 0.08 : 0.02}} minZoom={0.4} maxZoom={1.2} nodesDraggable={false} nodesConnectable={false} elementsSelectable={false} panOnDrag={true} zoomOnScroll={false} zoomOnPinch={true} preventScrolling={false} proOptions={{hideAttribution: true}}>` plus `<Background variant="dots" gap={20} size={1} />` (dot color = `--color-line`) and `<Controls showInteractive={false} position="bottom-right" />`. Call `fitView()` again on container resize (ResizeObserver, debounced 150ms). Import `@xyflow/react/dist/style.css`, then override React Flow's CSS variables for the theme in globals.css.

### 11.2 Node sizes
- `AgentNode`: **210 × 76** px.
- `VerifierPoolNode`: **230 × 300** px.
- `LaneLabelNode`: 210 × 20 (230 for the verify lane), text only.

### 11.3 Coordinates (top-left `position`, in flow units) — binding
| Node id | type | x | y |
|---|---|---|---|
| `lane-understand` "UNDERSTAND" | lane | 0 | -36 |
| `lane-plan` "PLAN & RESEARCH" | lane | 250 | -36 |
| `lane-verify` "VERIFY" | lane | 500 | -36 |
| `lane-decide` "DECIDE" | lane | 770 | -36 |
| `lane-write` "WRITE" | lane | 1020 | -36 |
| `profile_analyst` | agent | 0 | 0 |
| `clarifier` | agent | 0 | 112 |
| `github_enricher` | agent | 0 | 224 |
| `scout` | agent | 250 | 0 |
| `planner` | agent | 250 | 112 |
| `verifier` | verifierPool | 500 | 0 |
| `matcher` | agent | 770 | 0 |
| `supervisor` | agent | 770 | 112 |
| `ranker` | agent | 770 | 224 |
| `finalizer` | agent | 1020 | 0 |
| `critic` | agent | 1020 | 112 |
| `sop_writer` | agent | 1020 | 224 |

Total extent: x 0–1230, y −36–300 (+ a loop lane at y=330). Nothing overlaps by construction. Keep these in `swarm/agents.ts` as `LAYOUT`.

### 11.4 Handles
Every AgentNode renders 8 invisible handles (`opacity-0`, size 1): ids `t-s, b-s, l-s, r-s` (type source) and `t-t, b-t, l-t, r-t` (type target) at top/bottom/left/right center. VerifierPoolNode renders `l-t` at y=38 (the left side at the same height as the scout center) and `r-s` at y=38 (lined up with the matcher center).

### 11.5 Edges — binding (sourceHandle → targetHandle, type)
| Edge | source → target | handles | type | notes |
|---|---|---|---|---|
| e1 | profile_analyst → clarifier | b-s → t-t | flow | vertical |
| e2 | clarifier → github_enricher | b-s → t-t | flow | vertical |
| e3 | profile_analyst → github_enricher | l-s → l-t | loop | waypoints (§11.6) bulging left: x −24 |
| e4 | github_enricher → planner | r-s → l-t | flow | bezier, goes up one row |
| e5 | planner → scout | t-s → b-t | flow | vertical, upward |
| e6 | scout → verifier | r-s → l-t | flow | straight |
| e7 | verifier → matcher | r-s → l-t | flow | straight |
| e8 | matcher → supervisor | b-s → t-t | flow | vertical |
| e9 | supervisor → planner | l-s → r-t | loop | waypoints: (750,150) → (750,330) → (480,330) → (480,150) → planner r-t (460,150); label "re-plan" |
| e10 | supervisor → ranker | b-s → t-t | flow | vertical |
| e11 | ranker → sop_writer | r-s → l-t | flow | straight (same row) |
| e12 | sop_writer → critic | t-s → b-t | flow | vertical, upward |
| e13 | critic → sop_writer | r-s → r-t | loop | waypoints bulging right: x 1254; label "revise" |
| e14 | critic → finalizer | t-s → b-t | flow | vertical, upward |

Edge ids are `"<src>-><dst>"`, matching the reducer's `activeEdges`/`traversedEdges` keys.

### 11.6 `LoopEdge.tsx`
Builds an orthogonal path through `data.waypoints` with 8px rounded corners (use quadratic curves at each corner). Stroke `--color-line-strong`, width 1.5, `strokeDasharray="4 4"`. Active: accent stroke, width 2, the dash animation, and the label pill at the middle waypoint. For e3 and e13, compute waypoints from the handle positions passed in props (`sourceX/Y`, `targetX/Y`) plus the fixed bulge x.

### 11.7 `FlowEdge.tsx`
- `getBezierPath` (or `getStraightPath` when `sourceY === targetY` or `sourceX === targetX`).
- Styles:
  - idle: `--color-line-strong`, 1.5px
  - traversed (in `traversedEdges`, not active): `--color-muted` at 60% opacity, 1.5px
  - active: accent, 2px, `strokeDasharray 6 4`, `animation: ss-dash .6s linear infinite`, **plus a particle**: `<circle r="3" fill="var(--color-accent)"><animateMotion dur="1.2s" repeatCount="indefinite" path={edgePath} /></circle>` (omitted under reduced motion)
- Label: if the reducer has a hand-off label for this edge within the active window, render it with `EdgeLabelRenderer` as a pill: `absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent/30 bg-surface px-2 py-0.5 text-[11px] font-medium text-accent shadow-card`, fading in and out with motion. Show at most 2 labels at once (the newest).

### 11.8 `AgentNode.tsx`
```
┌──────────────────────────────────────────┐ 210×76, rounded-[10px], border, bg-surface, px-3 py-2.5
│ ┌──┐  Profile Analyst                 ⟳ │ row 1: icon tile 32×32 rounded-[8px] + name (13px/600, truncate) + status icon 14px
│ └──┘  Reading resume: 4,210 chars…       │ row 2 (pl-[44px]): thought 12px muted truncate (title=full)
└──────────────────────────────────────────┘
```
- Name: `agent.label` (full names; they fit at 210px: "Profile Analyst", "GitHub Enricher", "Supervisor", "SOP Writer"…).
- Thought: `state.thoughts[id] || agent.role`.
- Icon tile per state: idle `bg-subtle text-muted`; running `bg-accent-soft text-accent`; done `bg-ok-soft text-ok`; failed `bg-err-soft text-err`; waiting `bg-warn-soft text-warn`; skipped `bg-subtle text-muted`.
- Node container per state: idle `border-line`; running `border-accent ring-4 ring-accent/10 animate-[ss-pulse_1.6s_ease-in-out_infinite]`; done `border-line`; failed `border-err/50`; waiting `border-warn ring-4 ring-warn/10`; skipped `border-dashed opacity-60`.
- Status icon: running `Loader2 animate-spin text-accent`; done `CheckCircle2 text-ok`; failed `XCircle text-err`; waiting `Hand text-warn`; skipped `MinusCircle text-muted`; idle `Circle text-line-strong`.
- Tooltip on hover (shadcn Tooltip, side top): the full role plus the full thought.
- Agent icons (lucide): profile_analyst `FileText`, clarifier `MessageCircleQuestion`, github_enricher `Github`, planner `Map`, supervisor `GitBranch`, scout `Search`, verifier `ShieldCheck`, matcher `Network`, ranker `Trophy`, sop_writer `PenLine`, critic `ScanSearch`, finalizer `FileCheck2`.

### 11.9 `VerifierPoolNode.tsx` (230×300)
```
┌ ShieldCheck  Verifiers            ⟳ ┐  header row like AgentNode
│ Reads official pages in parallel     │  12px muted
│ ┌────────┬────────┬────────┐         │  3 equal mini stats: Running · Verified · Rejected
│ │   5    │   2    │   7    │         │  value 15px/600 tabular, label 10px uppercase muted
│ └────────┴────────┴────────┘         │
│ [● daad.de    ] [● tum.de     ]      │  chip grid: grid-cols-2 gap-1.5, chip h-6 rounded-md
│ [● nus.edu.sg ] [✓ uoft.ca    ]      │  border px-1.5 text-[11px] truncate
│ … up to 10 chips                      │
│ +6 more                               │  Small, only if > 10
└───────────────────────────────────────┘
```
Chip states (dot or icon + border):
| State | Look |
|---|---|
| queued | `border-line text-muted`, gray dot |
| fetching | `border-accent/30 text-ink`, accent dot pulsing |
| reading | `border-accent text-ink`, accent dot |
| verified | `border-ok/40 bg-ok-soft text-ok`, Check icon |
| rejected | `border-line text-muted line-through opacity-60` |
| failed | `border-err/40 text-err`, X icon |
| fallback flash | adds `ring-2 ring-warn/40` for the flash ticks |

Sort chips: active (fetching/reading) first, then verified, queued, rejected. Tooltip per chip: title, state, last message, URL.

### 11.10 `MobileTimeline.tsx`
A vertical list in agent order (profile_analyst, clarifier, github_enricher, planner, scout, verifier, matcher, supervisor, ranker, sop_writer, critic, finalizer). Each row is `grid grid-cols-[32px_1fr_auto] gap-3 py-3` with a 1px vertical connector line between icon tiles: icon tile (same state styles), name + thought (truncate), StatusPill. The verifier row shows the chip grid below it, with up to 6 chips.

---

## 12. Common components (exact)
- **Panel**: props `title?`, `subtitle?`, `actions?`, `className`, `bodyClassName`, `scroll?: boolean`. Structure: `section.flex.flex-col.h-full.min-h-0.bg-surface.border.border-line.rounded-[12px].shadow-card` → header `flex items-start justify-between gap-4 px-5 pt-4 pb-3 border-b border-line` (omitted without a title) → body `flex-1 min-h-0` (wrapped in `ScrollArea` when `scroll`) with `px-5 py-3`. `data-testid="panel"`.
- **StatusPill**: `inline-flex items-center gap-1.5 h-6 rounded-full border px-2 text-xs font-medium`. Tones: neutral, accent, ok, warn, err (border `/30`, text tone, bg `-soft`). A 6px dot or a 12px icon. Status map: queued neutral "Queued", running accent "Running" (pulsing dot), waiting_input warn "Needs input", finished ok "Finished", failed err "Failed".
- **KpiTile**, **ScoreRing**, **SourceChip**, **Favicon**, **EmptyState** as described above.
- **PageHeader**: `flex items-end justify-between gap-4 mb-8`; title block (H1 + Small) and an actions slot.

---

## 13. Accessibility and copy
- Every icon-only button has `aria-label` and a Tooltip.
- Focus: shadcn default ring (`ring-accent/40`); never remove outlines.
- Color is never the only signal (pills have text; nodes have icons).
- Contrast: `text-muted` on `bg-surface` meets 4.5:1 (zinc-500 on white is OK).
- Copy: short, plain, sentence case. No "AI-powered", no emoji in the UI.
- `<title>`: Home "ScholarSwarm"; Run "(4/6) Verify · Rahul Sharma · ScholarSwarm" while live, "✓ Results · Rahul Sharma" when finished; History "History · ScholarSwarm".

---

## 14. Tests (all in E2B)

### 14.1 Unit (Vitest, jsdom)
- `runReducer.test.ts` (all ported cases plus traversedEdges)
- `coverage.test.ts`
- `replay.test.ts`
- `format.test.ts`
- Component smoke tests with Testing Library: Composer validity (disabled → enabled at 20 words; enabled with a file), StatusPill text, MatchCard renders facts.

### 14.2 E2E (Playwright, Chromium)
- `playwright.config.ts`: `webServer` = `npm run preview -- --port 4173`. Projects: `desktop-1440` (1440×900), `desktop-1280` (1280×800), `laptop-1024` (1024×768), `mobile-390` (390×844, isMobile). `use.colorScheme` default light; one extra project `desktop-1440-dark`.
- **All API calls are mocked** with `page.route('**/api/**', …)` from fixtures in `frontend/e2e/fixtures/`: `meta.json`, `runs.json`, `run-finished.json` (RunDetail with report), `events-full.json`, `graph.json`. The fixtures come from a real run (§15.3 `export-fixture`). Also build a "mid-run" fixture: `events-mid.json` = the events up to and including the first `opportunity_verified` event. The SSE endpoint is mocked by returning `text/event-stream` with those events (each as `data: <json>\n\n`).
- `flows.spec.ts`: (1) home: type 25 words, the hints update, the button enables, clicking it posts FormData with `description` and navigates (mock `POST /api/runs` → `{run_id: "fixture"}`); (2) attach a PDF via `setInputFiles` → the chip shows "Resume"; (3) the sample chip fills the text; (4) the Advanced sheet opens, a chaos switch toggles; (5) the run mid state shows ≥ 3 nodes "done", one "running", and the worker pool ≥ 1 chip; (6) the finished state shows the summary and 5 MatchCards, and the Requirements accordion opens; (7) the Unlock more what-if posts and renders a result (mock `whatif`); (8) replay at 20× reaches the results; (9) the history row click opens the run.

### 14.3 Layout invariants — `layout.spec.ts` (the guard against "asymmetric and broken")
Run for **every project** on these pages: `/`, `/runs`, `/runs/fixture` (mid-run), `/runs/fixture` (finished, Matches tab), `/runs/fixture` (finished, SOP tab), `/runs/fixture?replay=1&speed=20` (after 2s). Assertions (write one helper per assertion in `e2e/fixtures.ts`):
1. **No horizontal scroll:** `document.documentElement.scrollWidth <= window.innerWidth`.
2. **Aligned containers:** all `[data-testid=container]` elements have the same `left` and `width` (±1px).
3. **Centered home:** on `/`, the composer's center x equals the viewport's center x (±2px), and the headline is `text-align: center`.
4. **Equal rows:** for each `[data-row]`, its direct children have identical `height` (±1px) and, when the row is `grid-cols-N`, identical `width` (±1px).
5. **No node overlap:** the bounding boxes of all `.react-flow__node` elements are pairwise non-intersecting (allow 0px touching).
6. **Edges attach to nodes:** for each `.react-flow__edge path`, its start and end points (`getPointAtLength(0)` and `getTotalLength()`) lie within 4px of some node's bounding box (convert with `getScreenCTM()`).
7. **No clipped text:** every element matching `[data-testid=node-name], h1, h2, h3, button, [data-testid=kpi-value]` has `scrollWidth <= clientWidth + 1`, unless it has class `truncate` **and** a non-empty `title` attribute.
8. **No text overflow out of panels:** for every `[data-testid=panel]`, each descendant text element's right edge is ≤ the panel's right edge + 1px.
9. **Minimum readable canvas:** the React Flow viewport zoom (read from the `.react-flow__viewport` transform) is ≥ 0.80 at 1280/1440 and ≥ 0.70 at 1024. (The math: content ≈ 1278 flow units wide, including the loop bulges; the canvas is ≈ 1214px at 1280+ → 0.82 with 8% padding, and ≈ 958px at 1024 → 0.72 with 2% padding.)
10. **Tap targets (mobile-390):** all buttons have height ≥ 32px.
Any failure blocks the phase. Fix the layout, not the test.

### 14.4 Screenshots — `screenshots.spec.ts`
Saves `docs/screenshots/{page}-{project}.png` for: home, home-with-files, run-mid, run-finished-matches, run-finished-unlock, run-finished-sop, history. Full page. The agent **looks at every screenshot** (open the PNGs) and fixes anything that looks unbalanced before finishing a phase.

### 14.5 Python
`pytest -q` stays green (§5.4).

---

## 15. E2B workflow

### 15.1 Custom template (fixes the OOM)
`e2b/e2b.Dockerfile`:
- `FROM e2bdev/code-interpreter:latest` (or E2B's current base image; check https://e2b.dev/docs/sandbox-template).
- Install Node 20 LTS (if not present), `uv`, and the Playwright Chromium system deps (`npx -y playwright@<same version as package.json> install-deps chromium`).
- Pre-create `/home/user/.cache` so the browser cache persists.
- Build: `npx -y @e2b/cli template build -n scholarswarm-dev -d e2b/e2b.Dockerfile --cpu-count 2 --memory-mb 4096`. Check the flag names with `npx @e2b/cli template build --help`. The CLI needs the human to have logged in once (`npx @e2b/cli auth login`; see human-plan). Record the template id in `e2b/README.md`.
- **Fallback if the template can't be built:** use the default template, but never run two heavy things at once (install, build, browser, app), set `NODE_OPTIONS=--max-old-space-size=320` for builds, and skip real runs (use fixtures only). Tell the human.

### 15.2 `backend/scripts/e2b_run.py` (it does not exist yet — create it)
Python 3.11+ script using the `e2b` SDK. Run it locally with `uv run --python 3.13 --with e2b python backend/scripts/e2b_run.py <cmd>` (the local default Python is 3.7, which is too old). Behaviors:
- The key comes from `backend/.env` (`E2B_API_KEY=` line; parse manually) or the environment. Never print it.
- The sandbox id is stored in `backend/data/.e2b_sandbox` (gitignored).
- Upload: build a tar.gz in memory of `git ls-files -co --exclude-standard` output (tracked + new files, respecting .gitignore), excluding `frontend/node_modules`, `frontend/dist`, `backend/.venv`. Upload to `/home/user/app.tgz`, extract to `/home/user/app`. Upload `backend/.env` to `/home/user/app/backend/.env`.
- Print command output as it streams. Use `PYTHONIOENCODING=utf-8`-safe printing (write bytes, or `errors="replace"`), because Windows consoles crash on emoji otherwise.

| Command | Does |
|---|---|
| `up [--template scholarswarm-dev]` | create the sandbox (timeout 3600s), upload, `uv venv` + `uv pip install -r backend/requirements.txt` (**use uv, not pip; pip OOMs**), `cd frontend && npm ci` |
| `sync` | re-upload and extract (keeps `.venv` and `node_modules`) |
| `pytest [args]` | `cd backend && .venv/bin/python -m pytest -q {args}` |
| `web-test` | `cd frontend && npx tsc --noEmit && npx vitest run` |
| `e2e` | `cd frontend && npx playwright install chromium && npm run build && npx playwright test` (then download `docs/screenshots/*.png` and `frontend/test-results/**` back to the local repo) |
| `gen-api` | start uvicorn if not running, then `cd frontend && npm run gen:api`, and download `src/api/schema.d.ts` back |
| `build` | `cd frontend && npm run build` |
| `serve` | start uvicorn on 0.0.0.0:8000 in the background (`nohup … > /home/user/uvicorn.log 2>&1 &`), wait for `/api/health`, print `https://` + `sandbox.get_host(8000)` |
| `dev` | `serve`, then `npx vite --host 0.0.0.0 --port 5173` in the background; print the 5173 host URL |
| `run-sample <name>` | `curl -X POST :8000/api/runs -F sample=<name>`, print the run id (real run, about $0.13, needs the 4 GB template) |
| `export-fixture <run_id>` | download `/api/meta`, `/api/runs`, `/api/runs/<id>`, `/api/runs/<id>/events.json`, `/api/runs/<id>/graph` into `frontend/e2e/fixtures/` (`meta.json`, `runs.json`, `run-finished.json`, `events-full.json`, `graph.json`) and derive `events-mid.json`. **Scrub:** replace the student's email and phone in the fixtures with placeholders. |
| `logs` | tail the uvicorn and vite logs |
| `down` | kill the sandbox |

**Lessons already learned (don't repeat):** the default sandbox has ~470 MB RAM → pip and real runs got OOM-killed; `apt`/Playwright install running next to uvicorn killed uvicorn; the sandbox Python is 3.11 (fine); Node 20 is present.

---

## 16. Phases (in order; each ends with green checks in E2B and a commit)

| # | Phase | Work | Acceptance |
|---|---|---|---|
| 0 | E2B foundation | §15.1 template (or fallback), §15.2 script | `up` → `pytest` green; `serve` URL opens the old UI |
| 1 | API prep | §5.1, §5.2, §5.4 (meta, events.json, response models, moved captions/samples) | `pytest` green; `/docs` shows the new schemas |
| 2 | Frontend scaffold | Vite app, Tailwind v4 tokens (§6), shadcn init + components, fonts, AppShell/Header/Container/LogoMark/theme, router with placeholder pages, `gen-api` → `schema.d.ts`, `types.ts` | `web-test` green; `dev` URL shows the header and empty pages in light and dark; `tsc` has no errors |
| 3 | Data layer | client, queries, runReducer (port and tests), useRunStream, useReplay, coverage (moved), speech hook; `run-sample rahul` then `export-fixture` | all Vitest green (ported cases included); fixtures committed |
| 4 | Home | §10.1 fully | `flows` 1–4 pass; layout invariants pass on `/` for all projects; screenshots reviewed |
| 5 | Run page — live | §10.2 + §11 + §12 | `flows` 5 passes; invariants pass on mid-run for all projects (especially 5, 6, 9); a live `run-sample` viewed on the `dev` URL looks right |
| 6 | Run page — finished | §10.3, §10.4, print | `flows` 6–7 pass; invariants pass on Matches and SOP |
| 7 | History, replay, 404 | §10.5, §10.6, ReplayBar | `flows` 8–9 pass; invariants pass |
| 8 | Polish pass | Dark mode project, reduced motion, empty/loading (Skeleton) states everywhere, toasts on errors, keyboard (Ctrl+Enter, Esc closes sheet) | all E2E green on all 5 projects; every screenshot reviewed and looks balanced |
| 9 | Switch over | §5.3 SPA serving; delete NiceGUI (§2 list); `requirements.txt` without nicegui; README/STATUS/docs updates (new screenshots, how to run via E2B) | `pytest` green; `build` then `serve` URL shows the React app at `/`, deep link `/runs/<id>` works on reload; human sign-off (human-plan §4) |

---

## 17. Definition of done
- [ ] The canvas is readable: zoom ≥ 0.8 at 1280+, ≥ 0.7 at 1024; MobileTimeline below 1024.
- [ ] All pages pass the layout invariants (§14.3) at 1440, 1280, 1024 and 390 widths, light and dark.
- [ ] The swarm canvas has no overlapping nodes, no cut-off names, and every edge touches its nodes; active hand-offs animate with labels; verifier chips update live.
- [ ] Home is centered and symmetric; the composer supports files, typing and voice; Ctrl+Enter works.
- [ ] Run page rows have equal heights; no panel has an empty half; the finished view leads with results.
- [ ] Replay works from History and from the run header.
- [ ] NiceGUI is fully removed; FastAPI serves the built SPA; `pytest`, Vitest and Playwright are all green in E2B.
- [ ] `docs/screenshots/` contains the final screenshots; no secrets in git.
