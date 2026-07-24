import unittest
from unittest.mock import patch

from backend import app as backend_app


VIDEO_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
GROUNDABLE_TRANSCRIPT = " ".join(
    [
        "The lesson defines acids as proton donors and bases as proton acceptors.",
        "A conjugate acid-base pair differs by one proton.",
        "The example compares hydrochloric acid with water and identifies the products.",
        "Students should distinguish acid strength from concentration before applying the equation.",
    ]
    * 3
)


class YouTubeSourceQualityTests(unittest.TestCase):
    def test_marks_meaningful_captions_as_usable_evidence(self):
        with (
            patch.object(backend_app, "fetch_youtube_metadata", return_value={"title": "Acids and Bases"}),
            patch.object(backend_app, "fetch_youtube_caption_transcript", return_value=GROUNDABLE_TRANSCRIPT),
            patch.object(backend_app, "yt_dlp", None),
        ):
            transcript, _, meta = backend_app.analyse_youtube_url(VIDEO_URL)

        self.assertEqual(meta["transcript_status"], "available")
        self.assertGreaterEqual(meta["transcript_characters"], 240)
        self.assertIn("conjugate acid-base pair", transcript)

    def test_rejects_metadata_only_youtube_as_note_evidence(self):
        with (
            patch.object(backend_app, "fetch_youtube_metadata", return_value={"title": "Acids and Bases"}),
            patch.object(backend_app, "fetch_youtube_caption_transcript", return_value="short caption"),
            patch.object(backend_app, "yt_dlp", None),
        ):
            transcript, _, meta = backend_app.analyse_youtube_url(VIDEO_URL)

        self.assertIn(backend_app.YOUTUBE_TRANSCRIPT_UNAVAILABLE_TEXT, transcript)
        self.assertEqual(meta["transcript_status"], "unavailable")
        self.assertEqual(meta["transcript_characters"], 0)

    def test_source_payload_keeps_transcript_status_for_the_viewer(self):
        meta = {
            "url": VIDEO_URL,
            "source_identity": "youtube:dQw4w9WgXcQ",
            "detected_title": "Acids and Bases",
            "content_hash": "content-hash",
            "transcript_status": "available",
            "transcript_characters": len(GROUNDABLE_TRANSCRIPT),
            "transcript_warning": "",
            "visual_parts": [],
        }
        with patch.object(backend_app, "analyse_youtube_url", return_value=(GROUNDABLE_TRANSCRIPT, [], meta)):
            _, source = backend_app.link_to_source_unit(VIDEO_URL)

        self.assertEqual(source["transcript_status"], "available")
        self.assertEqual(source["transcript_characters"], len(GROUNDABLE_TRANSCRIPT))


if __name__ == "__main__":
    unittest.main()
