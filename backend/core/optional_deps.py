"""Optional third-party imports used by analysis and auth routes."""

try:
    import certifi
except Exception:
    certifi = None

try:
    from bs4 import BeautifulSoup
except Exception:
    BeautifulSoup = None

try:
    from docx import Document
except Exception:
    Document = None

try:
    from youtube_transcript_api import YouTubeTranscriptApi
except Exception:
    YouTubeTranscriptApi = None

try:
    import yt_dlp
except Exception:
    yt_dlp = None

try:
    import cv2
except Exception:
    cv2 = None

try:
    import fitz  # PyMuPDF: used to render PDF pages as visual evidence
    try:
        # Keep recoverable MuPDF structure-tree warnings from flooding dev logs.
        # Python exceptions are still raised and handled by the PDF pipeline.
        fitz.TOOLS.mupdf_display_warnings(False)
        fitz.TOOLS.mupdf_display_errors(False)
    except Exception:
        pass
except Exception:
    fitz = None

try:
    from pptx import Presentation
except Exception:
    Presentation = None

try:
    import stripe
except Exception:
    stripe = None

