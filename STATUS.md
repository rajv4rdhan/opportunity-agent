# ScholarSwarm — build status (2026-10-25)

> Handoff snapshot. The build is complete and every sample profile now has a real-model run.
> Nothing here contains secrets. `backend/.env` is gitignored.

## TL;DR

- Phases 1–9 of `agent-plan.md` are implemented, tested and committed.
- **54 tests pass.** Neo4j, Tavily, Exa, Jina, Firecrawl, Kernel, GitHub and the LLM are green.
- Neo4j Aura is working again; `scripts/smoke_graph.py` passes (2 paths, 8 nodes, 10 links).
- Real-model runs now exist for all four profiles:
  - `rahul` — verified 2026-10-24 (10 opportunities, top 5, 946-word SOP, $0.099).
  - `arjun` — 12 opportunities, UK/Australia MBA top 5, 822-word SOP, 648 s, $0.143.
  - `meera` — 13 opportunities, US robotics/EE PhD top 5, 1,072-word SOP, 592 s, $0.124.
  - `priya` — 13 opportunities, bioinformatics top 5, 802-word SOP, 610 s, $0.139.
- Top-source quote check: **15/15 supported** across the three new runs.
- A chaos run exercises all five injected failures in one run (see below).

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
| Neo4j | ✅ `RETURN 1` |
| Serper | ⚪ not configured (optional) |
| Langfuse | ⚪ not configured (optional) |

`scripts/smoke_graph.py` also verifies constraints, writes, `explain_paths`, `export` and
`recent_opportunities`, then removes its own nodes. `--keep` preserves them for inspection.

### Tests

```
cd backend && .venv/bin/python -m pytest -q
54 passed
```

Coverage now includes the earlier suite plus country/field guards, graph reuse and export,
browser ownership, LLM chaos recovery, sample-form merging, the failed-run UI path and the
student-name header.

### Real-model runs

| Profile | Run id | Opportunities | Top 5 | SOP | LLM / tools | Retries / fallbacks / errors | Duration | Cost |
|---|---|---|---|---|---|---|---|---|
| Rahul (2026-10-24) | `949bd9b5ded0` (prior data dir) | 10 | yes | 946 w | 41 / 99 | 2 / 7 / 4 | 718 s | $0.099 |
| Arjun | `3c3425497b02` | 12 | yes | 822 w | 64 / 142 | 0 / 14 / 2 | 648 s | $0.143 |
| Meera | `686ad65ea86e` | 13 | yes | 1,072 w | 47 / 112 | 0 / 3 / 0 | 592 s | $0.124 |
| Priya | `798949a465cd` | 13 | yes | 802 w | 53 / 109 | 0 / 2 / 0 | 610 s | $0.139 |
| Meera + all chaos | `a6a3349053c6` | 12 | yes | 791 w | 47 / 103 | 0 / 6 / 0 | 656 s | $0.122 |

Top matches:

- **Arjun (MBA, UK/Australia):** AGSM Global Reach Scholarship; University of Reading Master's
  Excellence; Brunel MBA Scholarship; GREAT Scholarships (Brunel); Aga Khan Foundation ISP.
- **Meera (PhD, USA, robotics/EE):** Texas A&M ECE graduate funding; University of Utah robotics
  funding; Stanford EE PhD; Illinois Information Sciences (CV/ML); NYU Tandon PhD funding.
- **Priya (MS/PhD, bioinformatics):** Inlaks Scholarship; Iowa State BCB graduate assistantships;
  CMU MS Quantitative Biology & Bioinformatics; Illinois Bioinformatics MS; Morgan State
  Bioinformatics MS. Priya's run interrupted on missing target countries and resumed through the
  API with Germany/Canada/United States.

### Quote check

For each new run's top 5, the first non-empty source quote was checked against the cached page text
with the same strict `quote_supported()` used in production:

```
arjun 5/5 · meera 5/5 · priya 5/5  → 15/15
```

### Chaos Mode

The final live run (`a6a3349053c6`, Meera) had all five switches on at once. Every flag fired
exactly once and the run still finished with 12 opportunities and a 791-word SOP:

| Flag | Chaos point | Visible recovery |
|---|---|---|
| `llm_bad_json` | `llm.first_call` | Amber fallback, same-model retry succeeds |
| `github_rate_limited` | `github.api` | Amber fallback, unauthenticated request succeeds |
| `graph_db_down` | `graph.neo4j` | Amber fallback, in-memory graph for this run only |
| `search_primary_down` | `search.tavily` | Amber fallback, Exa takes over |
| `fetch_timeout` | `fetch.jina` | Amber fallback, Firecrawl takes over |

The Critic later hit the 16k output cap once and the same-model retry recovered (the sixth amber
fallback); errors stayed at 0. This also validates the fixed `graph_db_down` check when a Neo4j
driver was already cached from earlier runs.

### Other acceptance checks

- Interrupt → resume worked in the live Priya run via the REST API (the Clarifier asked only for
  target countries, then the graph continued normally).
- No-GitHub profile (`arjun`/`priya`) skips enrichment cleanly; `meera` enriches from GitHub.
- The failed-run UI path is now covered by a unit test: `run_failed` sets `finished`, `failed`,
  increments errors and clears the live-browser URL. Previously that branch was unreachable.
- Student names are persisted during API/UI runs (`runs.student_name`) and shown live/History.
- Neo4j graph writes, paths, export and country/field-aware reuse were exercised against Aura.

---

## What changed today

| Commit | Fix |
|---|---|
| `e623fd7` | Failed runs now surface as failed in the UI; resume clicks cannot reopen the dialog; sample form defaults merge with partial input; background tasks held; shared Chromium not closed by one run; GitHub skills deduped case-insensitively. |
| `f843165` | Graph export includes Project→USES→Skill and Organization→LOCATED_IN→Country; memory export no longer leaks another student via a shared skill. |
| `cbf4efa` | Student name persisted and shown during live runs and History. |
| `079770e` | With one model configured for both tiers, chaos now retries the same model instead of aborting the first agent; added Neo4j smoke script. |
| `3d8a5d7` | Planner keeps every query in the target countries; Verifier rejects opportunities tied elsewhere. |
| `2588d83` | Deterministic country guard in the Matcher (global/regional/aliased names handled). |
| `7ed411f` | Clarified that `country` means study destination; regional programmes are accepted. |
| `a8d9454` | Graph reuse also requires overlapping fields, so another profile's MBA cannot enter a bioinformatics run. |
| `1d1e05f` | `graph_db_down` fires even when a Neo4j driver is already cached; the fallback is per-run and visible. |

The first live Arjun run ranked a US assistantship and a Singapore MBA for a UK/Australia student.
That exposed the missing country guard; the fixed run is the one recorded above.

---

## Current configuration (non-secret)

```dotenv
MODEL_SMART=openai/deepseek-v4.1-flash
MODEL_FAST=openai/deepseek-v4.1-flash
MODEL_FALLBACK=openai/deepseek-v4.1-flash
LLM_API_BASE=https://opencode.ai/inference/go/openai/v1
```

- The app sends `x-opencode-session: scholarswarm-<run_id>` and `User-Agent: ScholarSwarm/1.0`.
- The Neo4j Aura host in `.env` resolves and authenticates. Keep the instance awake before a demo;
  Aura Free pauses after inactivity.
- Python 3.14.2, NiceGUI 3.18 (`ui.echart`), LangGraph 1.2.
- `backend/data/app.db` now contains the three 2026-10-25 runs above (not the prior Rahul data dir).
- `GITHUB_TOKEN` is empty; GitHub auth comes from `gh auth token`.

---

## Remaining human tasks

1. **Record the 5-minute demo** using the script in `human-plan.md`.
2. **Push the public GitHub repo** (confirm `.env` is absent).
3. **Rewrite `docs/notes.md` in your own words** (replace every `[HUMAN: …]`).
4. Optional: add Langfuse keys for traces; re-run `scripts/export_diagram.py` only if graph edges change.

Before a live demo: open the Aura console and resume the instance, then run
`python scripts/check_keys.py` and `python scripts/smoke_graph.py`.

---

## Resume commands

```bash
cd /workspaces/opportunity-agent/backend
source .venv/bin/activate

python scripts/check_keys.py
python scripts/smoke_graph.py                 # optional Neo4j health check
uvicorn app.main:app --reload --port 8000     # UI + API + /docs
python -m app.cli run samples/rahul           # terminal-only run
pytest -q
```

---

## Commits since the previous snapshot

```
1d1e05f fix: fire graph_db_down before using a cached Neo4j driver
a8d9454 planner: only reuse graph results that fit this profile's field
f9cb0a7 matching: treat a region/any target as open rather than a country mismatch
7ed411f fix: clarify country semantics and allow regional programmes
2588d83 matching: reject opportunities tied to a country outside the student's targets
3d8a5d7 prompts: keep research and verification inside the student's target countries
079770e fix: retry the same model when no distinct LLM fallback is configured
cbf4efa ui: persist and show the student's name during a run
f843165 graph: export project skills and organisation countries
e623fd7 fix: surface failed runs, resume races and sample form defaults
6b47371 docs: save build status, verified results and resume plan
```

---

## Known limitations / notes

- **Deadlines:** many official pages say “check the faculty/institution” or “applications open in
  November”; `deadline_text` is shown instead of inventing a date.
- **Graph paths:** program pages often state themes (“leadership potential”) rather than technical
  skills, so some top matches have no skill bridge. The Verifier prompt now asks for short canonical
  `valued_skills`; older reports may still have empty paths and use the deterministic fit reasons.
- **Verifier output cap:** 16k tokens, max 8 requirements and 8 sources per opportunity.
- **Critic loop:** stops after `MAX_SOP_REVISIONS=2`; remaining notes are shown in the SOP tab.
- **Knowledge graph:** Neo4j persists it now. Without Neo4j the in-memory graph is process-local.
- **Cost:** about $0.12–0.14 per full run at current DeepSeek pricing.
- **OpenCode Go:** the session header is required; requests without it are rejected.
- **Dev mock:** `backend/scripts/dev_mock_llm.py` is for offline tests only — never for a demo.
- **Live browser:** the iframe clears when the run finishes because the Kernel session is closed.
