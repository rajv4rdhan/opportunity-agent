"""Small pure helpers shared across tools, agents and services."""

from __future__ import annotations

import re
import unicodedata
from collections import Counter
from datetime import date, datetime, timezone
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import tldextract
from dateutil import parser as date_parser

_extract = tldextract.TLDExtract(suffix_list_urls=(), cache_dir=None)

ACADEMIC_SUFFIXES = {
    "edu",
    "ac.uk",
    "ac.in",
    "edu.au",
    "ac.jp",
    "edu.sg",
    "edu.hk",
    "ac.kr",
    "edu.cn",
    "ac.cn",
    "ac.nz",
    "ac.za",
    "edu.my",
    "ac.at",
    "ac.be",
    "edu.br",
    "edu.mx",
    "ac.ir",
    "edu.pk",
    "ac.th",
}
GOV_SUFFIXES = {"gov", "gov.uk", "gov.in", "gov.au", "gc.ca", "gov.sg", "govt.nz"}

# A trust signal only — never a list of results.
OFFICIAL_ORGS = {
    "daad.de",
    "chevening.org",
    "fulbright-india.org",
    "usief.org.in",
    "erasmus-plus.ec.europa.eu",
    "eacea.ec.europa.eu",
    "studyinholland.nl",
    "si.se",
    "campusfrance.org",
    "mext.go.jp",
    "studyinjapan.go.jp",
    "commonwealth.org",
    "cscuk.fcdo.gov.uk",
    "inlaksfoundation.org",
    "jntataendowment.org",
    "kcmahindra.org",
    "a-star.edu.sg",
    "educanada.ca",
}

# Allowed for discovery; the verifier must follow through to the official page.
AGGREGATOR_DOMAINS = {
    "scholars4dev.com",
    "opportunitydesk.org",
    "scholarshipportal.com",
    "studyportals.com",
    "buddy4study.com",
    "mastersportal.com",
    "bachelorsportal.com",
    "phdportal.com",
    "findamasters.com",
    "findaphd.com",
    "topuniversities.com",
}


def slugify(text: str) -> str:
    """Lowercase ASCII slug, safe for ids and cache keys."""
    normalized = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-z0-9]+", "-", normalized.lower()).strip("-")
    return slug or "item"


def normalize_url(url: str) -> str:
    """Lowercase host, drop www, tracking params, fragment and trailing slash."""
    url = (url or "").strip()
    if not url:
        return ""
    if "://" not in url:
        url = "https://" + url
    parts = urlsplit(url)
    scheme = parts.scheme.lower()
    host = (parts.hostname or "").lower()
    if host.startswith("www."):
        host = host[4:]
    netloc = host
    if parts.port and not ((scheme == "http" and parts.port == 80) or (scheme == "https" and parts.port == 443)):
        netloc = f"{host}:{parts.port}"
    query = [
        (key, value)
        for key, value in parse_qsl(parts.query, keep_blank_values=True)
        if not key.lower().startswith("utm_")
    ]
    return urlunsplit((scheme, netloc, parts.path.rstrip("/"), urlencode(query), ""))


def _registered_domain(extracted: tldextract.ExtractResult) -> str:
    # tldextract renamed this property; support both spellings.
    property_name = (
        "top_domain_under_public_suffix"
        if hasattr(extracted, "top_domain_under_public_suffix")
        else "registered_domain"
    )
    return str(getattr(extracted, property_name)).lower()


def domain_of(url: str) -> str:
    """Registered domain, e.g. https://www.tum.de/x -> tum.de."""
    return _registered_domain(_extract(url))


def is_official_domain(url: str) -> bool:
    """True for academic/government domains and known official funding bodies."""
    if not url:
        return False
    extracted = _extract(url)
    suffix = extracted.suffix.lower()
    domain = _registered_domain(extracted)
    if not suffix or not domain:
        return False
    if suffix in ACADEMIC_SUFFIXES or suffix in GOV_SUFFIXES:
        return True
    if suffix == "de" and re.match(r"^(uni|tu|fh|hs)-", extracted.domain.lower()):
        return True
    return domain in OFFICIAL_ORGS


def is_aggregator(url: str) -> bool:
    return domain_of(url) in AGGREGATOR_DOMAINS


def truncate(text: str, limit: int) -> str:
    """Cut text to at most `limit` characters."""
    return text if len(text) <= limit else text[:limit]


def parse_date_safe(text: str | None) -> date | None:
    """Parse a human date (fuzzy) and return None instead of raising."""
    if not text:
        return None
    try:
        return date_parser.parse(str(text), fuzzy=True).date()
    except (ValueError, OverflowError, TypeError):
        return None


def days_until(deadline: date | None, today: date | None = None) -> int | None:
    if deadline is None:
        return None
    reference = today or datetime.now(timezone.utc).date()
    return (deadline - reference).days


def _quote_words(text: str) -> list[str]:
    return re.findall(r"[a-z0-9][a-z0-9.%+-]*", text.lower())


def quote_supported(quote: str, page_text: str, threshold: float = 0.8) -> bool:
    """Cheap anti-hallucination check: quote words must appear in a page window.

    Numbers and dates are checked strictly: if the page says 6.5, a quote
    claiming 8.0 is never "supported".
    """
    if not quote or not page_text:
        return False
    normalized_quote = re.sub(r"\s+", " ", quote.lower()).strip()
    normalized_page = re.sub(r"\s+", " ", page_text.lower())
    if normalized_quote in normalized_page:
        return True

    page_numbers = set(re.findall(r"\d+(?:[.,]\d+)?", normalized_page))
    if any(number not in page_numbers for number in re.findall(r"\d+(?:[.,]\d+)?", normalized_quote)):
        return False

    quote_words = _quote_words(quote)
    page_words = _quote_words(page_text)
    if len(quote_words) < 4 or not page_words:
        return False

    needed = Counter(quote_words)
    width = len(quote_words)
    for start in range(0, max(1, len(page_words) - width + 1)):
        window = Counter(page_words[start : start + width])
        matched = sum((needed & window).values())
        if matched / width >= threshold:
            return True
    return False
