"""Build the FinalReport and its markdown export."""

from __future__ import annotations

from app.models.opportunity import Opportunity
from app.models.profile import StudentProfile
from app.models.report import FinalReport, RunStats


def build_report(state: dict, stats: RunStats) -> FinalReport:
    return FinalReport(
        run_id=state.get("run_id", ""),
        profile=state.get("profile") or StudentProfile(name="Unknown student"),
        github=state.get("github"),
        top5=state.get("top5", []),
        all_opportunities=state.get("opportunities", []),
        rejected=state.get("rejected", []),
        gaps=state.get("gaps", []),
        sop_for=state.get("sop_for"),
        sop_markdown=state.get("sop_markdown"),
        critic_notes=state.get("critic_notes", []),
        stats=stats,
    )


def _cell(value: object) -> str:
    return str(value if value is not None else "—").replace("|", "\\|")


def _opportunity_row(opportunity: Opportunity) -> str:
    return (
        f"| {_cell(opportunity.name)} | {_cell(opportunity.provider_org)} | {_cell(opportunity.country)} "
        f"| {_cell(opportunity.funding_type)} | {_cell(opportunity.deadline)} | {_cell(opportunity.eligibility)} "
        f"| {opportunity.score:.0f} | {_cell(opportunity.verification)} |"
    )


def _top_match_section(report: FinalReport) -> list[str]:
    lines: list[str] = ["## Top matches", ""]
    for match in report.top5:
        opportunity = match.opportunity
        lines += [
            f"### {match.rank}. {opportunity.name}",
            "",
            f"- **Provider:** {opportunity.provider_org}",
            f"- **Country:** {opportunity.country or '—'}",
            f"- **Funding:** {opportunity.funding_type} — {opportunity.funding_text or 'see source'}",
            f"- **Deadline:** {opportunity.deadline or 'not stated'}",
            f"- **Eligibility:** {opportunity.eligibility} · score {opportunity.score:.0f}/100 · {opportunity.verification}",
            "",
            match.why_it_fits,
            "",
        ]
        if match.graph_paths:
            lines.append("**Graph evidence:**")
            for path in match.graph_paths:
                lines.append("- " + " → ".join(path))
            lines.append("")
        if opportunity.sources:
            lines.append("**Sources:**")
            for source in opportunity.sources:
                quote = f' — "{source.quote}"' if source.quote else ""
                lines.append(f"- {source.url}{quote}")
            lines.append("")
        if opportunity.how_to_apply:
            lines.append("**How to apply:**")
            lines += [f"{index}. {step}" for index, step in enumerate(opportunity.how_to_apply, start=1)]
            lines.append("")
    return lines


def report_to_markdown(report: FinalReport) -> str:
    profile = report.profile
    lines = [
        f"# ScholarSwarm report — {profile.name}",
        "",
        f"- **Degree sought:** {profile.target_degree or '—'} in {', '.join(profile.target_fields) or '—'}",
        f"- **Target countries:** {', '.join(profile.target_countries) or 'any'}",
        f"- **CGPA:** {profile.cgpa or '—'}/{profile.cgpa_scale:g}",
        f"- **Nationality:** {profile.nationality or '—'}",
        f"- **Verified opportunities:** {len(report.all_opportunities)}",
        "",
        *_top_match_section(report),
    ]

    lines += ["## All opportunities", "", "| Name | Provider | Country | Funding | Deadline | Eligibility | Score | Verification |"]
    lines += ["|---|---|---|---|---|---|---|---|"]
    lines += [_opportunity_row(opportunity) for opportunity in report.all_opportunities]
    lines.append("")

    if report.gaps:
        lines += ["## Gaps", ""]
        for gap in report.gaps:
            lines += [f"- **{gap.requirement}** unlocks {len(gap.unlocks)}: {', '.join(gap.unlocks)}", f"  - {gap.suggestion}"]
        lines.append("")

    if report.rejected:
        lines += ["## Rejected candidates", ""]
        lines += [f"- {rejection.url} — {rejection.reason}" for rejection in report.rejected]
        lines.append("")

    if report.sop_markdown:
        lines += [f"## Statement of purpose — {report.sop_for}", "", report.sop_markdown, ""]
    if report.critic_notes:
        lines += ["## Critic notes", ""] + [f"- {note}" for note in report.critic_notes] + [""]

    stats = report.stats
    lines += [
        "## Run stats",
        "",
        f"- Agents run: {stats.agents_run}",
        f"- LLM calls: {stats.llm_calls}",
        f"- Tool calls: {stats.tool_calls}",
        f"- Pages read: {stats.pages_read}",
        f"- Retries: {stats.retries} · fallbacks: {stats.fallbacks} · errors: {stats.errors}",
        f"- Estimated cost: ${stats.est_cost_usd:.4f}",
    ]
    return "\n".join(lines) + "\n"
