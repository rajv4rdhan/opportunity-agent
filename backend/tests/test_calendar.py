"""Calendar export shape and edge cases."""

from datetime import date

from app.models.opportunity import Opportunity
from app.models.profile import StudentProfile
from app.models.report import FinalReport
from app.services.calendar import deadlines_ics


def _report() -> FinalReport:
    return FinalReport(
        run_id="run123",
        profile=StudentProfile(name="Rahul"),
        all_opportunities=[
            Opportunity(
                id="daad",
                name="DAAD EPOS",
                provider_org="DAAD",
                deadline=date(2027, 1, 15),
                official_url="https://daad.de/epos",
            ),
            Opportunity(
                id="chevening",
                name="Chevening, UK",
                provider_org="Chevening",
                deadline=date(2026, 11, 3),
                official_url="https://chevening.org",
            ),
            Opportunity(
                id="undated",
                name="Rolling program",
                provider_org="University",
            ),
        ],
    )


def test_ics_has_one_event_per_dated_opportunity():
    ics = deadlines_ics(_report())

    assert ics.startswith("BEGIN:VCALENDAR\r\n")
    assert ics.endswith("END:VCALENDAR\r\n")
    assert "\r\n" in ics
    assert ics.count("BEGIN:VEVENT") == 2
    assert ics.count("BEGIN:VALARM") == 2
    assert "UID:run123-daad@scholarswarm" in ics
    assert "UID:run123-chevening@scholarswarm" in ics
    assert "DTSTART;VALUE=DATE:20270115" in ics
    assert "SUMMARY:Deadline: Chevening\\, UK" in ics
    assert "DESCRIPTION:https://daad.de/epos" in ics
    assert "Rolling program" not in ics


def test_ics_is_valid_without_dated_opportunities():
    report = FinalReport(
        run_id="empty",
        profile=StudentProfile(name="Test"),
        all_opportunities=[Opportunity(name="No date", provider_org="Org")],
    )
    ics = deadlines_ics(report)

    assert "BEGIN:VCALENDAR" in ics
    assert "BEGIN:VEVENT" not in ics
    assert ics.endswith("END:VCALENDAR\r\n")
