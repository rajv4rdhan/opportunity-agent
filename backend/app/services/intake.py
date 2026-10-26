"""Document roles and word counts used by the intake pipeline.

Coverage hints now live in the React client (`frontend/src/lib/coverage.ts`);
the backend only needs to classify PDFs and enforce the minimum description length.
"""

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


def word_count(text: str | None) -> int:
    """Count words the same way the intake rule does."""
    return len((text or "").split())
