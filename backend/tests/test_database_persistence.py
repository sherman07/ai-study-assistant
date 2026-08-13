import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from backend.app import app
from backend.core.database import SynapseDataApiClient


class SynapseDataApiClientTests(unittest.TestCase):
    def sample_identity(self):
        return {
            "auth_provider": "local_demo",
            "auth_subject": "acct_test",
            "email": "student@example.com",
            "display_name": "Student Example",
            "auth_mode": "local_demo",
            "role": "student",
            "metadata": {"client_id": "client_test"},
        }

    def sample_result(self):
        return {
            "title": "Stored Study Notes",
            "summary": "# Overview\n\nStored generated notes with [[VISUAL:0]].",
            "sections": {"Overview": "Stored generated notes with [[VISUAL:0]]."},
            "visual_gallery": [{"index": 0, "url": "http://127.0.0.1:8001/assets/visuals/table.png"}],
            "source_fingerprint": "fingerprint-1",
        }

    def test_unconfigured_client_skips_without_network_call(self):
        client = SynapseDataApiClient(base_url="http://127.0.0.1:3001", internal_token="")
        self.assertEqual(
            client.upsert_generated_content(self.sample_identity(), self.sample_result(), "client-fingerprint"),
            {},
        )

    def test_generated_content_mirror_uses_internal_api(self):
        client = SynapseDataApiClient(base_url="http://data-api.test", internal_token="test-token")
        with patch.object(client, "_request", return_value={
            "ok": True,
            "database_record": {"id": "content_1", "source_fingerprint": "fingerprint-1"},
        }) as request_mock:
            record = client.upsert_generated_content(
                self.sample_identity(),
                self.sample_result(),
                "client-fingerprint",
            )

        self.assertEqual(record["id"], "content_1")
        method, path, payload = request_mock.call_args.args
        self.assertEqual(method, "POST")
        self.assertEqual(path, "/api/generated-content")
        self.assertEqual(payload["identity"]["auth_subject"], "acct_test")
        self.assertEqual(payload["result"]["source_fingerprint"], "fingerprint-1")

    def test_content_history_endpoint_keeps_compatible_shape(self):
        class FakeDataApi:
            def list_generated_content(self, identity, limit=50):
                return [{"id": "content_1", "title": "Stored Study Notes"}]

        with patch("backend.app.synapse_database", FakeDataApi()):
            response = TestClient(app).get(
                "/content/history",
                headers={"X-Synapse-Client-Id": "client_test"},
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["items"][0]["title"], "Stored Study Notes")

    def test_content_history_error_does_not_expose_data_api_details(self):
        class FailingDataApi:
            def list_generated_content(self, identity, limit=50):
                raise RuntimeError("private database DSN and token")

        with patch("backend.app.synapse_database", FailingDataApi()):
            response = TestClient(app).get(
                "/content/history",
                headers={"X-Synapse-Client-Id": "client_test"},
            )

        self.assertEqual(response.status_code, 500)
        self.assertEqual(
            response.json(),
            {"error": "Could not load generated content history right now."},
        )
        self.assertNotIn("private database", response.text)

    def test_content_read_and_delete_errors_do_not_expose_data_api_details(self):
        class FailingDataApi:
            def get_generated_content(self, identity, content_id):
                raise RuntimeError("private database DSN and token")

            def delete_generated_content(self, identity, content_id):
                raise RuntimeError("private database DSN and token")

        with patch("backend.app.synapse_database", FailingDataApi()):
            read_response = TestClient(app).get(
                "/content/content_test",
                headers={"X-Synapse-Client-Id": "client_test"},
            )
            delete_response = TestClient(app).delete(
                "/content/content_test",
                headers={"X-Synapse-Client-Id": "client_test"},
            )

        self.assertEqual(read_response.status_code, 500)
        self.assertEqual(
            read_response.json(),
            {"error": "Could not load generated content right now."},
        )
        self.assertEqual(delete_response.status_code, 500)
        self.assertEqual(
            delete_response.json(),
            {"error": "Could not delete generated content right now."},
        )
        self.assertNotIn("private database", read_response.text + delete_response.text)


if __name__ == "__main__":
    unittest.main()
