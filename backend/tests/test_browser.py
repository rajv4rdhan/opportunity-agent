"""Browser session ownership: local Chromium is shared, remote sessions are not."""

from app.tools import browser


class FakeContext:
    def __init__(self) -> None:
        self.closed = False

    async def close(self) -> None:
        self.closed = True


class FakeBrowser:
    def __init__(self) -> None:
        self.closed = False

    async def close(self) -> None:
        self.closed = True


async def test_close_browser_keeps_shared_local_chromium():
    shared = FakeBrowser()
    context = FakeContext()
    browser._sessions["run1"] = browser.BrowserSession(browser=shared, context=context)

    await browser.close_browser("run1")

    assert context.closed is True
    assert shared.closed is False
    assert "run1" not in browser._sessions


async def test_close_browser_deletes_kernel_session(monkeypatch):
    context = FakeContext()
    remote = FakeBrowser()
    deleted: list[str] = []
    closed: list[bool] = []

    class FakeBrowsers:
        async def delete_by_id(self, session_id: str) -> None:
            deleted.append(session_id)

    class FakeKernel:
        browsers = FakeBrowsers()

        async def close(self) -> None:
            closed.append(True)

    browser._sessions["run2"] = browser.BrowserSession(
        browser=remote,
        context=context,
        kernel=FakeKernel(),
        session_id="session-1",
        live_url="https://live.example",
    )

    await browser.close_browser("run2")

    assert context.closed is True
    assert deleted == ["session-1"]
    assert closed == [True]
    assert remote.closed is True
