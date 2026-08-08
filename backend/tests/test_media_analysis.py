"""Tests for audio/video media analysis domain + application wiring."""

from __future__ import annotations

import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock

from backend.application.media_transcription import (
    build_uploaded_media_source,
    transcribe_media_file,
)
from backend.domain.media_analysis import (
    TRANSCRIPT_STATUS_OK,
    TRANSCRIPT_STATUS_TOO_LARGE,
    assess_transcript_quality,
    build_media_analysis_brief,
    is_media_upload,
    media_kind_from_name_and_type,
    media_size_warning,
)


class MediaAnalysisDomainTests(unittest.TestCase):
    def test_classifies_audio_and_video(self):
        self.assertEqual(media_kind_from_name_and_type("lecture.mp3", ""), "audio")
        self.assertEqual(media_kind_from_name_and_type("clip.mov", "video/quicktime"), "video")
        self.assertTrue(is_media_upload("talk.wav", "audio/wav"))
        self.assertFalse(is_media_upload("notes.pdf", "application/pdf"))

    def test_size_warning_and_transcript_quality(self):
        warning = media_size_warning(30 * 1024 * 1024, 24 * 1024 * 1024, 100 * 1024 * 1024)
        self.assertIn("transcription works best", warning.lower())
        quality = assess_transcript_quality("x" * 200)
        self.assertEqual(quality["status"], TRANSCRIPT_STATUS_OK)
        self.assertTrue(quality["usable"])
        oversized = assess_transcript_quality("too large", byte_size=30 * 1024 * 1024, max_audio_bytes=24 * 1024 * 1024)
        self.assertEqual(oversized["status"], TRANSCRIPT_STATUS_TOO_LARGE)

    def test_analysis_brief_includes_study_instructions(self):
        quality = assess_transcript_quality("Photosynthesis converts light energy into chemical energy for plants. " * 3)
        brief = build_media_analysis_brief(
            display_name="bio-lecture.mp3",
            media_kind="audio",
            transcript=quality and "Photosynthesis converts light energy into chemical energy for plants. " * 3,
            quality=quality,
            frame_count=0,
        )
        self.assertIn("SOURCE MEDIA (AUDIO)", brief)
        self.assertIn("tutor-style notes", brief)
        self.assertIn("Photosynthesis converts light energy", brief)


class MediaTranscriptionApplicationTests(unittest.TestCase):
    def test_transcribe_media_file_uses_openai_client(self):
        client = MagicMock()
        client.audio.transcriptions.create.return_value = SimpleNamespace(
            text="The mitochondria is the powerhouse of the cell. " * 4
        )
        result = transcribe_media_file(
            "cell.mp3",
            b"fake-audio-bytes",
            client=client,
            primary_model="gpt-4o-mini-transcribe",
            max_audio_bytes=24 * 1024 * 1024,
            require_openai_api=lambda: None,
        )
        self.assertEqual(result["model"], "gpt-4o-mini-transcribe")
        self.assertTrue(result["quality"]["usable"])
        self.assertIn("mitochondria", result["text"])

    def test_build_uploaded_media_source_returns_meta(self):
        client = MagicMock()
        client.audio.transcriptions.create.return_value = SimpleNamespace(
            text="Gradient descent updates parameters using the derivative of the loss. " * 3
        )
        parts, meta = build_uploaded_media_source(
            "ml.mp4",
            "video/mp4",
            b"video-bytes",
            has_openai=True,
            client=client,
            primary_model="gpt-4o-mini-transcribe",
            max_audio_bytes=24 * 1024 * 1024,
            require_openai_api=lambda: None,
            extract_video_frames=lambda *_args, **_kwargs: [],
            truncate_text=lambda text: text,
            detect_title=lambda _sample: "Gradient Descent",
            sha256_bytes=lambda data: "abc123",
            sha256_text=lambda text: "def456",
        )
        self.assertEqual(meta["media_kind"], "video")
        self.assertEqual(meta["transcript_status"], TRANSCRIPT_STATUS_OK)
        self.assertTrue(meta["transcript_usable"])
        self.assertEqual(meta["title_candidate"], "Gradient Descent")
        self.assertIn("SOURCE MEDIA (VIDEO)", parts[0]["text"])


if __name__ == "__main__":
    unittest.main()
