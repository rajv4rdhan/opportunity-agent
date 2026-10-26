# HUMAN PLAN v3 — What YOU do for the React UI rebuild

> The coding agent followed `agent-plan.md` v3 and rebuilt the UI in React with automated layout
> tests. **Everything ran locally as requested; E2B is not part of this build.**
> The backend and API keys already work. This file lists only what you must provide, check or approve.

---

## 1. Before you review or demo (about 15 min)

| # | Task | Why | Done? |
|---|---|---|---|
| 1 | Confirm `backend/.env` contains the v1 provider keys and is **not** tracked by git | The backend reads it directly; never commit it | ☐ |
| 2 | Install the backend venv and frontend packages (commands below) | Local development and the production build | ☐ |
| 3 | Resume the Neo4j Aura instance (https://console.neo4j.io) | Real runs use it; the app falls back to memory if unavailable | ☐ |
| 4 | Approve about **$0.15** of LLM/API usage for one real run | It produces a fresh fixture and a realistic demo | ☐ |
| 5 | Use **Chrome or Edge** to review | Voice input needs the browser's speech recognition | ☐ |
| 6 | Keep `frontend/` and `backend/` terminals running | Vite on :5173 and uvicorn on :8000 | ☐ |

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium

cd ../frontend
npm install
```

---

## 2. How to run locally

```bash
# terminal 1 — API
cd backend
.venv/bin/uvicorn app.main:app --reload --port 8000

# terminal 2 — React
cd frontend
npm run dev
```

Open <http://localhost:5173>. For the single-process production build:

```bash
cd frontend && npm run build
cd ../backend && .venv/bin/uvicorn app.main:app --port 8000
```

The production app is at <http://localhost:8000>; deep links such as `/runs/<id>` reload correctly.

---

## 3. What to check

| Area | Look for |
|---|---|
| Home | Everything is centered on one axis. Drop a PDF → a chip appears labelled “Resume”. Type text → the hint chips turn green. Click the mic, allow access, speak → the words appear. `Ctrl+Enter` launches. |
| Live run | **No overlapping agent cards, no cut-off names, every line touches its cards.** The active agent pulses; the lines between agents animate with small labels (“15 candidates”); verifier chips fill in. The three panels below (Profile, Activity, Sources) are the **same height**, with no big empty area. |
| Results | Results come first: summary sentence, 5 match cards with Funding / Deadline / Eligibility / Source boxes, requirement checklist with quotes, Unlock more, Deadlines with calendar export, SOP document. |
| Replay | History → Replay at 20× animates the whole run in under a minute. |
| Responsive | Resize from wide to phone width: nothing spills sideways, nothing overlaps, canvas switches to the timeline below 1024px. Check dark mode. |
| SPA | `/`, `/runs`, `/runs/<id>` and a deep-link reload all render the React app; unknown API paths still return JSON. |

The automated checks are:

```bash
cd backend && .venv/bin/python -m pytest -q       # 70 passed
cd frontend && npm test                           # 26 passed
cd frontend && npx playwright test                # 116 passed, 14 screenshot skips
```

The Playwright suite runs layout invariants at 1440, 1280, 1024 and 390 widths in light mode, plus
1440 dark: no horizontal scroll, aligned containers, equal rows, no overlapping nodes, edges
attached to nodes, readable canvas zoom, no clipped text and 32px mobile tap targets.

If something feels off, tell the agent **exactly what and where** (for example “the KPI numbers feel
too big”, “the Apply button should be on the left”). Screenshots help.

---

## 4. Final sign-off checklist

- [ ] Home looks balanced and calm at laptop and phone size.
- [ ] A live run clearly shows agents working together, in parallel, recovering from failures.
- [ ] No overlapping or truncated elements anywhere (also in dark mode).
- [ ] Results are easy to read; sources and quotes can be clicked or hovered.
- [ ] Replay works.
- [ ] Resume-only, text-only and voice-only searches all work.
- [ ] Print preview shows all result tabs stacked, without navigation or buttons.

---

## 5. Submission tasks (only you)

| Item | What you do |
|---|---|
| Screen recording (5 min) | Use the script below. Record with OBS or `Win + Alt + R`. Never show `backend/.env`. |
| GitHub repo | Push, and confirm `git status` doesn't list `.env`. |
| Diagram | Check that `docs/architecture.md` renders on GitHub. |
| Note | Rewrite `docs/notes.md` in your own words. The React Flow canvas and layout invariants are a good “biggest challenge” story. |

### Demo script (5 minutes)
1. **0:00–0:30:** The problem (Rahul) and one line about ScholarSwarm on the home page.
2. **0:30–1:00:** Drop the resume, click the mic and say your goals, turn on 2 Chaos switches, press **Find scholarships**.
3. **1:00–1:30:** Live: the “What the agents understood” panel, GitHub projects found.
4. **1:30–3:00:** Switch to a **20× replay** of a finished run: hand-off labels, parallel verifier chips, an amber recovery, the Supervisor “re-plan” loop, the Critic “revise” loop.
5. **3:00–4:15:** Results: summary, a match card's requirement checklist (hover a quote, open the source), Deadlines → calendar, Unlock more → what-if.
6. **4:15–4:45:** The SOP document with highlighted `[ADD: …]` spots and the critic notes.
7. **4:45–5:00:** History with 4 different students solved with no code changes.

---

## 6. Live “surprise profile” day

- [ ] 30 minutes before: start both local servers and open the app once.
- [ ] Neo4j resumed; API credits available.
- [ ] Profile given as text → paste it or speak it into the composer.
- [ ] Slow internet → show a replay while the live run continues.

---

## 7. Security

- All keys live in `backend/.env` (gitignored). Nothing is uploaded to a sandbox.
- Test fixtures come from a real run; email and phone numbers are scrubbed before committing.
- The E2B key was pasted in chat earlier. E2B is not used by this build; consider rotating the key in
  the E2B dashboard and removing it from `backend/.env`.
