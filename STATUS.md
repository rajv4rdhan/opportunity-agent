# ScholarSwarm — build status (2026-10-24)

> Handoff snapshot. The build is complete; one infrastructure item (Neo4j Aura) is open.
> Nothing here contains secrets. `backend/.env` is gitignored.

## TL;DR

- Phases 1–9 of `agent-plan.md` are implemented, tested and committed.
- A **real end-to-end run** on `samples/rahul` finished:
  10 verified opportunities, top 5 with official sources, 946-word SOP, critic notes,
  718 s, **$0.099** of OpenCode Go usage.
- **39 tests pass.** UI checked in headless Chromium with no JS errors.
- **Open item:** the Neo4j Aura host in `backend/.env` no longer resolves. The app falls back
  to the in-memory graph, so everything else works. Fix the URI/credentials tomorrow, then run
  the graph smoke test below.

---

## Verified state

### Provider check (`python scripts/check_keys.py`)

| Provider | Status |
|---|---|
| LLM (`openai/deepseek-v4.1-flash` via OpenCode Go) | ✅ `OK` |
| Tavily | ✅ |
| Exa | ✅ |
| Jina | ✅ |
| Firecrawl | ✅ |
| Kernel | ✅ create + delete |
| GitHub | ✅ authenticated via `gh` CLI (~50k requests) |
| Neo4j | ❌ `69538f1b.databases.neo4j.io` is NXDOMAIN (instance paused/deleted/recreated, or old URI) |
| Serper | ⚪ not configured (optional) |
| Langfuse | ⚪ not configured (optional) |

`check_keys.py` now treats Neo4j as **required when it is configured**, so it exits `1` until the
URI works. If Neo4j is intentionally unused, blank all three `NEO4J_*` vars and it goes back to ⚪.

### Tests

```
cd backend && .venv/bin/python -m pytest -q
39 passed
```

Coverage: utils/quote checks, retry+fallback+chaos, matching/scoring/gaps/What-If, routing,
state reducers, UI event reducer, tolerant model parsing.

### Last real run

- Run id: `949bd9b5ded0` (kept in `backend/data/app.db`; visible under **History**)
- Profile: Rahul Sharma, 8.2/10, MS CS/AI, Canada/Germany/Singapore
- 10 verified opportunities, 9 eligible/partial, top 5:
  1. Japanese Government (MEXT) Scholarship — Kyoto University page
  2. SUTD MEng (Research) Fellowship — Singapore
  3. U of T Computer Science Graduate Funding Package — Canada
  4. National Overseas Scholarship (NOS) — Government of India
  5. Erasmus Mundus Joint Masters — European Commission
- 41 LLM calls · 99 tool calls · 29 pages · 2 retries · 7 fallbacks · 4 errors · 718 s
- **$0.099** estimated Go usage (`usage.opencode.list_cost`)
- SOP: 946 words; critic listed 13 concrete issues after the second revision (loop limit = 2)
- Source check: first quote from each of the top 5 official pages was re-fetched and verified
  with `quote_supported` → **5/5 true**

### Other acceptance checks

- All five Chaos flags (`search_primary_down`, `fetch_timeout`, `llm_bad_json`, `graph_db_down`,
  `github_rate_limited`) fired once and the run still finished; visible amber fallbacks.
- Interrupt → resume tested with `priya` (missing target countries) via API and via the UI **Skip**
  button; also resumed after a process restart. Empty-answer skip uses a `__skip__` sentinel.
- UI: sample select → Launch → live run → results tabs → SOP → history row click; no page or
  console errors. Live browser iframe appears when Kernel is used and shows “session ended” after
  the run.
- Mock-LLM structural runs passed for `arjun`, `meera`, `priya` (real Tavily/Exa + real fetches).
  **Real-LLM runs for those three are still TODO**, so the “4 profiles, zero code changes” check
  is only proven structurally, not with the live model.
- Secrets: `.env` ignored; `git grep` for key patterns returns nothing.

---

## Current configuration (non-secret)

```dotenv
MODEL_SMART=openai/deepseek-v4.1-flash
MODEL_FAST=openai/deepseek-v4.1-flash
MODEL_FALLBACK=openai/deepseek-v4.1-flash
LLM_API_BASE=https://opencode.ai/inference/go/openai/v1
```

- The app sends `x-opencode-session: scholarswarm-<run_id>` and `User-Agent: ScholarSwarm/1.0`
  automatically (required by OpenCode Go).
- Muse Spark 1.3 Contributor is served on the **Responses API** at
  `/inference/go/openai/v1/responses`, so the chat-completions path uses DeepSeek for both tiers.
- Python 3.14.2, NiceGUI 3.18 (`ui.echart`, singular — `ui.echarts` was removed), LangGraph 1.2.
- Neo4j URI currently in `.env`: `neo4j+s://69538f1b.databases.neo4j.io` (stale, NXDOMAIN).
- `backend/data/app.db` contains only the finished real run above (413 events).

---

## Tomorrow — ordered TODO

### 1. Fix Neo4j (only blocker)

In the [Aura console](https://console.neo4j.io):

- Instance **Paused** → Resume, wait for **Running**.
- Instance missing/recreated → download its credentials file; a recreated instance has a **new
  host**. Update all three values from that file:

```dotenv
NEO4J_URI=neo4j+s://<current-instance-id>.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=<password from the same file>
```

Then:

```bash
cd backend
.venv/bin/python scripts/check_keys.py        # expect ✅ neo4j RETURN 1
```

Smoke-test the graph layer against Aura:

```bash
cd backend
.venv/bin/python - <<'PY'
import asyncio
from datetime import date, datetime
from app.models.profile import StudentProfile, Project
from app.models.opportunity import Opportunity, Requirement, Source
from app.tools.graph_store import Neo4jStore

async def main():
    store = Neo4jStore()
    await store.init()                        # creates constraints
    profile = StudentProfile(name="Smoke Student", cgpa=8.2, cgpa_scale=10,
                             skills=["python"], projects=[Project(name="Smoke Project", tech=["python"])])
    opp = Opportunity(id="smoke-opportunity", name="Smoke Scholarship", provider_org="Smoke University",
                      country="Germany", kind="scholarship", funding_type="full",
                      official_url="https://example.edu/smoke", verification="verified_official",
                      confidence=0.9, deadline=date(2027, 1, 15),
                      requirements=[Requirement(key="min_gpa", description="GPA 3.0/4.0",
                                                numeric_value=3.0, numeric_scale=4.0, met="yes")],
                      sources=[Source(url="https://example.edu/smoke", quote="Applications open",
                                      fetch_method="jina", fetched_at=datetime.now())],
                      eligibility="eligible", score=70)
    await store.upsert_student("smoke-student", profile, None)
    await store.upsert_opportunity(opp)
    await store.link_eligibility("smoke-student", opp)
    print("paths:", await store.explain_paths("smoke-student", opp.id))
    print("export:", await store.export("smoke-student"))
    print("recent:", await store.recent_opportunities(["Germany"]))
    await store.close()

asyncio.run(main())
PY
```

If that prints paths/export/recent without errors, the Neo4j layer is done. Optionally re-run
`python -m app.cli run samples/rahul` once to populate Aura with a real run and confirm
`recent_opportunities` reuse on a second run.

### 2. Run the other three profiles with the real model

```bash
cd backend
python -m app.cli run samples/priya     # will ask for target countries → use UI/API or answer
python -m app.cli run samples/arjun
python -m app.cli run samples/meera
```

`priya` interrupts (no target countries); `arjun` has no GitHub; `meera` has GRE/TOEFL.
Confirm the results make sense (MBA for arjun, bioinformatics for priya, robotics for meera).

### 3. Optional polish

- Add Langfuse keys to see traces (`LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`).
- Record the 5-minute demo and rewrite `docs/notes.md` in your own words.
- Re-run `python scripts/export_diagram.py` only if graph edges change.
- If you want the knowledge graph to survive restarts, keep Neo4j configured.

### 4. Submission checklist

- Public GitHub repo with `.env` **not** committed.
- Working demo (local or deploy configs in README).
- 5-minute recording, architecture link, short notes.

---

## Resume commands

```bash
cd /workspaces/opportunity-agent/backend
source .venv/bin/activate

python scripts/check_keys.py
uvicorn app.main:app --reload --port 8000     # UI + API + /docs
python -m app.cli run samples/rahul           # terminal-only run
pytest -q
```

---

## Commits (main milestones)

```
eda0ef2 check: fail clearly when configured Neo4j credentials are rejected
6f28e1a check: distinguish Neo4j DNS failures from an unreachable instance
5172252 ui: clear the live browser view when a run finishes
bce0953 cli: dedupe printed sources; allow 16k extraction output
35de9d8 cli: close Playwright/LiteLLM clients on exit; show deadline text
5e7b29c fix: raise extraction output cap, cap verifier claims and dedupe citations
c26d2fe llm: use OpenCode Go with session header, cost tracking and tolerant extraction
f825fc8 phase 8: skip sentinel for interrupts, accurate page stats and chaos recovery
c29a312 phase 7: NiceGUI live dashboard, results tabs, history and upload form
ce5d9c0 phase 6: REST API for runs, SSE events, graph, what-if and downloads
8449e52 phase 5: LangGraph wiring, supervisor loops, checkpointed runner and CLI run
2c8e9bf phase 4: deterministic matching, all agents, prompts and single-agent CLI
505e388 phase 3: PDF, GitHub, search, fetch, browser and knowledge-graph tools
84dd6e5 phase 2: models, SQLite store, event bus, retry/fallback, LLM wrapper
dd4b4db phase 1: scaffold FastAPI + NiceGUI app with health check
```

---

## Known limitations / notes

- **Deadlines:** the top 5 often show “no deadline” because the official pages say “check the
  faculty/institution” (MEXT, NUS, NL) or “applications open in November” (Erasmus). The UI now
  shows `deadline_text` under the badge, so this is honest rather than missing.
- **Verifier output cap:** 16k tokens, max 8 requirements and 8 sources per opportunity. A very
  large page can still exceed the cap; that candidate becomes a visible rejection and the run
  continues.
- **Critic loop:** stops after `MAX_SOP_REVISIONS=2`. The final draft can still have critic notes;
  they are shown in the SOP tab and report.
- **Knowledge graph:** in-memory without Neo4j, so the kept run’s graph is empty after a restart
  (the UI explains this). Reports and events are in SQLite and survive.
- **OpenCode Go:** a run costs roughly $0.10 at current DeepSeek pricing; the Go plan’s monthly
  allowance is separate. The session header matters; requests without it are rejected.
- **Dev mock:** `backend/scripts/dev_mock_llm.py` is for offline tests only — never for the demo.
- **Live browser:** the iframe is cleared when the run finishes because the Kernel session is
  closed; that is intentional.
