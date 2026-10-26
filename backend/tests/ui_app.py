"""Minimal NiceGUI entry point used by the user-fixture UI tests."""

import importlib

from fastapi import FastAPI
from nicegui import ui

# Reload page modules because NiceGUI clears its page registry between simulations.
for name in ("home", "run_detail", "runs"):
    module = importlib.import_module(f"app.ui.pages.{name}")
    importlib.reload(module)

ui.run_with(FastAPI())
