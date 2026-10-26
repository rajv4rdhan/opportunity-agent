# AGENT PLAN v2 — ScholarSwarm: visual swarm UI + effortless intake

> **Audience:** the AI coding agent that implements this. Read the whole file before touching code.
> **Human tasks** (keys, checks, demo) are in `human-plan.md`.
> **Starting point:** the backend swarm is **done and working** (see `STATUS.md`): 11 LangGraph agents, Neo4j knowledge graph, fallbacks, chaos mode, 54 passing tests, NiceGUI UI v1. **Do not rewrite the backend.** This plan replaces the UI and adds text/voice intake, plus a few improvements, with small, targeted backend changes.

---

## 0. Hard rules

1. **Never run the app or tests on the local machine.** All execution (pytest, uvicorn, pip install, smoke runs) happens in an **E2B sandbox** via `backend/scripts/e2b_run.py` (§10). The only local command allowed is `python backend/scripts/e2b_run.py …`, which is a thin client that uploads the repo and runs commands remotely.
2. **Don't break what works.** After every phase, the full test suite must pass in E2B. Existing tests can change only when a behavior intentionally changes; say so in the commit message.
3. **DRY, same as v1.** The existing single-source modules still own their concerns (`core/llm.py`, `core/http.py`, `core/fallback.py`, `core/events.py`, `core/agent.py`, `services/runner.py`, `ui/agents.py`, `ui/theme.py`, `ui/components/badges.py`). New single sources added by this plan:
   | Concern | Only place |
   |---|---|
   | Design tokens (colors, radius, spacing, fonts, motion) | `backend/app/ui/static/theme.css` (CSS variables) |
   | Browser speech-to-text | `backend/app/ui/static/voice.js` + `backend/app/ui/components/voice_input.py` |
   | Intake text helpers (coverage hints, document classification) | `backend/app/services/intake.py` |
   | Phase grouping, hand-off labels, worker states | `backend/app/ui/agents.py` + `backend/app/ui/live_state.py` |
   | Event replay timing | `backend/app/services/replay.py` |
   | Calendar export | `backend/app/services/calendar.py` |
4. **Python first.** The only non-Python files allowed are `ui/static/theme.css` and `ui/static/voice.js` (≤ 60 lines; the Web Speech API exists only in the browser). Python talks to the browser with `ui.run_javascript(...)`, and the browser talks back with NiceGUI's `emitEvent(name, payload)` → `ui.on(name, handler)`.
5. **Professional and minimal:** neutral palette, one accent color, no gradients, no emoji in the UI chrome, no drop-shadow stacks, generous whitespace, and a consistent 8-px spacing grid. When in doubt, remove it.
6. **Never hardcode a student.** Sample chips load `backend/samples/*`, and everything else comes from user input.
7. **Secrets:** never print or commit keys. The repo-root `.env` (gitignored) holds every key, including `E2B_API_KEY`. The E2B runner uploads it into the sandbox as `backend/.env`, which is where `config.py` reads it.
8. Commit after each phase with `ui: …`, `intake: …`, `test: …` style messages, ending with the attribution line the session requires.

---

## 1. What the user experiences (target)

**Screen 1 — Intake (`/`)**: one calm screen with one "composer" box, like a modern chat input.
- The user can do any of the following:
  - **drop a resume** (and optionally a transcript),
  - **type** a description of themselves and their goals,
  - **press the mic and speak** (the browser's speech recognition fills the text box live),
  - or combine them, e.g. upload a resume plus say "I want a funded MS in AI in Germany or Canada, low budget".
- Small hint chips under the box light up as the text covers the key facts (degree, grades, goals, countries, budget, tests), so users know what's useful without filling out a form.
- One primary button: **Find scholarships →** (also `Ctrl+Enter`).
- Optional "Add details" disclosure (links and preferences) and a "Demo controls" disclosure (samples + Chaos Mode). Both are collapsed by default.

**Screen 2 — Mission control (`/runs/{id}`)**: the swarm is visibly working.
- **Swarm canvas:** the 11 agents laid out as a flow, grouped into five phases. The active agent glows with a pulsing ring. Each node shows a one-line live "thought" (its latest message). When one agent hands off to the next, the connecting edge animates (flowing dashes) and shows a label like "15 candidates".
- The Verify stage expands into a **worker pool**: one small chip per parallel verifier, labelled with the website domain. Each chip moves through the stages queued → fetching → reading → verified ✓ / rejected ✗. A fallback flashes it amber.
- **Phase bar** at the top: Understand → Plan → Research → Verify → Decide → Write, with elapsed time, ETA and counters.
- **"What the agents understood" card**: the parsed profile appears as soon as the Profile Analyst finishes, including GitHub "hidden projects" once enrichment is done.
- **Inline "needs your input" card** with voice support, instead of a modal popup, when the Clarifier pauses the run.
- Side panel tabs: Activity (important events by default), Sources, Knowledge graph, Live browser.
- When the run finishes, the canvas collapses to a one-line summary and the **results** take focus.

**Results**: a summary sentence, then top-5 match cards (key facts, why-you, requirement checklist with source quotes, how to apply), all opportunities, "Unlock more" gaps with what-if, the SOP document, deadlines with **Add to calendar (.ics)**, plus Print / Download.

**Replay**: any finished run can be replayed at 1×/5×/20× speed (`/runs/{id}?replay=1`), with the canvas re-animating from the stored events. This is essential for the demo video and the live judging slot, because real runs take about 10 minutes.

---

## 2. Design system — `backend/app/ui/static/theme.css`

Load once in `ui/theme.py` via `ui.add_head_html` (Google Fonts **Inter** 400/500/600, plus the stylesheet link) and `app.add_static_files("/static", <ui/static dir>)` in `main.py`.

**Tokens (CSS variables on `:root`, dark overrides on `body.body--dark`, Quasar's dark class):**
| Token | Light | Dark |
|---|---|---|
| `--bg` | `#FAFAFA` | `#0B0B0C` |
| `--surface` | `#FFFFFF` | `#141416` |
| `--border` | `#E4E4E7` | `#27272A` |
| `--text` | `#18181B` | `#F4F4F5` |
| `--muted` | `#71717A` | `#A1A1AA` |
| `--accent` | `#4F46E5` | `#818CF8` |
| `--accent-soft` | `#EEF2FF` | `#1E1B4B` |
| `--ok` | `#059669` | `#34D399` |
| `--warn` | `#D97706` | `#FBBF24` |
| `--err` | `#DC2626` | `#F87171` |
| `--idle` | `#D4D4D8` | `#3F3F46` |
| `--radius` | `12px` | |
| `--radius-sm` | `8px` | |
| `--ease` | `cubic-bezier(.2,.8,.2,1)` | |

**Type scale:** 12 / 14 (body) / 16 / 20 / 28 / 36 px, with weights 400/500/600 only, and `font-feature-settings: "tnum"` for counters.

**Reusable classes (the only place visual styling lives):**
- `.ss-card`: surface, 1px border, radius, 24px padding, no shadow.
- `.ss-pill`: status pill (dot + text). Modifiers `.is-running .is-done .is-failed .is-waiting .is-idle .is-skipped` map to tokens.
- `.ss-node`: swarm node card (200×64), `.is-running` adds an accent ring with a `pulse` keyframe (2s), `.is-done` adds a check, `.is-failed` adds an error border.
- `.ss-edge` (SVG path): `--idle` stroke. `.is-active` adds the accent stroke plus `stroke-dasharray: 6 6` and a `dash-flow` keyframe (1s linear infinite). `.is-loop` is dashed and curved.
- `.ss-worker`: 28px-tall chip with a state dot; `.is-fetching .is-reading .is-verified .is-rejected .is-fallback`.
- `.ss-composer`: large rounded box; `:focus-within` shows the accent border.
- `.ss-hint` chip, plus `.is-covered` (ok color and a check icon).
- `.ss-mic`: round button; `.is-listening` adds a red dot and a soft pulse.
- `@media (prefers-reduced-motion: reduce)` disables every animation.
- `@media print`: hide header, nav, canvas and buttons; show the results only.

**Rules:** Quasar components get `flat`/`unelevated`/`outline` props, never default shadows. Icons are Material Symbols Rounded (`sym_r_*` names) only. Status is always shown as color **plus** icon/text, never color alone.

`ui/theme.py` `frame()` v2: a thin white top bar (56px, bottom border) with the wordmark "ScholarSwarm" (600 weight, accent dot) on the left and "New search · History · theme toggle" on the right. The content column is `max-w-[1200px] mx-auto px-6 py-8`. The colored indigo header from v1 is removed.

---

## 3. Backend changes (small, targeted)

### 3.1 `models/inputs.py` — `RunForm`
Add:
- `description: str | None = None`: free text from typing or speech (max 5,000 chars; trim).
- `input_modes: list[Literal["resume", "text", "voice"]] = []`: analytics/UI only.

### 3.2 `services/runner.create_run` — accept "no resume"
Today a run needs a resume or a sample. New rule: **resume OR transcript OR description with ≥ 20 words OR sample**. Otherwise raise `ValueError("Add a resume or describe yourself in a few sentences.")`. The API (`api/runs.py`) gains a `description` form field and uses the same function.

### 3.3 `services/intake.py` (new, pure functions, unit-tested)
- `classify_document(text: str) -> Literal["resume", "transcript"]`: counts transcript signals (`semester`, `sgpa`, `cgpa`, `grade`, `credits`, `marks`, `course code`) against resume signals (`experience`, `projects`, `skills`, `education`, `@`, `github.com`). The higher count wins, and a tie goes to resume.
- `COVERAGE` dictionary of hint → regex list, e.g.:
  - `degree`: B.Tech, B.Sc, B.Com, BE, bachelor, master, final year
  - `grades`: `\b\d(\.\d{1,2})?\s*(cgpa|gpa)\b`, `\b\d{2}(\.\d)?\s*%`
  - `goal`: MS, M.Sc, MBA, PhD, master's, masters
  - `countries`: names from a list in `intake.py`, plus "abroad" and "Europe"
  - `budget`: lakh, ₹, INR, budget, afford, fully funded
  - `tests`: IELTS, TOEFL, GRE, GMAT, PTE, Duolingo
  - `projects`: project, built, GitHub, github.com
- `coverage(text: str) -> dict[str, bool]`, used by the composer hints.
- `word_count(text) -> int`.

### 3.4 Profile Analyst + prompt — use the description
- `agents/profile_analyst.py`: pass `description=form.get("description") or "(not provided)"` to the prompt. If **no documents** were provided, log "Building profile from your description" so it's visible on the canvas.
- When the user uploads two files, the UI and API call `classify_document` on extracted text to decide which is the resume and which the transcript, so the user never has to label them. The classification happens in `create_run`, using `tools/pdf.extract_text`, which is synchronous and cheap.
- `prompts/profile_extract.md`: add a `## Self-description` input block with these rules: "The self-description states the student's goals and preferences; it overrides the resume for targets (countries, degree, fields, budget). Facts like grades come from documents first; use the description only when documents lack them. Spoken text may contain transcription errors (e.g. 'see GPA' = CGPA, 'eye-elts' = IELTS); interpret sensibly but never invent numbers."
- `merge_form` priority stays the same: **explicit form fields > LLM extraction** (which already combines documents and description).

### 3.5 Worker identity for parallel verifiers (needed for the worker pool)
- `core/agent.py` `AgentCtx`: add `worker: str | None = None`. `log`/`decide` and every `emit` made with this ctx include `worker` in `data` when it's set. Implement it once, inside `AgentCtx` or a small `ctx.emit()` helper, and have `fallback.py` and `pdf.py` use `ctx`'s helper instead of calling `emit` directly, so the worker key propagates.
- The `@agent` decorator: when `state` has a `candidate` (the `VerifyInput` fan-out), set `ctx.worker = normalize_url(candidate.url)` and add `worker`, `title` and `domain` to the `agent_started`, `agent_finished` and `agent_failed` data.
- The `@agent` decorator `agent_finished` data: add `counts = {key: len(value) for key, value in result.items() if isinstance(value, list)}`. Hand-off labels come from this.
- Verifier: the final event (`opportunity_verified` / `opportunity_rejected`) carries `worker`.

### 3.6 `services/replay.py` (new)
- `async def replay_events(run_id, speed: float) -> AsyncIterator[Event]`: loads all events in order, sleeps `min((next.ts - prev.ts)/speed, 1.5s)` between them (gaps are capped so idle waits don't stall the demo), and yields each one. A pure helper `replay_delays(timestamps, speed, cap) -> list[float]` is unit-tested.

### 3.7 `services/calendar.py` (new)
- `deadlines_ics(report: FinalReport) -> str`: an RFC 5545 VCALENDAR with one all-day VEVENT per opportunity that has a `deadline`. SUMMARY is "Deadline: {name}", DESCRIPTION holds the official URL, and a VALARM fires 7 days before. CRLF line endings, stable UID `{run_id}-{opp.id}@scholarswarm`. Build the string by hand; no new dependency.
- `api/runs.py`: add `GET /api/runs/{id}/deadlines.ics`.

### 3.8 ETA (small)
- `core/store.py`: `median_duration_sec(limit=20) -> float | None` over finished runs (`report_json.stats.duration_sec`). The UI shows "about N min" before the first event and the remaining estimate after.

---

## 4. UI file layout (after this plan)

```
backend/app/ui/
├─ __init__.py                # register_pages()
├─ theme.py                   # frame() v2, loads fonts + theme.css + voice.js
├─ agents.py                  # AGENTS, EDGES, PHASES, HANDOFF_LABELS, EVENT_STYLE, IMPORTANT_EVENTS
├─ live_state.py              # RunView v2 + reduce_event v2 (pure)
├─ static/
│  ├─ theme.css
│  └─ voice.js
├─ components/
│  ├─ badges.py               # restyled to .ss-pill; same function names
│  ├─ composer.py             # NEW: text + files + mic + hints + submit
│  ├─ voice_input.py          # NEW: mic button bound to any textarea (DRY: composer + clarifier)
│  ├─ advanced_options.py     # NEW: links/preferences + demo controls (samples, chaos) — replaces upload_form.py & chaos_panel.py
│  ├─ phase_bar.py            # NEW
│  ├─ swarm_canvas.py         # NEW: replaces agent_flow.py
│  ├─ worker_pool.py          # NEW
│  ├─ profile_card.py         # NEW
│  ├─ input_request.py        # NEW: inline clarifier card (replaces interrupt_dialog.py)
│  ├─ activity.py             # replaces event_feed.py
│  ├─ sources_panel.py        # NEW: candidates + verification status
│  ├─ knowledge_graph.py      # restyle only
│  ├─ live_browser.py         # restyle only
│  ├─ run_summary.py          # replaces run_stats.py: counters + collapsed "swarm finished" line
│  └─ results/
│     ├─ summary.py           # NEW: one-sentence result summary
│     ├─ top_matches.py       # redesign
│     ├─ requirement_list.py  # NEW: ✓/✗/? checklist with quotes
│     ├─ opportunity_table.py # restyle
│     ├─ gaps_whatif.py       # restyle ("Unlock more")
│     ├─ deadlines.py         # NEW: sorted list + .ics
│     └─ sop_viewer.py        # redesign (document view)
└─ pages/
   ├─ home.py                 # rewritten around composer
   ├─ run_detail.py           # rewritten: mission control + results + replay
   └─ runs.py                 # restyle
```

Delete `upload_form.py`, `chaos_panel.py`, `agent_flow.py`, `interrupt_dialog.py`, `event_feed.py` and `run_stats.py` **after** their replacements work. Move any logic they own, such as `UploadForm.save_attachments` or sample loading, into the new components; don't copy it.

---

## 5. Agent metadata — `ui/agents.py` v2

- `PHASES` (ordered): `understand` (profile_analyst, clarifier, github_enricher), `plan` (planner, supervisor), `research` (scout), `verify` (verifier), `decide` (matcher, ranker), `write` (sop_writer, critic, finalizer). Labels: Understand, Plan, Research, Verify, Decide, Write.
- `AGENTS` gets new fields per agent:
  - `phase`
  - `role`: one plain-English line shown under the name, e.g. Scout: "Searches the web for programs"; Verifier: "Reads official pages and checks rules"; Critic: "Fact-checks the SOP".
  - canvas position `col`/`row` on a 6-column × 3-row grid instead of pixel x/y.

  Layout:
  | Agent | Column | Row |
  |---|---|---|
  | profile_analyst | 0 | 1 |
  | clarifier | 0 | 0 |
  | github_enricher | 0 | 2 |
  | planner | 1 | 1 |
  | supervisor | 1 | 2 |
  | scout | 2 | 1 |
  | verifier | 3 | 0–2 (spans all rows; holds the worker pool) |
  | matcher | 4 | 1 |
  | ranker | 4 | 2 |
  | sop_writer | 5 | 0 |
  | critic | 5 | 1 |
  | finalizer | 5 | 2 |
- `EDGES` unchanged (`supervisor→planner` and `critic→sop_writer` are loops).
- `HANDOFF_LABELS`: maps a state key to a template: `plan` → "{n} search queries", `candidates`/`pending_verify` → "{n} candidates", `opportunities` → "{n} opportunities", `rejected` → "{n} rejected", `gaps` → "{n} gaps", `top5` → "top {n}", `critic_notes` → "{n} notes". `profile` and `github` (non-list) → "profile" / "GitHub insights".
- `IMPORTANT_EVENTS = {decision, fallback, retry, chaos_injected, interrupt, resumed, opportunity_verified, agent_failed, tool_error, run_started, run_finished, run_failed, agent_skipped}`.
- `EVENT_STYLE` keeps the same mapping, switched to `sym_r_*` icons and token color names (`accent`, `ok`, `warn`, `err`, `muted`).

---

## 6. Live state — `ui/live_state.py` v2 (pure, unit-tested)

`RunView` adds:
- `phase: str | None` and `phase_done: set[str]`. A phase is done when all its non-skipped agents that ever started are done and a later phase has started, or when the run finished.
- `thoughts: dict[agent_id, str]`: the latest `log`/`decision`/`tool_call` message per agent, trimmed to 90 chars. For verifiers, it's the latest per worker.
- `workers: dict[worker_key, Worker]`, where `Worker(domain, title, state, message)` and state is one of `queued | fetching | reading | verified | rejected | failed`. Transitions:
  | Event | New worker state |
  |---|---|
  | `candidate_found` | queued (key = normalized URL) |
  | `agent_started` (verifier) | fetching |
  | `tool_call` with label starting `fetch` | fetching |
  | `tool_result` from fetch | reading |
  | `tool_call` with label `llm` | reading |
  | `fallback` | stays the same, with `flash = "fallback"` for the next 2 ticks |
  | `opportunity_verified` | verified |
  | `opportunity_rejected` | rejected |
  | `agent_failed` | failed |
- `handoffs: list[Handoff(src, dst, label, at_event_id)]`. When `agent_started` arrives for agent B and the most recent `agent_finished` came from agent A with `(A, B)` in `EDGES`, append a hand-off whose label comes from A's `counts` through `HANDOFF_LABELS`, using the first key that maps. The canvas marks an edge active for about 2.5 seconds after its hand-off (a tick counter, not wall time, so tests stay deterministic).
- `active_edges: set[tuple[str, str]]`: edges into currently running agents plus recent hand-offs.
- `profile_snapshot: dict | None`: filled from `agent_finished` of profile_analyst/github_enricher when the event data has `profile_preview` (see the note below).
- `interrupt` unchanged.

**Backend note:** in the `@agent` decorator, when `result` has a `profile`, add `profile_preview` to the `agent_finished` data. It contains: name, current_degree, major, university, cgpa, cgpa_scale, target_degree, target_fields, target_countries, test_scores (non-null only), top 8 skills, project names (resume and github, with source), and budget. Keep it under 2 KB. This is the only extra data the profile card needs, and it keeps the UI from reading LangGraph state.

`reduce_event` still returns the set of dirty component names: `canvas, phase, activity, sources, profile, input, browser, graph, summary, results`.

---

## 7. Components (behavior specs)

### 7.1 `voice_input.py` + `static/voice.js`
- `voice.js` defines `window.ssVoice = { start(lang), stop(), supported() }`:
  - Uses `window.SpeechRecognition || window.webkitSpeechRecognition` with `continuous = true` and `interimResults = true`. `lang` defaults to `en-IN`.
  - `onresult` → `emitEvent('ss_voice', {final, interim})`, where final is the concatenated final transcripts since start and interim is the current interim text.
  - `onend` → `emitEvent('ss_voice_end', {})`. Chrome auto-stops after silence; that's fine.
  - `onerror` → `emitEvent('ss_voice_error', {error})`. Map `not-allowed` to "Microphone permission denied" and `no-speech` to "Didn't catch that — try again".
  - Does nothing else: no DOM manipulation, no styling.
- `VoiceInput(target_textarea, lang_select: bool = True)` in Python:
  - Renders `.ss-mic` with a tooltip "Speak (browser speech recognition)" and a small language menu: English (India) `en-IN`, English (US) `en-US`, Hindi `hi-IN`.
  - Click toggles start/stop via `ui.run_javascript("ssVoice.start('en-IN')")`.
  - `ui.on('ss_voice', …)`: shows the interim text in a muted live line under the textarea, and on final text appends it to the textarea value at the position it had when recording started, with one space separator.
  - On page load it calls `ssVoice.supported()`. If false, the mic is disabled with the tooltip "Voice input works in Chrome or Edge".
  - Several VoiceInputs on one page (composer + clarifier): only one can listen at a time, so the Python side tracks the active instance and filters events to it.
  - Speech needs a secure context (HTTPS or localhost). The E2B public URL is HTTPS.

### 7.2 `composer.py` (intake heart)
Layout inside `.ss-card .ss-composer`:
1. **Attachment chips row**, hidden when empty: each chip shows a file icon, file name, auto-detected role ("Resume"/"Transcript", clickable to swap) and an ✕. PDFs only, max 2 files, max 10 MB each.
2. **Textarea**: `autogrow`, min 4 rows, borderless, placeholder:
   *"Tell us about yourself — your degree, grades, projects, and what you want to study and where. Or just drop your resume here."*
3. **Live interim speech line** (muted, italic) while listening.
4. **Toolbar row**:
   - left: "Attach" (paperclip button opening a hidden `ui.upload`), `VoiceInput`, and a word counter (muted).
   - right: primary button **Find scholarships** (`sym_r_arrow_forward`), disabled until valid.
5. **Drag-and-drop:** the whole composer is the drop zone. Use `ui.upload` with `.props('accept=.pdf multiple max-files=2 auto-upload flat')` styled to overlay the composer and shown only on dragover. If that's not feasible in NiceGUI, use a visible dashed drop area that appears only when there are no attachments.
6. **Hint chips** under the card: Degree · Grades · Goal · Countries · Budget · Tests · Projects. They update from `intake.coverage(text)` with a 300 ms debounce on input. When a resume is attached, chips show "from resume" in a muted state instead, because the profile will come from it.
7. **Validity:** at least one file, or 20+ words, or a sample selected. Otherwise the button stays disabled with the helper text "Add a resume or a few sentences about you."
8. `Ctrl/Cmd+Enter` submits (`ui.keyboard` or a textarea keydown handler).
9. `value() -> ComposerValue(description, files: list[(bytes, filename)], modes)`.

### 7.3 `advanced_options.py`
Two quiet text-button disclosures under the composer:
- **Add details (optional):** GitHub URL, LinkedIn/portfolio, target countries (multi-select with free entry), degree, fields, budget (INR/yr), IELTS/TOEFL/GRE. Values override the LLM extraction exactly as in v1 (`merge_form`).
- **Demo controls:** sample chips (from `backend/samples/*`; clicking one fills the details plus a short description and marks the sample) and Chaos Mode switches (reuse `chaos.CHAOS_POINTS` with v1's one-line captions).
- `to_form(description, modes) -> RunForm`. Saving files to `data/uploads/pending/<uuid>/` lives here (moved from v1 `UploadForm.save_attachments`).

### 7.4 `pages/home.py`
- `frame("New search")`, then a centered column with max width 760px:
  - eyebrow (muted, 12px uppercase): "AI scholarship research"
  - H1 (36/600): "Find funding you actually qualify for."
  - sub (16, muted): "Eleven AI agents read your profile, search official sources, verify every requirement and draft your application."
  - Composer, then Advanced options.
  - Trust row (12px muted, icons): "Official sources only · Every fact cited · Your files stay in this session".
  - A tiny provider status line appears only in Demo controls, never on the main screen.
- Launch → `runner.create_run(...)` → navigate to `/runs/{id}`. Errors show via `ui.notify(type="negative")`.

### 7.5 `phase_bar.py`
- A horizontal stepper with 6 steps (from `PHASES`). States: done (ok check), active (accent dot pulsing + label 600), pending (idle).
- Right side: elapsed `mm:ss` (ticks from `started_at`), ETA "~N min left" (median duration − elapsed, floored at "almost done"), and status pill.
- Below 768px it shows only the active phase name plus "step k of 6".

### 7.6 `swarm_canvas.py` (the centerpiece)
- Container: `.ss-card`, `position: relative`, `aspect-ratio: 1200 / 440`, `w-full`.
- **Edges layer:** one inline SVG rendered once with `ui.html`, `viewBox="0 0 1200 440"`, `preserveAspectRatio="none"`, `vector-effect: non-scaling-stroke` on paths. Each edge is a `<path id="edge-{src}-{dst}" class="ss-edge">`: a cubic Bezier from the right-middle of the source node to the left-middle of the target, and curved loop paths below the row for loops. Compute coordinates in Python from the grid (`col` × 200 + gutter, `row` × 140 + 30).
- **Edge updates:** when `view.active_edges` changes, call a single `ui.run_javascript` that sets `class` on the changed paths (`ss-edge is-active` / `ss-edge`). Send only the diff.
- **Hand-off label:** an absolutely positioned small pill at the edge midpoint showing the label (e.g. "15 candidates"), fading out after the activity window. Keep at most 2 visible.
- **Nodes:** NiceGUI elements absolutely positioned with percentage `left/top` from the same grid, using class `.ss-node`. Content:
  - icon in a 32px rounded square (accent-soft background when running)
  - name (14/600) and role (12, muted, one line)
  - **thought line** (12, muted, single-line ellipsis) from `view.thoughts[agent]`. A "typing" fade-in when it changes is optional and CSS only.
  - status corner badge: running spinner (Quasar `q-spinner` 14px), done check, failed error, skipped dash, waiting (clarifier) "needs you".
  Update by changing classes and text only; never rebuild the node tree on each tick.
- **Verifier node** spans rows 0–2 and contains the `WorkerPool`.
- Supervisor decisions (`decision` events from supervisor/critic routing) briefly show a callout pill next to the supervisor node: "Only 6 verified → re-planning" for 4 seconds, and the loop edge activates.
- **Mobile (< 900px):** hide the canvas and render the same agents as a vertical timeline (icon, name, status, thought), plus the worker pool as a chip list. Both views update from the same `RunView` (one update method calling two renderers).
- **When the run is finished:** collapse to `run_summary` with a "Show swarm" toggle that re-expands the canvas in its final state.

### 7.7 `worker_pool.py`
- A grid of `.ss-worker` chips (2 columns inside the verifier node; up to 14 visible, then "+N more"). Each chip shows the domain (e.g. `daad.de`) and a state dot. The tooltip shows the title, current message and URL. Verified chips get an ok check; rejected chips fade (60% opacity) and their tooltip shows the reason.
- Header line: "Verifiers · 7 running · 5 verified · 2 rejected".

### 7.8 `profile_card.py`
- Appears with a fade-in when `view.profile_snapshot` is set. Title: "What the agents understood".
- Two-column key facts: degree · university · CGPA · target · countries · tests · budget.
- Skills as small chips (max 8). Projects split into "From resume" and "Found on GitHub" (hidden gems, with a GitHub icon).
- Missing items shown as muted "Not provided: IELTS score" lines. This is informational; the Clarifier only asks for critical ones.
- Placement: the right column, above the tabs.

### 7.9 `input_request.py` (inline clarifier)
- Shown when `view.interrupt` is set. It's an accent-bordered card at the top of the right column, and the page scrolls to it.
- Title: "The swarm needs one detail". Each question renders as:
  - `multi` → chips input with suggestions; for countries, reuse the `intake.py` list.
  - `text` → input plus a `VoiceInput` (so the user can speak the answer)
  - `number` → number input
- Buttons: "Continue" (primary) and "Skip" (text). Keep v1's resume-race protection (`_awaiting_resume`).
- The clarifier canvas node shows the status "needs you" (`.is-waiting`).

### 7.10 `activity.py`
- A minimal list: time (mm:ss since start, tabular), agent name (500), message. Icon and color come from `EVENT_STYLE`.
- Segmented control: **Important** (default, `IMPORTANT_EVENTS`) / **All**, plus an agent filter dropdown.
- New rows append without rebuilding; auto-scroll unless the user has scrolled up (show a "Jump to latest" pill).
- Fallback, retry and chaos rows get a left `--warn` border. Errors get `--err`. Decisions get `--accent`.

### 7.11 `sources_panel.py`
- A list of every candidate with its domain favicon (`https://www.google.com/s2/favicons?domain={domain}&sz=32` as an `img` src, with a placeholder on error), title, provider, an "official" check, and the current worker state pill. Verified items link to the official URL.

### 7.12 `run_summary.py`
- While running: a counter row (tabular numbers) of LLM calls · pages read · verified · recoveries (retries + fallbacks) · cost.
- When finished: a single line "Swarm finished in 10m 12s · 11 agents · 109 tool calls · 6 automatic recoveries · $0.12" plus "Show swarm" and "Replay" buttons.

### 7.13 Results (`components/results/*`)
- `summary.py`: one sentence built deterministically (no LLM), e.g. "We verified **12 opportunities** from official sources. **5 are strong matches**. The nearest deadline is **15 Nov 2026** (DAAD EPOS)." Then three stat tiles: Verified · Eligible now · Unlockable with one step (from gaps).
- `top_matches.py` (one card per match, vertical list, not a grid):
  - Header row: rank (28/600, muted), name (20/600), org · country, and a match score as "87% match" with a thin bar.
  - Key-facts row: Funding (type + text) · Deadline (`deadline_badge` + text) · Eligibility pill · Verification pill.
  - "Why you": the `why_it_fits` markdown, limited to 3 lines with "more".
  - Expandable "Requirements" (`requirement_list.py`): each requirement shows ✓/✗/? (ok/err/muted), the description, the evidence, and an info icon whose tooltip has the exact source quote and domain.
  - Expandable "How to apply": numbered steps and a documents checklist.
  - Footer: sources (domains with quote tooltips, up to 4), "Graph evidence" path chips if any, and **Apply** (primary, opens a new tab).
- `opportunity_table.py`: same data, restyled. Dense table, filter chips (Eligible / Partial / All, country), "Rejected (N)" disclosure.
- `gaps_whatif.py` → title "Unlock more": cards such as "IELTS ≥ 6.5 → unlocks 4 opportunities" with the suggestion text, and the what-if inputs inline with a "Recalculate" button (logic unchanged).
- `deadlines.py`: a list sorted by date (expired hidden behind a toggle), each row showing days left, name and date. A button "Add all to calendar" downloads `services.calendar.deadlines_ics` via `ui.download`.
- `sop_viewer.py`: document look (`max-w-prose`, 16/1.7 line height, generous margins), a "For: {program}" header, word count, and revision count. Critic notes in a side list (or below on mobile). Copy and Download .md. `[ADD: …]` placeholders are highlighted with an accent-soft background so the student sees what to fill in.
- Page actions, top right of results: **Download report (.md)**, **Print** (`ui.run_javascript('window.print()')`, which uses the print CSS), **Add deadlines to calendar**.

### 7.14 `pages/run_detail.py` v2
Layout (desktop ≥ 1100px):
```
[ frame header ]
[ Name · status pill ........................ phase bar (wide) .... elapsed/ETA ]
[ swarm canvas (8/12 width) ][ right column (4/12): input_request? · profile_card · tabs(Activity | Sources | Graph | Browser) ]
[ run_summary counters ]
[ results (when finished) ]
```
Tablet/mobile: a single column (phase bar, mobile timeline, input request, profile card, tabs, results).
- **Tick loop:** keep v1's `ui.timer(settings.ui_poll_seconds, tick)` polling `store.events_after`. Route dirty flags to component `update()` methods only.
- **Replay mode** (`?replay=1&speed=5`): don't poll the store. Instead, start a background task that iterates `replay.replay_events(run_id, speed)` and applies `reduce_event` and the updates. Show a "Replay ×5" pill with speed buttons (1× / 5× / 20×) and Restart. At the end, render the results as normal. Replay works for finished and failed runs only; for other runs, fall back to live mode.
- The browser tab title updates with progress: `ui.page_title(f"({phase_index}/6) {name} · ScholarSwarm")`, and "✓ Results ready · ScholarSwarm" at the end.
- When the run finishes, scroll the results into view (`ui.run_javascript("document.getElementById('results').scrollIntoView({behavior:'smooth'})")`) unless in replay.

### 7.15 `pages/runs.py`
A minimal table: student, started, duration, verified count, status pill, and the actions Open and Replay. Empty state: "No searches yet" plus a "Start a search" button.

---

## 8. Improvements included (beyond the request) and why

| # | Improvement | Why it matters |
|---|---|---|
| 1 | One composer for resume, text and voice | The least effort for the user; voice is natural for describing goals |
| 2 | Auto-detects resume vs transcript | One fewer decision for the user |
| 3 | Live coverage hints | Guides users toward useful input without a form |
| 4 | "What the agents understood" card | Transparency; the judge sees profile enrichment (25 marks) happen |
| 5 | Hand-off animations and labels | Makes "agents exchange information" visible (30 marks) |
| 6 | Parallel worker pool | Makes parallelism and per-site verification visible |
| 7 | Inline, voice-enabled clarifier | Human-in-the-loop without a jarring modal |
| 8 | Requirement checklist with quotes | Trustworthy sources, visibly (20 marks) |
| 9 | Replay mode | A reliable 5-minute demo and a safe live judging slot |
| 10 | Add to calendar (.ics) | A practical next step for the student |
| 11 | Print/PDF-friendly report | Shareable output without a new dependency |
| 12 | ETA plus tab-title progress | Users can switch tabs while the run continues |
| 13 | Reduced motion, color plus icon status, keyboard submit | Accessibility and polish |

Not included on purpose (scope): user accounts, a mobile app, multi-language UI text, and editing the profile mid-run.

---

## 9. Tests to add or update (all run in E2B)

| File | Covers |
|---|---|
| `tests/test_intake.py` | `classify_document` (resume vs transcript samples from `backend/samples/*` PDFs via `extract_text`), `coverage` true/false cases including spoken-style text ("eight point two CGPA" is acceptable as not covered; document this), `word_count` |
| `tests/test_runner.py` (update) | `create_run` accepts a description-only run (≥ 20 words), rejects an empty one, and keeps sample runs working |
| `tests/test_live_state.py` (update) | worker state transitions, hand-off creation from `counts`, the active edge window, phase progress, thoughts trimming, profile_snapshot, replay of the same events giving the same final view |
| `tests/test_agent_decorator.py` (new) | `counts` and `profile_preview` in `agent_finished`, `worker` in verifier events, GraphInterrupt still re-raised |
| `tests/test_replay.py` | `replay_delays` capping and speed scaling |
| `tests/test_calendar.py` | ICS has VCALENDAR/VEVENT/VALARM, CRLF, one event per dated opportunity, none for undated ones |
| `tests/test_ui_pages.py` (new) | NiceGUI `user` fixture (`pytest_plugins = ["nicegui.testing.user_plugin"]`; follow the NiceGUI testing docs for the installed version): `/` renders the composer; the submit button is disabled with an empty composer; typing 25 words enables it; `/runs/{id}` for a seeded finished run shows the summary and top-5 names; `?replay=1` renders the replay pill. Seed runs and events directly with `store` functions in a temp `DATA_DIR`. |

Target: all old and new tests pass (≥ 70 tests).

---

## 10. E2B execution — `backend/scripts/e2b_run.py`

A thin local client (the only local execution allowed). Use the `e2b` Python SDK (`pip install e2b`, installed into a separate local venv or via `pipx`; never into the project venv). Check https://e2b.dev/docs for the installed SDK version's exact method names (`Sandbox.create`, `sandbox.files.write`, `sandbox.commands.run`, `sandbox.get_host`, `Sandbox.connect`, `sandbox.kill`, `set_timeout`).

**Subcommands:**
| Command | What it does |
|---|---|
| `up` | Creates a sandbox (timeout 60 min) and saves its id to `backend/data/.e2b_sandbox` (gitignored). Uploads the repo as a tar: everything tracked by git plus uncommitted changes, excluding `.git`, `.venv`, `backend/data`, `__pycache__`. Uploads the repo-root `.env` to `backend/.env`. Extracts to `/home/user/app`. Creates the venv and runs `pip install -r backend/requirements.txt`, then `python -m playwright install --with-deps chromium` (use `sudo` if required). Prints the sandbox id. |
| `sync` | Re-uploads changed files to the existing sandbox (re-tar and extract; simple beats clever). |
| `test [pytest args]` | Runs `cd /home/user/app/backend && .venv/bin/python -m pytest -q {args}` and streams the output. Its exit code is the pytest exit code. |
| `serve` | Starts `uvicorn app.main:app --host 0.0.0.0 --port 8000` in the background, waits for `/api/health`, and prints `https://{sandbox.get_host(8000)}`. That URL is used for visual checks and for the human to try the app (HTTPS, so the mic works). |
| `logs` | Tails the uvicorn log file. |
| `run-sample <name>` | `python -m app.cli run samples/<name>` (a real end-to-end run with real keys; costs about $0.13). |
| `down` | Kills the sandbox and deletes the id file. |

**Rules:** reads `E2B_API_KEY` from the repo-root `.env` (parse simple `KEY=VALUE` lines; no dotenv dependency needed) or from the environment. Never prints the key or `.env` content. Each command's timeout comes from a flag (default 15 min for `run-sample`, 10 min for `test`).

**Visual QA:** after `serve`, open the printed URL in a browser tool. Check `/` at 1440×900 and at 390×844, a replayed run (`/runs/<id>?replay=1&speed=20`) at both sizes, and dark mode. Take screenshots and compare them against §2 and §7. Fix anything that looks noisy, cramped or misaligned. Seed data for replay comes from a `run-sample` run, or from the `backend/data` of a previous run uploaded with `up --with-data` (optional flag that includes `backend/data/app.db`).

---

## 11. Phases (do them in order)

| Phase | Work | Acceptance (all checks in E2B) |
|---|---|---|
| **0. Sandbox** | Write `scripts/e2b_run.py`. `up`, then `test`. | The existing 54 tests pass in E2B. |
| **1. Design system** | `static/theme.css`, `theme.py` v2 (fonts, CSS, static mount in `main.py`), restyle `badges.py` to `.ss-pill`. | `serve`: v1 pages render with the new frame; screenshots look clean in light and dark. |
| **2. Backend intake** | `RunForm.description`, `create_run` rule, `services/intake.py`, profile analyst + prompt, API field, tests. | New tests pass; `run-sample` still works; a description-only run via the API produces a sensible profile (check the `profile_analyst` events). |
| **3. Composer + voice** | `voice.js`, `voice_input.py`, `composer.py`, `advanced_options.py`, `home.py` v2; delete `upload_form.py` and `chaos_panel.py`. | `/` works: attach 2 PDFs (roles auto-detected), type text (hints update), mic works in Chrome on the E2B URL, sample chips fill details, launch navigates to the run. UI tests pass. |
| **4. Event enrichment** | §3.5 worker identity, `counts`, `profile_preview`; `live_state.py` v2 and tests. | Decorator and live_state tests pass; the old UI still renders (no regressions). |
| **5. Mission control** | `agents.py` v2, `phase_bar`, `swarm_canvas`, `worker_pool`, `profile_card`, `input_request`, `activity`, `sources_panel`, `run_summary`, `run_detail.py` v2; delete the old components. | A live `run-sample` viewed through `serve` shows the pulsing active node, hand-off labels, the worker pool filling, the profile card and thoughts updating. The clarifier inline card works (use the `priya` sample with countries removed). Mobile timeline works. |
| **6. Results + extras** | Results components, `calendar.py` + endpoint, print CSS, ETA. | All tabs render for 2 different finished runs; the .ics imports into Google Calendar (human check); Print preview shows only the results. |
| **7. Replay** | `services/replay.py`, replay mode in `run_detail`, Replay buttons in history and summary. | `?replay=1&speed=20` replays a full run in under 1 minute and ends with the results; tests pass. |
| **8. Polish + QA** | Visual QA (§10) at desktop and mobile, light and dark; empty, error and failed states; reduced motion; keyboard submit; copy pass (short, plain, no jargon in the UI). | Screenshots reviewed; `test` is all green; human checklist in `human-plan.md` §5 passes. |
| **9. Docs** | Update `README.md` (new UI, voice, replay, E2B runner), `docs/architecture.md` (UI layer + event enrichment), `STATUS.md` (new state, test count), and add UI screenshots to `docs/screenshots/`. | Docs match the app. |

---

## 12. Definition of done

- [ ] A student can start a search with **only** a resume, **only** typed text, **only** speech, or any mix, without opening any form.
- [ ] Mission control makes it obvious which agent is working, what it's doing, what it handed to whom, and that verifiers run in parallel.
- [ ] Every fallback, retry and supervisor decision is visible on the canvas and in Activity.
- [ ] Results show verified sources with quotes, a requirement checklist, deadlines with .ics, the SOP and gaps/what-if.
- [ ] Replay of a finished run works at 20×.
- [ ] Light and dark themes, desktop and mobile layouts look clean and consistent (screenshots in `docs/screenshots/`).
- [ ] All tests pass in E2B; nothing was executed on the local machine except `e2b_run.py`.
- [ ] No secrets in git (`git grep -n "e2b_\|sk-\|tvly-" -- . ':!*.example'` returns nothing).
