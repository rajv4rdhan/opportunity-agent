# HUMAN PLAN v3 — What YOU do for the React UI rebuild

> The coding agent follows `agent-plan.md` v3: replace the NiceGUI UI with a React app that has a strict, symmetric layout and automated layout tests.
> The backend and API keys already work. This file lists only what you must provide, check or approve.

---

## 1. Before the agent starts (about 15 min)

| # | Task | Why | Done? |
|---|---|---|---|
| 1 | Confirm `backend/.env` contains `E2B_API_KEY=...` and all the v1 keys | The agent uploads this file into the E2B sandbox | ☐ |
| 2 | **Log in to the E2B CLI once:** in a terminal in the repo, run `npx @e2b/cli auth login` and finish the browser login | Needed to build the custom **4 GB RAM** sandbox template. The default sandbox (~470 MB) ran out of memory during a real run and during `pip install`. | ☐ |
| 3 | Check your E2B plan allows custom templates and 4 GB / 2 vCPU sandboxes (https://e2b.dev/dashboard) | If it doesn't, tell the agent to use the fallback in `agent-plan.md` §15.1. Real runs then won't work in E2B, only the fixture-based UI tests. | ☐ |
| 4 | Resume the Neo4j Aura instance (https://console.neo4j.io) | Real runs use it | ☐ |
| 5 | Approve about **$0.15** of LLM/API usage for one real Rahul run in Phase 3 | It produces the test fixtures the UI tests replay | ☐ |
| 6 | Use **Chrome or Edge** to review | Voice input needs the browser's speech recognition | ☐ |

Command for step 2:
```bash
npx @e2b/cli auth login
```

---

## 2. How to start the agent

Open `D:\cdownlode\tetra-hackathon\opportunity-agent` in Claude Code and send:

> Read `agent-plan.md` (v3), `human-plan.md` and `STATUS.md`. Implement `agent-plan.md` phase by phase. Run everything only in E2B via `backend/scripts/e2b_run.py`, never locally. After each phase, show me the acceptance results, the E2B URL and the screenshots from `docs/screenshots/`, then commit. Stop and ask me if anything in `human-plan.md` is missing.

---

## 3. What to check after each phase (open the E2B URL the agent prints)

| After phase | Look for |
|---|---|
| 2 | The header logo and nav line up exactly with the page content edges. Light and dark both look clean. |
| 4 (Home) | Everything is centered on one axis. Drop a PDF → a chip appears labelled "Resume". Type text → the hint chips turn green. Click the mic, allow access, speak → the words appear. `Ctrl+Enter` launches. |
| 5 (Live run) | **No overlapping agent cards, no cut-off names, every line touches its cards.** The active agent pulses; the lines between agents animate with small labels ("15 candidates"); verifier chips fill in. The three panels below (Profile, Activity, Sources) are the **same height**, with no big empty area. |
| 6 (Results) | Results come first: summary sentence, 5 match cards with Funding / Deadline / Eligibility / Source boxes, requirement checklist with quotes, Unlock more, Deadlines with calendar export, SOP document. |
| 7 | History → Replay at 20× animates the whole run in under a minute. |
| 8 | Resize the browser from wide to phone width: nothing spills sideways and nothing overlaps. Check dark mode. |
| 9 | The app at `/` is now the React version; reload on a `/runs/...` link still works. |

The agent also runs **automatic layout tests** (no overlaps, equal panel heights, aligned edges, no cut-off text) at 4 screen sizes. Ask it to show you the test summary.

If something still feels off, tell the agent **exactly what and where** (e.g. "the KPI numbers feel too big", "the Apply button should be on the left"). Screenshots help.

---

## 4. Final sign-off checklist

- [ ] Home looks balanced and calm at laptop and phone size.
- [ ] A live run clearly shows agents working together, in parallel, recovering from failures.
- [ ] No overlapping or truncated elements anywhere (also in dark mode).
- [ ] Results are easy to read; sources and quotes can be clicked or hovered.
- [ ] Replay works.
- [ ] Resume-only, text-only and voice-only searches all work.

---

## 5. Submission tasks (only you)

| Item | What you do |
|---|---|
| Screen recording (5 min) | Use the script below. Record with OBS or `Win + Alt + R`. Never show `backend/.env`. |
| GitHub repo | Push, and confirm `git status` doesn't list `.env`. |
| Diagram | Check that `docs/architecture.md` renders on GitHub. |
| Note | Rewrite `docs/notes.md` in your own words. The UI rebuild (layout tests, React Flow canvas) is a good "biggest challenge" story. |

### Demo script (5 minutes)
1. **0:00–0:30:** The problem (Rahul) and one line about ScholarSwarm on the home page.
2. **0:30–1:00:** Drop the resume, click the mic and say your goals, turn on 2 Chaos switches, press **Find scholarships**.
3. **1:00–1:30:** Live: the "What the agents understood" panel, GitHub projects found.
4. **1:30–3:00:** Switch to a **20× replay** of a finished run: hand-off labels, parallel verifier chips, an amber recovery, the Supervisor "re-plan" loop, the Critic "revise" loop.
5. **3:00–4:15:** Results: summary, a match card's requirement checklist (hover a quote, open the source), Deadlines → calendar, Unlock more → what-if.
6. **4:15–4:45:** The SOP document with highlighted `[ADD: …]` spots and the critic notes.
7. **4:45–5:00:** History with 4 different students solved with no code changes.

---

## 6. Live "surprise profile" day

- [ ] 30 minutes before: the agent (or you) runs `up --template scholarswarm-dev`, then `build`, then `serve`; open the URL once.
- [ ] Neo4j resumed; E2B and API credits available.
- [ ] Profile given as text → paste it or speak it into the composer.
- [ ] Slow internet → show a replay while the live run continues.

---

## 7. Security

- All keys live in `backend/.env` (gitignored). The sandbox gets a copy while it runs; the agent runs `down` when finished.
- Test fixtures come from a real run; the agent scrubs email and phone numbers from them before committing.
- The E2B key was pasted in chat earlier. Consider rotating it in the E2B dashboard and updating `backend/.env`.
