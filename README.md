# ScholarSwarm

**AI agents that find your funding.** Drop a resume, type a few sentences, or just speak. Then
watch a swarm of agents search the web, open official pages, verify deadlines and funding with
quotes, build a knowledge graph, and write a statement of purpose.

Production is one Python process: FastAPI serves the API and the built React SPA from `frontend/dist`.
Development uses Vite on port 5173 with a proxy to uvicorn on port 8000.

---

## What the swarm does

| Agent | Job |
|---|---|
| **Profile Analyst** | Resume + transcript PDFs + form → structured `StudentProfile` |
| **Clarifier** | Pauses the graph and asks you for critical missing fields (human-in-the-loop) |
| **GitHub Enricher** | Mines public repositories for skills and projects that are not on the resume |
| **Planner** | Designs 6–10 targeted search queries; re-plans when results are weak |
| **Scout** | Searches Tavily → Exa → Serper with visible fallbacks |
| **Verifiers** (parallel) | Fetches each page (cache → Jina → Firecrawl → cloud browser), extracts requirements with verbatim quotes, checks eligibility |
| **Matcher** | Deterministic scoring, gaps, and writes everything to Neo4j (or in-memory networkx) |
| **Supervisor** | Decides whether to re-plan or proceed, and explains the decision in the event feed |
| **Ranker** | Top 5 with explanations grounded in knowledge-graph paths |
| **SOP Writer + Critic** | Drafts an SOP, fact-checks it against the profile, and revises |

Every fact shown in the UI carries a source URL and a quote. Every failure is visible: retries,
fallbacks, rejected URLs and chaos injections all appear as events.

The React UI renders the agents as a six-phase flow with a live verifier pool, a parallel activity
feed, sources, the knowledge graph and the live browser. Finished runs lead with results: matches,
all opportunities, an instant What-If, deadlines and the SOP. Every run can be replayed at 1×, 5×
or 20×.

---

## Quick start

### 1. Requirements

- Python 3.11 or newer (the checked version is 3.14)
- Node.js 20 or newer
- API keys: one LLM provider (or any OpenAI-compatible gateway), Tavily, Kernel
- Optional: Exa, Serper, Firecrawl, Jina, Neo4j AuraDB, Langfuse

### 2. Install

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
playwright install chromium        # local browser fallback

cd ../frontend
npm install
```

On a fresh Linux machine, Chromium may need system libraries:

```bash
backend/.venv/bin/playwright install-deps chromium
```

### 3. Configure

```bash
cp backend/.env.example backend/.env
```

Fill in `backend/.env`. At minimum:

```dotenv
MODEL_SMART=openai/deepseek-v4.1-flash
MODEL_FAST=openai/deepseek-v4.1-flash
MODEL_FALLBACK=openai/deepseek-v4.1-flash
LLM_API_BASE=https://opencode.ai/inference/go/openai/v1
LLM_API_KEY=...

TAVILY_API_KEY=...
KERNEL_API_KEY=...
# Optional: EXA_API_KEY, FIRECRAWL_API_KEY, JINA_API_KEY, NEO4J_*, LANGFUSE_*
```

`LLM_API_BASE` is any OpenAI-compatible endpoint. For **OpenCode Go**, use
`https://opencode.ai/inference/go/openai/v1` with the key from your Go subscription: the app
adds the required `x-opencode-session` header and a client user agent automatically.

If you leave `LLM_API_BASE` empty, use a native LiteLLM model string (`anthropic/...`,
`openai/...`, `gemini/...`) and the matching native key.

GitHub needs no key: the app uses `GITHUB_TOKEN` from the environment if present, then the
`gh auth token` login, then unauthenticated requests (60/hour).

### 4. Verify every provider

```bash
cd backend
.venv/bin/python scripts/check_keys.py
```

It prints one line per provider and never prints a key. Required providers must be green.

If Neo4j is configured, verify the graph layer with a self-cleaning smoke test:

```bash
.venv/bin/python scripts/smoke_graph.py
```

### 5. Run in development

Two terminals:

```bash
# terminal 1 — API
cd backend
.venv/bin/uvicorn app.main:app --reload --port 8000

# terminal 2 — React
cd frontend
npm run dev
```

- UI: <http://localhost:5173>
- API docs: <http://localhost:8000/docs>

Vite proxies `/api` to uvicorn. Drop a resume/transcript, type your goals, or press the mic
(Chrome or Edge; speech recognition needs HTTPS or localhost). Optional details and **Chaos Mode**
are in **Advanced**. Press **Find scholarships** or `Ctrl/Cmd+Enter`.

### 6. Run the production build

```bash
cd frontend
npm run build

cd ../backend
.venv/bin/uvicorn app.main:app --port 8000
```

Open <http://localhost:8000>. FastAPI serves the SPA at `/` and deep links such as
`/runs/<id>`; API routes stay under `/api`, and unknown API paths return JSON 404s. If
`frontend/dist` is missing, `/` explains how to build it.

---

## Command line

```bash
cd backend

# Full swarm on a sample profile
.venv/bin/python -m app.cli run samples/rahul

# Same, with chaos flags
.venv/bin/python -m app.cli run samples/rahul --chaos search_primary_down,fetch_timeout

# One agent plus its prerequisites
.venv/bin/python -m app.cli agent profile_analyst samples/rahul
.venv/bin/python -m app.cli agent verifier samples/rahul
```

The full run prints every event and finishes with the top 5, deadlines, source URLs and SOP length.

---

## Samples

`backend/samples/{rahul,priya,arjun,meera}/` each contain a fictional resume, transcript and
`form.json`:

- **rahul** — final-year B.Tech CSE, MS in Canada/Germany/Singapore, no IELTS
- **priya** — B.Sc Biotechnology, MS/PhD bioinformatics, no GitHub, any country
- **arjun** — B.Com + 2 years work experience, MBA in the UK/Australia
- **meera** — B.Tech ECE, PhD robotics in the USA, GRE 322 / TOEFL 108

The samples exist to prove there is no hardcoding: a different profile works with zero code
changes. `scripts/make_sample_pdfs.py` regenerates any missing files and never overwrites yours.

---

## Tests

```bash
cd backend
.venv/bin/python -m pytest -q          # 70 backend tests

cd ../frontend
npm test                              # 26 Vitest unit tests
npx playwright test                   # Playwright across 5 screen projects
```

The backend suite covers URL normalisation, quote verification, the retry/fallback policy, score
and gap logic, country/field guards, What-If overrides, routing thresholds, graph reuse and export,
browser ownership, LLM chaos recovery, sample-form merging, document classification, worker
identity, calendar export and SPA serving.

The frontend suite covers the event reducer, coverage hints, replay timing, formatting, the
composer, every page flow and the layout invariants (no overlap, attached edges, equal rows,
container alignment, no clipped text, readable canvas zoom and 32px mobile tap targets) at
1440, 1280, 1024, 390 and dark mode.

---

## REST API

The React UI calls this API over HTTP. See `/docs` for the generated schema.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Provider configuration (booleans only) |
| GET | `/api/meta` | Providers, samples, chaos captions, median duration |
| GET | `/api/samples` | Sample profile names |
| POST | `/api/runs` | Create a run (multipart: PDFs, `description`, form fields, chaos JSON) |
| GET | `/api/runs` | Typed run summaries |
| GET | `/api/runs/{id}` | Typed status, report, pending questions |
| GET | `/api/runs/{id}/events` | SSE event stream (`?after=`) |
| GET | `/api/runs/{id}/events.json` | Stored events for replay and fixtures |
| POST | `/api/runs/{id}/resume` | Answer a Clarifier interrupt |
| GET | `/api/runs/{id}/graph` | Knowledge-graph nodes and links |
| POST | `/api/runs/{id}/whatif` | Instant eligibility recalculation (no LLM) |
| GET | `/api/runs/{id}/report.md` | Full report download |
| GET | `/api/runs/{id}/sop.md` | SOP download |
| GET | `/api/runs/{id}/deadlines.ics` | Calendar export for every dated opportunity |

---

## Failure handling

| Failure | Recovery | What you see |
|---|---|---|
| Search provider down or empty | Next provider (Tavily → Exa → Serper) | Amber `fallback` event |
| Page blocked / JS-only / timeout | Jina → Firecrawl → Kernel browser → reject | Fallback chain, rejected list |
| LLM malformed JSON | Instructor re-asks, then fallback model | `retry` event |
| Hallucinated quote | Quote dropped, confidence lowered | Lower confidence badge |
| Too few verified results | Supervisor re-plans (up to 3 rounds) | Purple `decision` event, loop edge |
| Missing profile fields | Clarifier interrupt → resume | Inline card with voice answers |
| Neo4j down | In-memory networkx graph | `fallback` event |
| GitHub rate limit / no GitHub | Unauthenticated retry → skip enrichment | Skipped node |
| Expired deadline | Excluded from the top 5 | Grey badge |
| Opportunity tied to a different country | Deterministic country check | Marked `not_eligible`, excluded from top 5 |
| Crash mid-run | Checkpoint kept; run marked failed | Red event |

Chaos Mode injects each of these once per run so the recovery is visible:

`search_primary_down`, `fetch_timeout`, `llm_bad_json`, `graph_db_down`, `github_rate_limited`.

---

## Layout

```
opportunity-agent/
├─ backend/
│  ├─ app/
│  │  ├─ api/          REST routes, SSE, meta, SPA-facing response models
│  │  ├─ core/         llm, http, fallback, events, store, chaos, agent decorator
│  │  ├─ models/       Pydantic shapes shared by API and agents
│  │  ├─ tools/        pdf, github, search, fetch, browser, graph_store
│  │  ├─ services/     intake, samples, matching, runner, report, calendar
│  │  ├─ agents/       one file per agent
│  │  ├─ graph/        LangGraph build + supervisor routing
│  │  └─ prompts/      markdown prompts (SYSTEM + USER)
│  ├─ scripts/         check_keys, smoke_graph, make_sample_pdfs, export_diagram, dev mock
│  ├─ samples/         four fictional profiles
│  └─ tests/
├─ frontend/
│  ├─ src/api/         generated schema, types, client, TanStack Query hooks
│  ├─ src/state/       event reducer, SSE stream, replay
│  ├─ src/swarm/       React Flow canvas, agent metadata and layout
│  ├─ src/components/  layout, intake, run, results, shadcn primitives
│  ├─ src/pages/       Home, Run, History, NotFound
│  ├─ src/lib/         coverage, format, speech, theme, URL helpers
│  ├─ src/styles/      globals.css design tokens
│  └─ e2e/             Playwright flows, layout invariants, screenshots
├─ docs/
│  ├─ architecture.md
│  ├─ agents.mmd
│  └─ notes.md
└─ agent-plan.md / human-plan.md
```

---

## Development without LLM credits

`backend/scripts/dev_mock_llm.py` is a local OpenAI-compatible mock that returns canned, clearly
fake extractions. It is useful for testing the graph, UI, chaos recovery and interrupt/resume
without spending money — **it is not a substitute for a real run and must never be used for a
demo or submission**.

```bash
cd backend
.venv/bin/python scripts/dev_mock_llm.py          # terminal 1, port 9100

LLM_API_BASE=http://127.0.0.1:9100/v1 LLM_API_KEY=mock \
MODEL_FAST=openai/mock-fast MODEL_SMART=openai/mock-smart \
.venv/bin/uvicorn app.main:app --port 8000        # terminal 2
```

With the mock, search and page fetches are still real; only extraction and writing are canned.

---

## Screenshots

| Intake | Mission control |
|---|---|
| ![Home](docs/screenshots/home-desktop-1440.png) | ![Mission control](docs/screenshots/run-mid-desktop-1440.png) |

| Results | SOP |
|---|---|
| ![Results](docs/screenshots/run-finished-matches-desktop-1440.png) | ![SOP](docs/screenshots/run-finished-sop-desktop-1440.png) |

Dark mode, files attached, Unlock more and every mobile layout are in
[`docs/screenshots/`](docs/screenshots/).

---

## Security

- `.env` is gitignored; `.env.example` is the committed template.
- Keys are read only through `app/config.py`; `scripts/check_keys.py` prints status, never values.
- Revoke a key immediately if it is ever pushed or recorded.
