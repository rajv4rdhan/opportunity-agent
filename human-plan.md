# HUMAN PLAN — What YOU must provide so the agent can build ScholarSwarm

> The AI coding agent follows `agent-plan.md`. It **cannot** create accounts, get API keys, record your video, or make personal decisions.
> This file lists everything only you can do, in order. Do sections 1–4 **before** telling the agent to start.
> Estimated time: about 60–90 minutes.

---

## 1. Install software (about 15 min)

| Software | Version | Check in PowerShell | Get it |
|---|---|---|---|
| Python | 3.11 or 3.12 | `python --version` | https://www.python.org/downloads/ (tick **"Add python.exe to PATH"**) |
| Git | any recent | `git --version` | https://git-scm.com/download/win |
| VS Code (optional) | – | – | https://code.visualstudio.com |

The whole project is Python: the website is built with NiceGUI, so **Node.js is not needed**.

PowerShell may block the venv activation script. Allow scripts for your user once:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

---

## 2. Create accounts and get API keys (about 45 min)

Copy each key somewhere safe as you get it. **Never paste keys into chat or commit them to GitHub.** They go only into `backend/.env` (section 3).

### 2.1 Required

| # | Service | What it's for | Where to get the key | `.env` variable |
|---|---|---|---|---|
| 1 | **LLM provider**: pick ONE (see 2.3) | Agent brains | Anthropic: https://console.anthropic.com · OpenAI: https://platform.openai.com/api-keys · Google Gemini: https://aistudio.google.com/apikey | `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` or `GEMINI_API_KEY` |
| 2 | **Tavily** | Main web search | https://app.tavily.com → API Keys (free monthly credits) | `TAVILY_API_KEY` |
| 3 | **Kernel** | Cloud browser plus the live browser view in the UI | https://www.onkernel.com → dashboard → API keys | `KERNEL_API_KEY` |
| 4 | **GitHub token** | Reading GitHub profiles (avoids the 60-requests/hour limit) | https://github.com/settings/personal-access-tokens → **Fine-grained token** → Repository access: **Public repositories (read-only)** → no extra permissions → Generate | `GITHUB_TOKEN` |
| 5 | **Neo4j AuraDB Free** | Knowledge graph | https://console.neo4j.io → New Instance → **AuraDB Free** → **download the credentials .txt file; the password is shown ONLY ONCE**. Wait until the status is "Running". | `NEO4J_URI` (starts with `neo4j+s://`), `NEO4J_USERNAME`, `NEO4J_PASSWORD` |

### 2.2 Recommended

These make the fallbacks and the demo much stronger.

| # | Service | What it's for | Where | `.env` variable |
|---|---|---|---|---|
| 6 | **Exa** | Second search provider (fallback, finds official pages well) | https://dashboard.exa.ai → API Keys | `EXA_API_KEY` |
| 7 | **Firecrawl** | Clean page extraction (fetch fallback #2) | https://www.firecrawl.dev → dashboard → API key | `FIRECRAWL_API_KEY` |
| 8 | **Jina Reader** | Page to markdown (fetch #1; works without a key, but a key raises the rate limit) | https://jina.ai/reader → get API key | `JINA_API_KEY` |
| 9 | **Langfuse** | Tracing dashboard of every LLM call (great to show judges) | https://cloud.langfuse.com → create project → Settings → API Keys | `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_HOST` (e.g. `https://cloud.langfuse.com`) |

### 2.3 Optional

| # | Service | What it's for | Where | `.env` variable |
|---|---|---|---|---|
| 10 | **Serper** | Third search fallback (Google results) | https://serper.dev → API key | `SERPER_API_KEY` |
| 11 | **Second LLM provider** | Model fallback if the main one fails | same as #1 | the other provider's key, plus `MODEL_FALLBACK` |

### 2.4 Choosing the LLM (decide one)

The code uses LiteLLM, so you can switch providers just by editing `.env`. Set two models: a **smart** one (planning, SOP, ranking) and a **fast/cheap** one (extraction).

| Provider | `MODEL_SMART` | `MODEL_FAST` |
|---|---|---|
| Anthropic (default in plan) | `anthropic/claude-sonnet-5-5` | `anthropic/claude-haiku-5-5` |
| OpenAI | `openai/<current flagship model>` | `openai/<current mini model>` |
| Gemini | `gemini/<current pro model>` | `gemini/<current flash model>` |

For OpenAI or Gemini, check the provider's model list page for the exact current model names and put them after the prefix.

**Set a spending limit** in your LLM provider's billing settings (for example US$10–20) so a bug can't run up a big bill. One full run makes about 40–80 LLM calls.

---

## 3. Create `backend/.env`

After the agent finishes **Phase 1** (it creates `backend/.env.example`), copy it:

```powershell
Copy-Item backend\.env.example backend\.env
```

Then open `backend/.env` and fill it in. Template:

```dotenv
# ---------- LLM (fill the provider you chose) ----------
MODEL_SMART=anthropic/claude-sonnet-5-5
MODEL_FAST=anthropic/claude-haiku-5-5
MODEL_FALLBACK=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GEMINI_API_KEY=

# ---------- Search ----------
TAVILY_API_KEY=
EXA_API_KEY=
SERPER_API_KEY=

# ---------- Page fetching / browser ----------
JINA_API_KEY=
FIRECRAWL_API_KEY=
KERNEL_API_KEY=

# ---------- Profile enrichment ----------
GITHUB_TOKEN=

# ---------- Knowledge graph ----------
NEO4J_URI=neo4j+s://xxxxxxxx.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=

# ---------- Tracing (optional) ----------
LANGFUSE_PUBLIC_KEY=
LANGFUSE_SECRET_KEY=
LANGFUSE_HOST=https://cloud.langfuse.com

# ---------- App ----------
STORAGE_SECRET=type-any-long-random-text-here
```

Alternatively, you can create `backend/.env` yourself before the agent starts, using the template above.

---

## 4. Provide the student inputs

Put these in `backend/samples/rahul/` (create the folder if needed):

| File | What | If you don't have it |
|---|---|---|
| `resume.pdf` | Rahul's resume (a fictional one is fine), or **your own** resume to make the demo personal | The agent generates a fictional one with `scripts/make_sample_pdfs.py` |
| `transcript.pdf` | Marksheet or transcript | Agent generates a fictional one |
| `form.json` | GitHub URL, LinkedIn URL, target countries, degree, budget | Agent creates it; **you must give the GitHub URL** |

**Tell the agent these values** (or write them into `form.json`):
- GitHub profile URL to use for the demo, e.g. `https://github.com/<your-username>`. Use a real public profile with some projects, because GitHub enrichment is a big part of the score. It can be your own.
- LinkedIn or portfolio URL (optional).
- Target countries (e.g. Canada, Germany, Singapore), target degree (e.g. MS), field (e.g. Computer Science / AI), budget per year in INR.

⚠️ Use only data you're comfortable sending to the LLM and search providers. Don't upload real documents with ID numbers, addresses or phone numbers you don't want shared. Blank those out.

---

## 5. Decisions you make

The plan already has defaults. Change one only if you disagree.

| Decision | Default in plan | Change? |
|---|---|---|
| LLM provider | Anthropic (Claude) | ______ |
| App name | ScholarSwarm | ______ |
| Minimum verified opportunities before stopping | 10 | ______ |
| Max research rounds | 3 | ______ |
| Run time limit | 15 min | ______ |
| Use your own resume or the fictional Rahul? | Fictional Rahul | ______ |

---

## 6. How to start the agent

Open the project folder `D:\cdownlode\tetra-hackathon` in Claude Code (or your coding agent) and send:

> Read `agent-plan.md` and `human-plan.md` fully. Build the project phase by phase exactly as described in `agent-plan.md`. After each phase, run its acceptance check, show me the result, and commit. If anything from `human-plan.md` is missing, stop and ask me.

---

## 7. Checkpoints: you verify these during the build

| After phase | What you check | How |
|---|---|---|
| 1 | App starts | Open http://localhost:8000 (placeholder page) and http://localhost:8000/api/health |
| 3 | **All keys work** | The agent runs `python scripts/check_keys.py`; every required line is ✅. If one is ❌, fix that key in `.env` |
| 5 | Full run works in the terminal | Read the printed top 5. **Click 3–4 source URLs yourself** and confirm the deadline and funding are really on the page |
| 7 | Website works | Open http://localhost:8000, load the Rahul sample, click **Launch Agents**, and watch it finish |
| 8 | Adaptability | Run the **priya / arjun / meera** samples. Results must make sense for each (e.g. Arjun gets MBA options, not CS) |
| 8 | Failure handling | Turn on each Chaos switch and confirm amber "fallback" events appear and the run still finishes |

### Running the app yourself (1 terminal)

The UI and the API run in one Python process:

```powershell
cd D:\cdownlode\tetra-hackathon\backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

Then open http://localhost:8000 for the website, or http://localhost:8000/docs for the API.

---

## 8. Things only you can do for submission

| Item | What you do | Agent help available |
|---|---|---|
| **GitHub repository** | Create an empty repo on github.com (public), then run the push commands GitHub shows. Make sure `.env` is **not** in the repo | Agent can prepare `.gitignore`, README and commits; it should not push without your OK |
| **Working demo** | Run locally (section 7). Optional: deploy the single Python app to Railway or Render, where you create the account and add the env vars in their dashboard | Agent can write deploy configs |
| **5-minute screen recording** | Record with OBS Studio, or Windows `Win + Alt + R` (Xbox Game Bar), or Loom | Script below |
| **Diagram** | Check that `docs/architecture.md` renders on GitHub (mermaid). Optionally screenshot it | Agent generates it |
| **Short note** (most interesting experiment, biggest challenge) | Agent drafts `docs/notes.md`; **you rewrite it in your own words and experience** | Draft |

### Suggested 5-minute demo script
1. **0:00–0:30**: The problem (Rahul) and what ScholarSwarm does in one sentence. Show the architecture diagram.
2. **0:30–1:00**: Upload the resume and transcript, enter GitHub, turn **Chaos Mode** on (search primary down + fetch timeout), click **Launch Agents**.
3. **1:00–2:45**: Narrate live: the Profile Analyst extracts, the GitHub Enricher finds "hidden projects", the Planner's strategy, the Scout finds candidates, **parallel Verifiers** with the **live browser** view, an amber fallback recovering, the knowledge graph growing, and the Supervisor deciding to re-plan.
4. **2:45–4:00**: Results: top 5 cards (why it fits, graph path, deadline, funding, sources). Click a source to prove it's real. Show the gaps and the what-if slider (raise IELTS → new scholarships unlock).
5. **4:00–4:40**: The SOP draft and the critic's notes and revisions.
6. **4:40–5:00**: Run a **different sample profile** to show adaptability, and briefly show the Langfuse trace.

Tip: do one full run before recording, so the cache and knowledge graph make the recorded run faster and smoother.

---

## 9. Live "surprise profile" day checklist

- [ ] The app starts from a fresh terminal (practice this).
- [ ] API credits remain on the LLM, Tavily, Kernel and Firecrawl accounts.
- [ ] The Neo4j AuraDB Free instance is **running**. Free instances pause after inactivity, so open the console and resume it the day before.
- [ ] Laptop charger, stable internet, and a phone hotspot as backup.
- [ ] Know how to fill the form manually if they give you a profile as text instead of a PDF.
- [ ] Have a previous finished run open in another tab as a backup if the internet fails.

---

## 10. Security reminders

- `.env` must never be committed. Check with `git status` before every push.
- If a key leaks (pushed to GitHub, shown in the video), **revoke it immediately** in that provider's dashboard and create a new one.
- Blur or hide the `.env` file and terminal output that shows keys while recording.
