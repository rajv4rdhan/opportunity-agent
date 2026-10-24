"""NiceGUI page registration. Importing a page module registers its @ui.page."""


def register_pages() -> None:
    from app.ui.pages import home  # noqa: F401
