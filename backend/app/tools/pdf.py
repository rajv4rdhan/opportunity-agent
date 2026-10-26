"""PDF text extraction with a vision fallback for scanned documents."""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING

import pymupdf as fitz

if TYPE_CHECKING:
    from app.core.agent import AgentCtx

MIN_TEXT_CHARS = 200


def extract_text(path: Path) -> str:
    """Extract text from every page, keeping page markers for traceability."""
    document = fitz.open(path)
    try:
        pages = [f"--- page {number} ---\n{page.get_text()}" for number, page in enumerate(document, start=1)]
    finally:
        document.close()
    return "\n\n".join(pages).strip()


def render_pages(path: Path, limit: int = 3, dpi: int = 150) -> list[bytes]:
    """Render the first pages to PNG bytes for a vision model."""
    document = fitz.open(path)
    try:
        return [
            page.get_pixmap(dpi=dpi).tobytes("png")
            for _, page in zip(range(limit), document, strict=False)
        ]
    finally:
        document.close()


async def extract_document(ctx: "AgentCtx", path: Path) -> tuple[str, list[bytes] | None]:
    """Return (text, images). Images are set only when the PDF looks scanned."""
    text = extract_text(path)
    if len(text) >= MIN_TEXT_CHARS:
        return text, None
    images = render_pages(path)
    await ctx.emit(
        "fallback",
        f"Scanned PDF {path.name} has little text → sending {len(images)} page image(s) to the vision model",
        file=path.name,
        chars=len(text),
        pages=len(images),
    )
    return text, images
