"""Production-build browser journeys for the most important Synapse scenes."""

from __future__ import annotations

from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import unittest

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as conditions
from selenium.webdriver.support.ui import WebDriverWait


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
DIST_ROOT = REPOSITORY_ROOT / "dist"


class QuietStaticFileHandler(SimpleHTTPRequestHandler):
    def log_message(self, _format: str, *_args: object) -> None:
        return


class SynapseSceneJourneyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        if not DIST_ROOT.is_dir():
            raise RuntimeError("Selenium journeys require a production build. Run npm run build first.")

        handler = partial(QuietStaticFileHandler, directory=str(DIST_ROOT))
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
        cls.server_thread = Thread(target=cls.server.serve_forever, daemon=True)
        cls.server_thread.start()
        cls.base_url = f"http://127.0.0.1:{cls.server.server_port}"

        options = Options()
        options.add_argument("--headless=new")
        options.add_argument("--window-size=1440,960")
        options.add_argument("--disable-gpu")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        cls.driver = webdriver.Chrome(options=options)
        cls.wait = WebDriverWait(cls.driver, 20)

    @classmethod
    def tearDownClass(cls) -> None:
        cls.driver.quit()
        cls.server.shutdown()
        cls.server.server_close()
        cls.server_thread.join(timeout=5)

    def test_workspace_loads_without_a_framework_error_screen(self) -> None:
        self.driver.get(f"{self.base_url}/frontend/index.html")
        root = self.wait.until(conditions.presence_of_element_located((By.ID, "root")))
        self.assertTrue(root.text.strip(), "the workspace root should render meaningful content")
        self.assertFalse(self.driver.find_elements(By.CSS_SELECTOR, "vite-error-overlay"))

    def test_focus_room_can_enter_a_session_and_return_to_setup(self) -> None:
        self.driver.get(f"{self.base_url}/frontend/focus-room.html#/focus-room")
        self.driver.execute_script(
            "window.localStorage.clear(); window.SYNAPSE_FOCUS_ROOM_ENABLED = true;"
        )
        self.driver.refresh()

        surface = self.wait.until(conditions.presence_of_element_located((By.ID, "focusRoomSurface")))
        self.wait.until(conditions.presence_of_element_located((By.CSS_SELECTOR, "[data-focus-setup='true']")))
        self.assertEqual(surface.get_attribute("data-focus-room-view"), "setup")

        self.wait.until(conditions.element_to_be_clickable((By.CSS_SELECTOR, "[data-focus-enter='true']"))).click()
        self.wait.until(
            lambda driver: driver.find_element(By.ID, "focusRoomSurface").get_attribute("data-focus-room-view")
            == "session"
        )
        self.wait.until(conditions.presence_of_element_located((By.CSS_SELECTOR, ".focus-room-header")))

        self.wait.until(
            conditions.element_to_be_clickable((By.CSS_SELECTOR, 'button[aria-label="Open room settings"]'))
        ).click()
        self.wait.until(
            conditions.element_to_be_clickable((By.CSS_SELECTOR, "[data-focus-return-setup='true']"))
        ).click()
        self.wait.until(
            lambda driver: driver.find_element(By.ID, "focusRoomSurface").get_attribute("data-focus-room-view")
            == "setup"
        )
