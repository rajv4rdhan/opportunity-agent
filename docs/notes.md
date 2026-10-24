# Notes — draft for the human to rewrite

> The submission asks for the most interesting experiment and the biggest challenge. This is a
> draft based on what the code actually does. Rewrite it in your own words and replace every
> `[HUMAN: …]` placeholder with your own experience.

## Most interesting experiment

The interesting part was not "an LLM finds scholarships". It was testing whether the swarm can be
made **accountable** for what it claims.

The Verifier returns exact quotes for every deadline, funding statement and requirement. A separate
quote check normalises the page and requires the quote's words (and every number) to appear in the
page text. If the model invents "IELTS 8.0" on a page that says 6.5, the quote is dropped and the
opportunity's confidence falls. On top of that, the Matcher recomputes GPA conversion and test-score
thresholds deterministically, so the final eligibility is not a second LLM opinion.

The second half of the experiment was the **What-If slider**: because eligibility and scoring are
pure functions, raising IELTS from 6.0 to 7.0 can show exactly which partial opportunities become
eligible, instantly and with no model call. The gap cards invert the same information: "IELTS ≥ 6.5
unlocks 4 scholarships".

`[HUMAN: describe the result that surprised you most — for example a quote that was rejected, a
deadline that was wrong on an aggregator but right on the official page, or a What-If jump you did
not expect.]`

## Biggest challenge

The hard part was making failure **visible and recoverable** rather than silent.

Every outbound call — search, page fetch, LLM, GitHub, Neo4j — goes through one retry/fallback
policy with one event stream. A blocked page is not an exception in a log; it is a chain of amber
`fallback` events followed by a rejection with a reason. A malformed JSON response is not a crash;
Instructor re-asks and then the fallback model runs. The supervisor counts verified and eligible
opportunities and decides whether another planning round is worth it, and says why in the feed.

That design made Chaos Mode possible: each switch injects exactly one failure per run, so the
recovery is demonstrated instead of described. It also exposed subtle problems — for example,
LangGraph re-runs an interrupted node from the top, so an empty "skip" answer looked like no answer
at all and the Clarifier asked again forever; the fix was a non-empty skip sentinel.

`[HUMAN: add the concrete bug or outage that cost you the most time, and what you changed.]`

## What I would do next

- Persist the search/fetch cache across machines so repeat demos are fast and reproducible.
- Add a second independent quote check with a different tokenizer to catch paraphrase drift.
- Let the Critic see the official page text, not only the extracted opportunity, when fact-checking.
- Use the knowledge graph across students (anonymised) to warm-start the planner for new profiles.

`[HUMAN: add your own next step, especially anything you would change for a real deployment.]`
