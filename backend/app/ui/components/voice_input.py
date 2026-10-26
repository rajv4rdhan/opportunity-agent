"""Speech-to-text microphone bound to any text field (composer and clarifier)."""

from __future__ import annotations

import json
from collections.abc import Callable

from nicegui import ui

LANGUAGES = {
    "en-IN": "English (India)",
    "en-US": "English (US)",
    "hi-IN": "Hindi",
}


class VoiceInput:
    """A mic button that appends browser speech recognition text to a textarea."""

    _active_by_client: dict[str, "VoiceInput"] = {}

    def __init__(
        self,
        target_textarea,
        lang_select: bool = True,
        on_transcript: Callable[[], None] | None = None,
        status_target=None,
    ) -> None:
        self.target = target_textarea
        self.on_transcript = on_transcript
        self.client_id = ui.context.client.id
        self.lang = "en-IN"
        self.listening = False
        self._base = ""
        self._final = ""

        with ui.row().classes("items-center gap-1 no-wrap"):
            self.button = (
                ui.button(icon="mic", on_click=self.toggle)
                .props("flat round dense")
                .classes("ss-mic")
                .tooltip("Speak (browser speech recognition)")
            )
            if lang_select:
                self.lang_widget = (
                    ui.select(LANGUAGES, value=self.lang, on_change=self._set_lang)
                    .props("dense borderless options-dense")
                    .classes("w-28")
                    .tooltip("Spoken language")
                )
            else:
                self.lang_widget = None
        self.status = status_target or ui.label("").classes("ss-live-text")

        ui.on("ss_voice", self._on_result)
        ui.on("ss_voice_end", self._on_end)
        ui.on("ss_voice_error", self._on_error)
        ui.timer(1.0, self._check_supported, once=True)

    def _set_lang(self, event) -> None:
        self.lang = event.value or "en-IN"

    async def _check_supported(self) -> None:
        try:
            supported = await ui.run_javascript(
                "Boolean(window.ssVoice && window.ssVoice.supported())", timeout=3
            )
        except Exception:  # noqa: BLE001 - a transient websocket issue is not fatal
            return
        if not supported:
            self.button.disable()
            self.button.tooltip("Voice input works in Chrome or Edge")

    def _payload(self, event) -> dict:
        if isinstance(event.args, dict):
            return event.args
        if isinstance(event.args, list) and event.args and isinstance(event.args[0], dict):
            return event.args[0]
        return {}

    def _active(self) -> bool:
        return self._active_by_client.get(self.client_id) is self

    async def toggle(self) -> None:
        if self.listening:
            await self.stop()
            return
        other = self._active_by_client.get(self.client_id)
        if other is not None and other is not self:
            await other.stop()
        self._base = (self.target.value or "").rstrip()
        self._final = ""
        self._active_by_client[self.client_id] = self
        self.listening = True
        self.button.classes(add="is-listening")
        self.status.text = "Listening…"
        try:
            started = await ui.run_javascript(
                f"window.ssVoice && window.ssVoice.start({json.dumps(self.lang)})", timeout=3
            )
        except Exception as error:  # noqa: BLE001
            self._reset()
            ui.notify(f"Could not start the microphone: {error}", type="negative")
            return
        if not started:
            self._reset()
            ui.notify("Voice input works in Chrome or Edge", type="warning")

    async def stop(self) -> None:
        try:
            await ui.run_javascript("window.ssVoice && window.ssVoice.stop()", timeout=2)
        except Exception:  # noqa: BLE001 - stopping is best effort
            pass
        self._reset()

    def _reset(self) -> None:
        self.listening = False
        self.button.classes(remove="is-listening")
        self.status.text = ""
        if self._active():
            self._active_by_client.pop(self.client_id, None)

    def _on_result(self, event) -> None:
        if not self.listening or not self._active():
            return
        payload = self._payload(event)
        final = str(payload.get("final") or "").strip()
        interim = str(payload.get("interim") or "").strip()
        if final:
            base = self._base
            separator = " " if base and not base.endswith((" ", "\n")) else ""
            self.target.value = f"{base}{separator}{final}".strip()
            self._final = final
            if self.on_transcript:
                self.on_transcript()
        self.status.text = interim or ("Listening…" if not final else "…")

    def _on_end(self, _event) -> None:
        if not self._active():
            return
        self.listening = False
        self.button.classes(remove="is-listening")
        self.status.text = ""
        self._active_by_client.pop(self.client_id, None)

    def _on_error(self, event) -> None:
        if not self._active():
            return
        payload = self._payload(event)
        message = str(payload.get("error") or "Voice input failed")
        self._reset()
        ui.notify(message, type="warning")
