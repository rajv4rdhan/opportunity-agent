# HUMAN PLAN v2 — What YOU do for the UI redesign

> The coding agent follows `agent-plan.md` (v2: visual swarm UI, resume/text/voice intake, replay).
> The backend and all API keys from v1 are already set up and working (see `STATUS.md`).
> This file lists only what **you** must provide, check, or do.

---

## 1. Before the agent starts (about 10 min)

| # | Task | Done? |
|---|---|---|
| 1 | **E2B key is in the repo-root `.env`.** It's already added as `E2B_API_KEY=...` in `opportunity-agent/.env`, which is gitignored. Don't paste it anywhere else. | ☐ |
| 2 | **The repo-root `.env` has every working key** from v1 (LLM, Tavily, Exa, Firecrawl, Kernel, Neo4j, …). The E2B runner copies this file into the sandbox as `backend/.env`. | ☐ |
| 3 | **E2B account has credit.** Open https://e2b.dev/dashboard and confirm the plan, usage and sandbox limits. A sandbox stays alive up to 60 min per `up`. | ☐ |
| 4 | **Neo4j Aura instance is running.** Free instances pause after inactivity; resume it in https://console.neo4j.io. | ☐ |
| 5 | **Use Chrome or Edge** for testing. Voice input uses the browser's built-in speech recognition, which Firefox doesn't support. | ☐ |
| 6 | Optional: **rotate the E2B key** later if you think it was exposed (it was shared in chat). Generate a new one in the E2B dashboard and replace the line in `.env`. | ☐ |

Nothing runs on your computer except the small `e2b_run.py` client. Tests and the app run in the E2B cloud sandbox.

---

## 2. How to start the agent

Open `D:\cdownlode\tetra-hackathon\opportunity-agent` in Claude Code and send:

> Read `agent-plan.md`, `human-plan.md` and `STATUS.md`. Implement `agent-plan.md` phase by phase. Run every test and the app only in E2B using `backend/scripts/e2b_run.py`; never run them locally. After each phase, show me the acceptance result (and the E2B URL when the UI changed), then commit. Stop and ask me if anything in `human-plan.md` is missing.

---

## 3. Decisions (defaults already chosen; change any you disagree with)

| Decision | Default | Your choice |
|---|---|---|
| Accent color | Indigo `#4F46E5` | ______ |
| Default voice language | English (India) `en-IN`; also English (US) and Hindi | ______ |
| Headline on home page | "Find funding you actually qualify for." | ______ |
| Show Demo controls (samples + Chaos Mode) on the home page | Yes, collapsed | ______ |
| Default replay speed in the demo | 20× | ______ |

---

## 4. Checkpoints: you check these on the E2B URL

The agent prints a public `https://…e2b…` URL after `serve`. Open it in Chrome.

| After phase | What you check |
|---|---|
| 1 | Pages look calm and professional: thin white header, Inter font, no heavy colors. Toggle dark mode. |
| 3 | **Intake:** (a) drop your resume, and it's labelled "Resume" automatically; (b) type a few sentences and watch the hint chips light up; (c) click the mic, **allow microphone access**, speak, and the text appears; (d) press `Ctrl+Enter` to launch. |
| 5 | **Mission control:** you can tell at a glance which agent is working, what it's thinking, which agent handed what to whom, and the verifier chips filling in. Try Chaos Mode and watch the amber recoveries. |
| 5 | **Clarifier:** launch with a description that doesn't mention countries. The "needs one detail" card appears; answer by voice. |
| 6 | **Results:** click a source quote to confirm it's real; download the `.ics` and import it into Google Calendar; open Print preview (results only). |
| 7 | **Replay:** History → Replay on a finished run at 20×. The whole run animates in under a minute. |
| 8 | Phone check: open the URL on your phone (single-column layout, mic works in Chrome Android). |

Tell the agent plainly what feels cluttered, slow or confusing. Visual polish is iterative.

---

## 5. Final acceptance checklist (you sign off)

- [ ] Resume only → results.
- [ ] Typed text only (no files) → results that make sense.
- [ ] Voice only → results that make sense.
- [ ] Resume + spoken goals → the goals from speech win (e.g. the countries you said).
- [ ] The swarm canvas clearly shows agents working together, in parallel, and recovering from failures.
- [ ] Results: top 5 with requirement checklist and quotes, deadlines + calendar, SOP, gaps/what-if.
- [ ] Replay works.
- [ ] Looks good in light, dark and on a phone.

---

## 6. Submission tasks (only you can do these)

| Item | What you do |
|---|---|
| **Screen recording (5 min)** | Use the script below. Record with OBS or Windows `Win + Alt + R`. Hide `.env` and any terminal that shows keys. |
| **GitHub repo** | Push the repo; confirm with `git status` that `.env` is not included. |
| **Diagram** | Check that `docs/architecture.md` renders on GitHub. |
| **Note** | Rewrite `docs/notes.md` in your own words (interesting experiment + biggest challenge). The voice-intake and hand-off visualization work are good material. |

### Demo script v2 (5 minutes)
1. **0:00–0:30:** Rahul's problem, and one line on what ScholarSwarm is. Show the home page: "drop a resume, type, or just talk."
2. **0:30–1:00:** Drop Rahul's resume, click the mic and **say** "I want a fully funded master's in AI in Germany or Canada, my budget is low." Turn on two Chaos switches. Press **Find scholarships**.
3. **1:00–1:30:** The live run: the "What the agents understood" card, then GitHub hidden projects.
4. **1:30–3:00:** Switch to a **20× replay** of a finished run (prepared earlier), so the whole swarm plays out: the Planner's strategy → the Scout's hand-off label → **parallel verifier chips** → an amber recovery → the **Supervisor re-planning** loop → Matcher and knowledge graph → Ranker → SOP ⇄ Critic loop.
5. **3:00–4:15:** Results: the summary sentence, a top match with the **requirement checklist and quote tooltips**, click one source to prove it's real, the deadlines → Add to calendar, Unlock more (what-if: raise IELTS → new matches).
6. **4:15–4:45:** The SOP document with highlighted `[ADD: …]` placeholders and the critic notes.
7. **4:45–5:00:** History shows 4 different student profiles (Rahul, Priya, Arjun, Meera) solved with no code changes.

Tip: prepare 2–3 finished runs the day before so replay and history look full.

---

## 7. Live "surprise profile" day

- [ ] Run `python backend/scripts/e2b_run.py up` and then `serve` **30 min before**, and open the URL once to warm it up.
- [ ] Neo4j Aura is resumed; API and E2B credits remain.
- [ ] If they hand you a profile as text, **paste or speak it into the composer**. No form-filling needed.
- [ ] If the internet is slow, show a **replay** of a previous run while the live run continues.
- [ ] Backup: phone hotspot and charger.

---

## 8. Security reminders

- `.env` (repo root) holds all keys, including E2B. It's gitignored; never commit it or show it on screen.
- The sandbox gets a copy of `.env` while it runs. The agent runs `e2b_run.py down` when done, and the sandbox also auto-expires.
- If any key leaks, revoke it in that provider's dashboard and replace it in `.env`.
