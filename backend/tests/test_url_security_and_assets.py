"""Saturday reliability: SSRF URL normalisation and runtime asset path safety."""

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from backend.app import app
from backend.core import visual_assets
from backend.core.url_security import normalize_public_http_url


class UrlSecurityTests(unittest.TestCase):
    def test_rejects_loopback_and_private_literals(self):
        cases = [
            "http://127.0.0.1/secret",
            "http://localhost/admin",
            "http://10.0.0.5/internal",
            "http://192.168.1.10/notes",
            "http://[::1]/",
            "file:///etc/passwd",
            "ftp://example.com/file",
            "https://user:pass@example.com/path",
        ]
        for url in cases:
            with self.subTest(url=url):
                with self.assertRaises(ValueError):
                    normalize_public_http_url(url, "source URL")

    def test_accepts_public_https_url(self):
        with patch("backend.core.url_security._resolved_addresses", return_value={"93.184.216.34"}):
            normalised = normalize_public_http_url("https://example.com/lecture.pdf", "source URL")
        self.assertEqual(normalised, "https://example.com/lecture.pdf")

    def test_rejects_hostname_that_resolves_to_private_ip(self):
        with patch("backend.core.url_security._resolved_addresses", return_value={"10.1.2.3"}):
            with self.assertRaises(ValueError):
                normalize_public_http_url("https://evil.example/notes", "source URL")

    def test_private_urls_only_when_explicitly_allowed(self):
        with patch.dict("os.environ", {"SYNAPSE_ALLOW_PRIVATE_SOURCE_URLS": "true"}):
            normalised = normalize_public_http_url("http://127.0.0.1:9000/local.pdf", "source URL")
        self.assertEqual(normalised, "http://127.0.0.1:9000/local.pdf")


class RuntimeAssetPathSafetyTests(unittest.TestCase):
    def test_relative_path_rejects_traversal_outside_runtime_root(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            (root / "visuals").mkdir()
            (root / "visuals" / "ok.png").write_bytes(b"png")
            outside = root.parent / "outside-secret.txt"
            outside.write_text("secret", encoding="utf-8")

            with patch.object(visual_assets, "RUNTIME_ASSETS_DIR", root):
                safe = visual_assets.runtime_asset_path_for_relative_path("visuals/ok.png")
                self.assertEqual(safe, (root / "visuals" / "ok.png").resolve())

                self.assertIsNone(
                    visual_assets.runtime_asset_path_for_relative_path("../outside-secret.txt")
                )
                self.assertIsNone(
                    visual_assets.runtime_asset_path_for_relative_path("visuals/../../outside-secret.txt")
                )
                self.assertIsNone(visual_assets.runtime_asset_path_for_relative_path(""))

    def test_assets_route_returns_404_for_traversal(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            (root / "visuals").mkdir()
            outside = root.parent / "leak.txt"
            outside.write_text("should-not-leak", encoding="utf-8")

            with patch("backend.app.RUNTIME_ASSETS_DIR", root):
                with patch.object(visual_assets, "RUNTIME_ASSETS_DIR", root):
                    response = TestClient(app).get("/assets/../leak.txt")
                    self.assertEqual(response.status_code, 404)
                    response = TestClient(app).get("/assets/visuals/../../leak.txt")
                    self.assertEqual(response.status_code, 404)


if __name__ == "__main__":
    unittest.main()
