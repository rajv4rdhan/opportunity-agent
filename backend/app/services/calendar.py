"""RFC 5545 calendar export with no external dependency."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

from app.core.utils import slugify
from app.models.report import FinalReport


def _escape(text: str) -> str:
    return (
        str(text or "")
        .replace("\\", "\\\\")
        .replace(";", "\\;")
        .replace(",", "\\,")
        .replace("\r\n", "\\n")
        .replace("\n", "\\n")
    )


def _event(report: FinalReport, name: str, deadline: date, url: str, uid: str) -> list[str]:
    end = deadline + timedelta(days=1)
    return [
        "BEGIN:VEVENT",
        f"UID:{_escape(uid)}",
        f"DTSTAMP:{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}",
        f"DTSTART;VALUE=DATE:{deadline.strftime('%Y%m%d')}",
        f"DTEND;VALUE=DATE:{end.strftime('%Y%m%d')}",
        f"SUMMARY:{_escape('Deadline: ' + name)}",
        f"DESCRIPTION:{_escape(url)}",
        "BEGIN:VALARM",
        "TRIGGER:-P7D",
        "ACTION:DISPLAY",
        f"DESCRIPTION:{_escape('Deadline in 7 days: ' + name)}",
        "END:VALARM",
        "END:VEVENT",
    ]


def deadlines_ics(report: FinalReport) -> str:
    """One all-day VEVENT per dated opportunity, with a 7-day reminder."""
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//ScholarSwarm//Deadlines//EN",
        "CALSCALE:GREGORIAN",
    ]
    seen: set[str] = set()
    for opportunity in report.all_opportunities:
        if opportunity.deadline is None:
            continue
        key = opportunity.id or slugify(f"{opportunity.name} {opportunity.provider_org}")
        if key in seen:
            continue
        seen.add(key)
        lines.extend(
            _event(
                report,
                opportunity.name,
                opportunity.deadline,
                opportunity.official_url or opportunity.application_url or "",
                f"{report.run_id}-{key}@scholarswarm",
            )
        )
    lines.append("END:VCALENDAR")
    return "\r\n".join(lines) + "\r\n"
