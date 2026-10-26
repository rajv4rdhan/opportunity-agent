"""Pure intake helpers: document roles, composer hints and word counts."""

from __future__ import annotations

import re
from typing import Literal

DocumentKind = Literal["resume", "transcript"]

TRANSCRIPT_PATTERNS = [
    r"\bsemester\b",
    r"\bsgpa\b",
    r"\bcgpa\b",
    r"\bgrade\b",
    r"\bcredits?\b",
    r"\bmarks?\b",
    r"\bcourse\s+code\b",
]

RESUME_PATTERNS = [
    r"\bexperience\b",
    r"\bprojects?\b",
    r"\bskills?\b",
    r"\beducation\b",
    r"@",
    r"github\.com",
]

COUNTRIES = [
    "Australia",
    "Austria",
    "Belgium",
    "Canada",
    "China",
    "Denmark",
    "Finland",
    "France",
    "Germany",
    "Hong Kong",
    "India",
    "Ireland",
    "Italy",
    "Japan",
    "Netherlands",
    "New Zealand",
    "Norway",
    "Singapore",
    "South Korea",
    "Spain",
    "Sweden",
    "Switzerland",
    "United Arab Emirates",
    "United Kingdom",
    "United States",
    "USA",
    "UK",
    "UAE",
]

_COUNTRY_PATTERN = "|".join(re.escape(name) for name in COUNTRIES)

COVERAGE: dict[str, list[str]] = {
    "degree": [
        r"\bb\.?\s?tech\b",
        r"\bb\.?\s?sc\b",
        r"\bb\.?\s?com\b",
        r"\bbachelor(?:'s)?\b",
        r"\bmaster(?:'s)?\b",
        r"\bfinal[-\s]year\b",
        r"\bgraduate\b",
        r"\bcurrently\s+studying\b",
    ],
    "grades": [
        r"\b\d(?:\.\d{1,2})?\s*(?:cgpa|gpa)\b",
        r"\b\d{2}(?:\.\d{1,2})?\s*%",
        r"\b\d(?:\.\d{1,2})?\s*/\s*(?:4|10)(?:\.0)?\b",
        r"\bpercentage\b",
    ],
    "goal": [
        r"\bms\b",
        r"\bm\.?\s?sc\b",
        r"\bmba\b",
        r"\bph\.?\s?d\b",
        r"\bmaster(?:'s)?\b",
        r"\bpostgraduate\b",
        r"\bstudy\b",
        r"\bprogram(?:me)?\b",
    ],
    "countries": [
        rf"\b(?:{_COUNTRY_PATTERN})\b",
        r"\babroad\b",
        r"\beurope\b",
    ],
    "budget": [
        r"\blakhs?\b",
        r"₹",
        r"\binr\b",
        r"\bbudget\b",
        r"\bafford\b",
        r"\bfully[-\s]funded\b",
        r"\bfunding\b",
        r"\bscholarship\b",
    ],
    "tests": [
        r"\bielts\b",
        r"\btoefl\b",
        r"\bgre\b",
        r"\bgmat\b",
        r"\bpte\b",
        r"\bduolingo\b",
    ],
    "projects": [
        r"\bprojects?\b",
        r"\bbuilt\b",
        r"\bgithub(?:\.com)?\b",
    ],
}

_COMPILED = {
    hint: [re.compile(pattern, re.IGNORECASE) for pattern in patterns]
    for hint, patterns in COVERAGE.items()
}
_TRANSCRIPT = [re.compile(pattern, re.IGNORECASE) for pattern in TRANSCRIPT_PATTERNS]
_RESUME = [re.compile(pattern, re.IGNORECASE) for pattern in RESUME_PATTERNS]


def _matches(patterns: list[re.Pattern[str]], text: str) -> int:
    return sum(len(pattern.findall(text)) for pattern in patterns)


def classify_document(text: str) -> DocumentKind:
    """Guess whether a PDF is a resume or an academic transcript.

    The higher signal count wins; a tie (including empty text) is a resume.
    """
    transcript = _matches(_TRANSCRIPT, text or "")
    resume = _matches(_RESUME, text or "")
    return "transcript" if transcript > resume else "resume"


def coverage(text: str) -> dict[str, bool]:
    """Which useful facts a piece of text appears to contain."""
    value = text or ""
    return {
        hint: any(pattern.search(value) for pattern in patterns)
        for hint, patterns in _COMPILED.items()
    }


def word_count(text: str | None) -> int:
    """Count words the same way the intake rule does."""
    return len((text or "").split())
