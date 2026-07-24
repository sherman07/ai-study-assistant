import asyncio
import json
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from fastapi.testclient import TestClient

from backend import app as backend_app_module
from backend.app import app
from backend.core import config as core_config


class BroadcastModeApiTests(unittest.TestCase):
    def test_app_and_package_config_share_provider_context(self):
        """Guard against dual imports of core.config splitting ContextVars."""
        import core.config as app_side_config

        self.assertIs(
            app_side_config.REQUEST_AI_TEXT_PROVIDER,
            core_config.REQUEST_AI_TEXT_PROVIDER,
            "app `core.config` and package `backend.core.config` must share provider context",
        )
        self.assertIs(
            app_side_config.active_text_provider,
            core_config.active_text_provider,
        )
    def test_realtime_session_does_not_duplicate_long_script_context(self):
        long_script = "Opening\n" + ("Generated teaching sentence. " * 1400) + "\nFinal generated chapter."
        instructions = backend_app_module.build_broadcast_realtime_instructions(
            title="Long Broadcast",
            script=long_script,
            speaker_instructions="Speak clearly.",
            sections=[{"title": "Opening", "start": 0, "text": "Generated teaching sentence."}],
        )

        self.assertNotIn("Generated teaching sentence.", instructions)
        self.assertNotIn("Final generated chapter.", instructions)
        self.assertIn("browser will provide the exact generated broadcast text", instructions)

    def test_generate_requires_generated_synapse_content(self):
        with (
            patch("backend.app.require_text_ai"),
            patch("backend.app.generate_chat", side_effect=AssertionError("model should not be called without generated content")),
        ):
            response = TestClient(app).post("/broadcast/generate", json={"title": "PSYCH 109"})

        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.json())

    def test_generate_prompt_uses_actual_generated_outputs(self):
        captured = {}

        def fake_generate_chat(messages, **kwargs):
            prompt = messages[-1]["content"]
            captured["prompt"] = prompt
            captured["kwargs"] = kwargs
            self.assertIn("Generated Synapse content package", prompt)
            self.assertIn("Rovee-Collier", prompt)
            self.assertIn("mobile conjugate reinforcement", prompt)
            self.assertIn("Quiz/exam material already generated", prompt)
            self.assertIn("Mind map already generated", prompt)
            self.assertIn("Do not create a generic podcast", prompt)
            return json.dumps({
                "broadcastTitle": "Infant Memory Broadcast",
                "broadcastScript": "Opening\nToday we connect infant memory evidence to exam reasoning.",
                "speakerInstructions": "Speak calmly.",
                "estimatedDuration": "3:00",
                "sections": [
                    {
                        "id": "opening",
                        "title": "Opening",
                        "start": 0,
                        "speaker": "Narrator",
                        "text": "Today we connect Rovee-Collier evidence to exam reasoning.",
                        "sourceReference": "Generated section: Rovee-Collier",
                    },
                    {
                        "id": "big_picture",
                        "title": "Big picture",
                        "start": 30,
                        "speaker": "Narrator",
                        "text": "The mobile conjugate reinforcement task shows retention through behaviour.",
                        "sourceReference": "Generated notes",
                    },
                    {
                        "id": "core_ideas",
                        "title": "Core ideas",
                        "start": 70,
                        "speaker": "Narrator",
                        "text": "Connect the method, result, and exam interpretation.",
                        "sourceReference": "Quiz material",
                    },
                    {
                        "id": "quick_recap",
                        "title": "Quick recap",
                        "start": 130,
                        "speaker": "Narrator",
                        "text": "Remember method, evidence, interpretation, and common mistake.",
                        "sourceReference": "Flashcards",
                    },
                ],
                "keyMoments": [{"start": 0, "title": "Opening", "summary": "Infant memory evidence"}],
                "qualityChecks": {
                    "usesActualGeneratedContent": True,
                    "avoidsGenericTopicOnly": True,
                    "soundsNaturalWhenSpoken": True,
                    "usefulForStudent": True,
                    "explainsInsteadOfOnlySummarising": True,
                    "hasClearStructureAndTransitions": True,
                },
            })

        payload = {
            "title": "PSYCH 109",
            "summary": "Rovee-Collier studied infant memory with a mobile conjugate reinforcement task.",
            "sections": {
                "Rovee-Collier": "Infants kicked to move a mobile; later kicking showed retention.",
            },
            "studyTools": {
                "quiz": {
                    "questions": [
                        {
                            "question": "Why is kicking evidence of retention?",
                            "expected_answer": "It shows infants remembered the mobile contingency.",
                        }
                    ]
                },
                "mindMap": {
                    "branches": [
                        {"title": "Memory evidence", "summary": "Behaviour can reveal infant memory."}
                    ]
                },
            },
        }

        with patch("backend.app.require_text_ai"), patch("backend.app.generate_chat", side_effect=fake_generate_chat):
            result = asyncio.run(backend_app_module.generate_broadcast_mode(payload))

        self.assertNotIn("error", result)
        self.assertEqual(result["broadcastTitle"], "Infant Memory Broadcast")
        self.assertEqual(result["sections"][0]["title"], "Opening")
        self.assertEqual(result["ttsModel"], "gpt-4o-mini-tts")
        self.assertEqual(result["scriptMetadata"]["promptVersion"], backend_app_module.BROADCAST_SCRIPT_PROMPT_VERSION)
        self.assertTrue(result["scriptMetadata"]["sourceGrounded"])
        self.assertEqual(captured["kwargs"]["model"], backend_app_module.BROADCAST_SCRIPT_MODEL)

    def test_generate_forces_openai_provider_for_broadcast_script(self):
        providers = []

        def fake_generate_chat(messages, **kwargs):
            providers.append(backend_app_module.active_text_provider())
            return json.dumps({
                "broadcastTitle": "Source Broadcast",
                "broadcastScript": "Opening\nThis uses the generated source.",
                "sections": [
                    {"title": "Opening", "start": 0, "speaker": "Narrator", "text": "This uses the generated source."},
                    {"title": "Big picture", "start": 30, "speaker": "Narrator", "text": "This explains the generated source."},
                    {"title": "Core ideas", "start": 70, "speaker": "Narrator", "text": "This connects the generated source."},
                    {"title": "Quick recap", "start": 120, "speaker": "Narrator", "text": "This recaps the generated source."},
                ],
            })

        with (
            # Patch the shared config module (app and package imports must be one object).
            patch.object(core_config, "AI_TEXT_PROVIDER", "gemini"),
            patch("backend.app.require_text_ai"),
            patch("backend.app.generate_chat", side_effect=fake_generate_chat),
        ):
            result = asyncio.run(backend_app_module.generate_broadcast_mode({
                "title": "Provider test",
                "summary": "Generated Synapse notes with enough content to produce a broadcast script. " * 8,
            }))
            # Assert while the deployment provider is still patched to gemini: the
            # request-scoped OpenAI override must reset after generate returns.
            self.assertNotIn("error", result)
            self.assertEqual(providers, ["openai"])
            self.assertEqual(core_config.active_text_provider(), "gemini")
            self.assertEqual(backend_app_module.active_text_provider(), "gemini")

    def test_tts_uses_openai_speech_model_and_writes_asset(self):
        class FakeSpeech:
            def __init__(self):
                self.calls = []

            def create(self, **kwargs):
                self.calls.append(kwargs)
                return SimpleNamespace(content=b"fake-mp3")

        fake_speech = FakeSpeech()
        fake_client = SimpleNamespace(audio=SimpleNamespace(speech=fake_speech))

        with tempfile.TemporaryDirectory() as temp_dir:
            with (
                patch("backend.app.client", fake_client),
                patch("backend.app.has_openai", return_value=True),
                # require_openai_api() is the gate used by TTS generation.
                patch("backend.app.require_openai_api"),
                patch("backend.app.RUNTIME_ASSETS_DIR", backend_app_module.Path(temp_dir)),
                patch("backend.app.PUBLIC_BACKEND_BASE_URL", "http://127.0.0.1:8001"),
            ):
                result = asyncio.run(backend_app_module.generate_broadcast_tts({
                    "broadcastScript": "Opening\nThis is a source-grounded broadcast script.",
                    "speakerInstructions": "Speak warmly.",
                }))

        self.assertIsInstance(result, dict)
        self.assertNotIn("error", result)
        self.assertTrue(result["audioUrl"].endswith(".mp3"))
        self.assertEqual(fake_speech.calls[0]["model"], "gpt-4o-mini-tts")
        self.assertEqual(fake_speech.calls[0]["instructions"], "Speak warmly.")

    def test_realtime_call_uses_openai_realtime_model_and_same_voice(self):
        captured = {}

        def fake_post(url, headers=None, files=None, timeout=None):
            captured["url"] = url
            captured["headers"] = headers or {}
            captured["files"] = files or {}
            captured["timeout"] = timeout
            return SimpleNamespace(
                status_code=200,
                text="v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=Synapse\r\n",
                json=lambda: {},
            )

        with (
            patch("backend.app.require_openai_api"),
            patch("backend.app.OPENAI_API_KEY", "sk-test"),
            patch("backend.app.requests.post", side_effect=fake_post),
        ):
            response = TestClient(app).post(
                "/broadcast/realtime-call",
                data={
                    "sdp": "v=0\r\n",
                    "title": "Infant Memory Broadcast",
                    "broadcast_script": "Opening\nToday we explain the generated Synapse notes.",
                    "speaker_instructions": "Speak warmly and clearly.",
                    "sections": json.dumps([{"title": "Opening", "start": 0, "text": "Today we explain."}]),
                    # Chapter seeking can land at a fractional elapsed position.
                    # The API must accept it instead of returning FastAPI's 422
                    # validation error before it can create a realtime call.
                    "start_seconds": "3.5",
                    "rate": "1x",
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["content-type"].split(";")[0], "application/sdp")
        self.assertEqual(captured["url"], "https://api.openai.com/v1/realtime/calls")
        self.assertEqual(captured["headers"]["Authorization"], "Bearer sk-test")
        session = json.loads(captured["files"]["session"][1])
        self.assertEqual(session["model"], backend_app_module.BROADCAST_REALTIME_MODEL)
        self.assertEqual(session["output_modalities"], ["audio"])
        self.assertEqual(session["audio"]["output"]["voice"], backend_app_module.REALTIME_VOICE)
        self.assertIn("Infant Memory Broadcast", session["instructions"])
        self.assertNotIn("Today we explain the generated Synapse notes", session["instructions"])
        self.assertIn("browser will provide the exact generated broadcast text", session["instructions"])
        self.assertIn("0:03", session["instructions"])

    def test_realtime_call_rejects_missing_script(self):
        with patch("backend.app.requests.post", side_effect=AssertionError("Realtime should not be called without a script")):
            response = TestClient(app).post(
                "/broadcast/realtime-call",
                data={"sdp": "v=0\r\n", "broadcast_script": ""},
            )

        self.assertEqual(response.status_code, 400)
        self.assertIn("broadcast script", response.json()["error"].lower())


if __name__ == "__main__":
    unittest.main()
