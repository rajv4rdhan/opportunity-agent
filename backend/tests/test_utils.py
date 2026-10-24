from datetime import date

from app.core.utils import (
    days_until,
    is_aggregator,
    is_official_domain,
    normalize_url,
    parse_date_safe,
    quote_supported,
    slugify,
    truncate,
)


def test_normalize_url_strips_tracking_and_fragment():
    assert (
        normalize_url("HTTPS://WWW.Example.com/Path/?utm_source=x&a=1#frag")
        == "https://example.com/Path?a=1"
    )
    assert normalize_url("example.com/foo/") == "https://example.com/foo"
    assert normalize_url("") == ""


def test_official_domains():
    assert is_official_domain("https://www.mit.edu/admissions")
    assert is_official_domain("https://www.daad.de/en/")
    assert is_official_domain("https://uni-heidelberg.de/study")
    assert is_official_domain("https://www.gov.uk/chevening")
    assert not is_official_domain("https://scholars4dev.com/scholarship")
    assert not is_official_domain("https://example.com")


def test_aggregator_detection():
    assert is_aggregator("https://www.scholars4dev.com/2026/list")
    assert not is_aggregator("https://www.mit.edu")


def test_quote_supported():
    page = "Applicants must have an IELTS score of at least 6.5 overall and a bachelor degree."
    assert quote_supported("IELTS score of at least 6.5 overall", page)
    assert not quote_supported("Applicants must have an IELTS score of 8.0", page)
    assert not quote_supported("", page)
    assert not quote_supported("tiny", page)


def test_parse_date_safe():
    assert parse_date_safe("Deadline: 15 January 2027") == date(2027, 1, 15)
    assert parse_date_safe("not a date at all") is None
    assert parse_date_safe(None) is None


def test_slugify_and_truncate():
    assert slugify("TUM — M.Sc. Informatics (2026)") == "tum-m-sc-informatics-2026"
    assert slugify("###") == "item"
    assert truncate("abcdef", 3) == "abc"
    assert truncate("ab", 3) == "ab"


def test_days_until():
    assert days_until(date(2027, 1, 10), today=date(2027, 1, 1)) == 9
    assert days_until(None) is None
