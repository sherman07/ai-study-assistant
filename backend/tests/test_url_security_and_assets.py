"""Saturday reliability guards for URL ingestion SSRF and runtime asset paths."""

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from backend import app as backend_app_module
from backend.app import app
from backend.core import url_security
from backend.core import visual_assets


class UrlSecurityContractTests(unittest.TestCase):
    def test_rejects_non_http_schemes_and_credentials(self):
        with self.assertRaises(ValueError):
            url_security.normalize_public_http_url("file:///etc/passwd", "source URL")
        with self.assertRaises(ValueError):
            url_security.normalize_public_http_url("ftp://example.com/notes.pdf", "source URL")
        with self.assertRaises(ValueError):
            url_security.normalize_public_http_url(
                "https://user:secret@example.com/notes.pdf",
                "source URL",
            )

    def test_rejects_localhost_and_private_literal_hosts(self):
        for blocked in (
            "http://localhost/notes",
            "http://127.0.0.1/notes",
            "http://10.0.0.8/notes",
            "http://192.168.1.20/notes",
            "http://[::1]/notes",
            "http://metadata.local/notes",
        ):
            with self.assertRaises(ValueError, msg=blocked):
                url_security.normalize_public_http_url(blocked, "source URL")

    def test_rejects_hostname_that_resolves_to_private_address(self):
        with patch.object(
            url_security,
            "_resolved_addresses",
            return_value={"127.0.0.1"},
        ):
            with self.assertRaises(ValueError):
                url_security.normalize_public_http_url("https://public.example/notes", "source URL")

    def test_allows_public_https_url_when_resolution_is_public(self):
        with patch.object(
            url_security,
            "_resolved_addresses",
            return_value={"93.184.216.34"},
        ):
            normalized = url_security.normalize_public_http_url(
                "https://example.com/lecture.pdf",
                "source URL",
            )
        self.assertEqual(normalized, "https://example.com/lecture.pdf")


class RuntimeAssetPathSafetyTests(unittest.TestCase):
    def test_runtime_asset_helper_blocks_path_traversal(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            (root / "visuals").mkdir()
            (root / "visuals" / "safe.png").write_bytes(b"png")
            outside = Path(temp_dir).parent / "outside-secret.txt"
            outside.write_text("secret", encoding="utf-8")

            with patch.object(visual_assets, "RUNTIME_ASSETS_DIR", root):
                safe = visual_assets.runtime_asset_path_for_relative_path("visuals/safe.png")
                self.assertEqual(safe, (root / "visuals" / "safe.png").resolve())
                self.assertIsNone(
                    visual_assets.runtime_asset_path_for_relative_path("../outside-secret.txt")
                )
                self.assertIsNone(
                    visual_assets.runtime_asset_path_for_relative_path("visuals/../../outside-secret.txt")
                )

    def test_asset_routes_return_404_for_traversal_attempts(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            (root / "visuals").mkdir()
            with (
                patch.object(backend_app_module, "RUNTIME_ASSETS_DIR", root),
                patch.object(visual_assets, "RUNTIME_ASSETS_DIR", root),
            ):
                client = TestClient(app)
                self.assertEqual(client.get("/assets/../app.py").status_code, 404)
                self.assertEqual(client.get("/assets/visuals/../../app.py").status_code, 404)
                self.assertEqual(client.get("/assets/visuals/%2e%2e/%2e%2e/app.py").status_code, 404)


if __name__ == "__main__":
    unittest.main()
