"""Sample profile metadata served by /api/meta."""

from __future__ import annotations

import json
from pathlib import Path

from app.config import BACKEND_DIR

SAMPLES_DIR = BACKEND_DIR / "samples"


def sample_description(name: str, form: dict) -> str:
    """A natural-language description for a sample profile.

    The composer shows this text when a sample is chosen, so the user can still edit it.
    """
    degree = form.get("target_degree") or "a master's"
    fields = ", ".join(form.get("target_fields") or []) or "my field"
    countries = ", ".join(form.get("target_countries") or []) or "my target countries"
    budget = form.get("budget_inr_per_year")
    budget_text = f" My budget is about INR {int(budget):,} per year." if budget else ""
    return (
        f"Sample profile: {name.title()}. I want {degree} in {fields} in {countries}."
        f"{budget_text}"
    )


def load_samples() -> list[dict]:
    """Read every sample folder that has a form.json."""
    if not SAMPLES_DIR.exists():
        return []
    samples: list[dict] = []
    for folder in sorted(SAMPLES_DIR.iterdir()):
        form_path = folder / "form.json"
        if not folder.is_dir() or not form_path.exists():
            continue
        try:
            form = json.loads(form_path.read_text())
        except (OSError, json.JSONDecodeError):
            continue
        samples.append(
            {
                "name": folder.name,
                "label": folder.name.title(),
                "description": sample_description(folder.name, form),
                "form": form,
            }
        )
    return samples
