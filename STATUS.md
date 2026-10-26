# ScholarSwarm — build status (2026-10-26)

> Handoff snapshot. The v2 visual UI, effortless intake, mission control, results and replay are
> implemented. Everything was run and tested locally in this workspace (the original plan's E2B
> step was not required by the project owner). Nothing here contains secrets.

## TL;DR

- **The v2 UI is complete:** one composer (resume / text / voice), swarm canvas with hand-off
  labels and a parallel verifier pool, inline voice-enabled clarifier, results, `.ics`, print and
  replay at 1× / 5× / 20×.
- **85 tests pass locally** (`85 passed`), including new intake, worker/hand-off, calendar, replay
  and NiceGUI page tests.
- Real-model runs in the current data dir:
  - **Rahul** (`28cec885bad4`): 10 opportunities, top 5, 694-word SOP, 734 s, $0.254.
  - **Description-only run** (`b5ffc531ba50`): 12 opportunities, top 5, 772-word SOP, 325 s,
    $0.102. This run started with no PDF at all and went through the Clarifier.
- A seeded demo run (`demoresults1`) exists for screenshots and replay. It is clearly demo data.
- Screenshots are in `docs/screenshots/` (light, dark, mobile, mission control, results, SOP and
  history).

---

## What was built in this pass

| Area | Status |
|---|---|
| Design system | `theme.css` tokens, Inter, thin header, `.ss-*` components, print and reduced-motion CSS |
| Intake | One composer; PDFs auto-classified as resume/transcript; typed text; browser speech; coverage hints; `Ctrl/Cmd+Enter` |
| Optional details | Links, countries, degree, fields, budget, IELTS/TOEFL/GRE, samples and Chaos Mode |
| Backend intake | `RunForm.description` + `input_modes`; resume OR transcript OR 20-word description OR sample; API field |
| Profile extraction | Self-description prompt block; spoken-text caveats; document-first facts |
| Event enrichment | Verifier `worker`/`title`/`domain`; hand-off `counts`; compact `profile_preview` |
| Mission control | Phase bar, swarm canvas, animated edges, hand-off labels, worker pool, thoughts, supervisor callout |
| Right column | Inline clarifier with voice, “What the agents understood”, Activity/Sources/Graph/Browser |
| Results | Deterministic summary, top-5 cards, requirement checklist + quote tooltips, all-opportunities filters, Unlock more, deadlines, SOP |
| Extras | `.ics` calendar export, print stylesheet, ETA from median completed runs, replay, history replay buttons |

### Real acceptance checks

- Resume only → results (Rahul).
- Description only, no PDFs → Clarifier → results (b5ff).
- PDFs uploaded in reverse order → roles auto-swapped (Playwright + unit tests).
- Replay ×20 of the seeded run renders the whole swarm and ends with results.
- Calendar endpoint returns a valid VCALENDAR with 7-day VALARM reminders.
- Light, dark, desktop and mobile screenshots reviewed.
- `prefers-reduced-motion` disables animation; print preview shows results only.

Voice input was implemented against the browser Web Speech API. It needs **Chrome or Edge** and a
secure context (`localhost` or HTTPS); the final human check is to allow the microphone and speak.

---

## Tests

```bash
cd backend
.venv/bin/python -m pytest -q
# 85 passed
```

Coverage now includes the previous suite plus:

- `tests/test_intake.py` — sample PDF classification, coverage hints, word counts.
- `tests/test_runner.py` — description-only runs, empty rejection, swapped PDF roles, single transcript.
- `tests/test_agent_decorator.py` — worker identity, counts, profile preview, `GraphInterrupt`.
- `tests/test_live_state.py` — worker transitions, hand-off labels/expiry, phases, thoughts, snapshots.
- `tests/test_calendar.py` — CRLF calendar, one event per dated opportunity, reminders.
- `tests/test_replay.py` — speed scaling and capped idle gaps.
- `tests/test_ui_pages.py` — home validity, finished-results page, replay page.

---

## Real runs in `backend/data/app.db`

| Profile | Run id | Opportunities | Top 5 | SOP | Duration | Cost |
|---|---|---|---:|---:|---:|---:|
| Rahul (sample) | `28cec885bad4` | 10 | 5 | 694 w | 734 s | $0.254 |
| Description only | `b5ffc531ba50` | 12 | 5 | 772 w | 325 s | $0.102 |
| Demo seed (screenshots/replay) | `demoresults1` | 2 | 2 | 96 w | 612 s | $0.120 |

Rahul's top 5: Toronto CS graduate funding, SECAI scholarship, DAAD STEM, DAAD master's
scholarships, Ontario Graduate Scholarship.

Earlier real runs from the previous snapshot (Arjun, Meera, Priya and the all-chaos Meera run)
remain documented in git history and in the prior STATUS snapshot; they are not in the current
data dir.

---

## How to run locally

```bash
cd backend
source .venv/bin/activate

python scripts/check_keys.py
python scripts/smoke_graph.py          # optional Neo4j health check
uvicorn app.main:app --reload --port 8000
python -m app.cli run samples/rahul    # terminal-only run
pytest -q
```

Open <http://localhost:8000>. API docs: <http://localhost:8000/docs>.

---

## Configuration notes

```dotenv
MODEL_SMART=openai/deepseek-v4.1-flash
MODEL_FAST=openai/deepseek-v4.1-flash
MODEL_FALLBACK=openai/deepseek-v4.1-flash
LLM_API_BASE=https://opencode.ai/inference/go/openai/v1
```

- Python 3.14.2, NiceGUI 3.18, LangGraph 1.2.
- `backend/.env` is gitignored. The app reads it through `app/config.py`.
- The app sends `x-opencode-session: scholarswarm-<run_id>` and `User-Agent: ScholarSwarm/1.0`.
- Neo4j Aura Free pauses after inactivity; resume it before a demo.
- `GITHUB_TOKEN` can be empty when the `gh` CLI is authenticated.

---

## Remaining human tasks

1. Record the 5-minute demo using `human-plan.md` (prepare 2–3 finished runs first).
2. Push the public GitHub repo and confirm `.env` is absent.
3. Rewrite `docs/notes.md` in your own words.
4. Run the voice check in Chrome/Edge: allow the mic, speak, confirm the text appears.
5. Optional: rotate the E2B key shared in chat; E2B is not used by this local build.

---

## Known limitations

- Many official pages say “check the faculty/institution”; the UI shows `deadline_text` rather than
  inventing a date. Dated opportunities only are exported to `.ics`.
- Voice recognition is browser-provided; Firefox has no `SpeechRecognition`.
- Replay reads stored events only. A run must be finished or failed before Replay is enabled.
- The final narrative in `docs/notes.md` is intentionally left for the human author.
