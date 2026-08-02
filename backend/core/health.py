class HealthReporter:
    """Builds health endpoint payloads without tying route handlers to config details."""

    def __init__(self, namespace: dict):
        self.namespace = namespace

    def _get(self, name: str, default=None):
        return self.namespace.get(name, default)

    def _call(self, name: str, default=None):
        callback = self.namespace.get(name)
        if not callable(callback):
            return default
        try:
            return callback()
        except Exception:
            return default

    def _configured_secret(self, name: str) -> bool:
        """True when a secret-like setting is present and not an example placeholder."""
        value = self._get(name) or ""
        if not value:
            return False
        checker = self.namespace.get("is_placeholder_env_value")
        if callable(checker):
            try:
                return not checker(value)
            except Exception:
                return bool(value)
        return bool(value)

    def backend_status(self) -> dict:
        max_visual_images = self._get("MAX_VISUAL_IMAGES_PER_SOURCE")
        email_config_error = self._call("synapse_email_config_error", "not_available")
        return {
            "status": "ok",
            "api_key_loaded": bool(self._call("has_text_ai")),
            "text_provider": self._get("AI_TEXT_PROVIDER", "openai"),
            "openai_api_key_loaded": bool(self._call("has_openai")),
            "gemini_api_key_loaded": self._configured_secret("GEMINI_API_KEY"),
            "gemini_auth_mode": self._get("GEMINI_AUTH_MODE"),
            "gemini_configured": bool(self._call("gemini_request_is_configured")),
            "gemini_project_id_loaded": bool(self._get("GEMINI_PROJECT_ID")),
            "gemini_location": self._get("GEMINI_LOCATION"),
            "gemini_chat_model": self._get("GEMINI_CHAT_MODEL"),
            "active_chat_model": self._call("chat_model_for_active_provider", self._get("CHAT_MODEL")),
            "org_id_loaded": bool(self._get("OPENAI_ORG_ID")),
            "project_id_loaded": bool(self._get("OPENAI_PROJECT_ID")),
            "analysis_model": self._get("ANALYSIS_MODEL"),
            "chat_model": self._get("CHAT_MODEL"),
            "fallback_model": self._get("FALLBACK_MODEL"),
            "mindmap_model": self._get("MINDMAP_MODEL"),
            "title_model": self._get("TITLE_MODEL"),
            "transcribe_model": self._get("TRANSCRIBE_MODEL"),
            "realtime_model": self._get("REALTIME_MODEL"),
            "realtime_voice": self._get("REALTIME_VOICE"),
            "visual_image_guide_model": self._get("VISUAL_IMAGE_GUIDE_MODEL"),
            "visual_image_guide_size": self._get("VISUAL_IMAGE_GUIDE_SIZE"),
            "visual_image_guide_quality": self._get("VISUAL_IMAGE_GUIDE_QUALITY"),
            "openai_timeout_seconds": self._get("OPENAI_TIMEOUT_SECONDS"),
            "analysis_max_seconds": self._get("ANALYSIS_MAX_SECONDS"),
            "cache_version": self._get("CACHE_VERSION"),
            "data_api": "supabase",
            "public_backend_base_url": self._get("PUBLIC_BACKEND_BASE_URL"),
            "supabase_url_loaded": bool(self._get("SUPABASE_URL")),
            "supabase_anon_key_loaded": bool(self._get("SUPABASE_ANON_KEY")),
            "supabase_service_role_key_loaded": bool(self._get("SUPABASE_SERVICE_ROLE_KEY")),
            "supabase_auth_configured": all(
                bool(self._get(name))
                for name in ("SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY")
            ),
            "synapse_email_delivery_configured": email_config_error is None,
            "synapse_email_delivery_issue": email_config_error,
            "runtime_assets_dir": str(self._get("RUNTIME_ASSETS_DIR", "")),
            "tutor_web_research_enabled": self._get("ENABLE_TUTOR_WEB_RESEARCH"),
            "multi_source_digests_enabled": self._get("ENABLE_MULTI_SOURCE_DIGESTS"),
            "pdf_visual_extraction_enabled": self._get("ENABLE_PDF_VISUAL_EXTRACTION"),
            "embedded_youtube_sources_enabled": self._get("ENABLE_EMBEDDED_YOUTUBE_SOURCES"),
            "youtube_ytdlp_fallback_enabled": self._get("ENABLE_YOUTUBE_YTDLP_FALLBACK"),
            "max_visual_images_per_source": max_visual_images,
            "max_pdf_visual_candidates_per_source": self._get(
                "PDF_VISUAL_CANDIDATE_LIMIT",
                max_visual_images,
            ),
            "max_multi_source_visual_images": self._get("MAX_MULTI_SOURCE_VISUAL_IMAGES"),
            "multi_source_visual_gallery_limit": self._get("MULTISOURCE_VISUAL_GALLERY_LIMIT"),
            "multi_source_synthesis_part_tokens": self._get("MULTISOURCE_SYNTHESIS_PART_TOKENS"),
            "multi_source_connection_tokens": self._get("MULTISOURCE_CONNECTION_TOKENS"),
            "visual_argument_card_limit": self._get("VISUAL_ARGUMENT_CARD_LIMIT"),
            "visual_render_dpi": self._get("VISUAL_RENDER_DPI"),
            "pptx_slide_render_enabled": self._get("ENABLE_PPTX_SLIDE_RENDER"),
            "pptx_svg_fallback_render_enabled": self._get("ENABLE_PPTX_SVG_FALLBACK_RENDER"),
            "source_pptx_preview_render_enabled": self._get("ENABLE_SOURCE_PPTX_PREVIEW_RENDER"),
            "pptx_embedded_image_extraction_enabled": self._get("ENABLE_PPTX_EMBEDDED_IMAGE_EXTRACTION"),
            "source_pptx_server_renderer": bool(self._call("find_libreoffice_binary")),
            "source_pptx_local_app_fallback_enabled": self._get("ENABLE_LOCAL_PPTX_APP_RENDER"),
        }

    def openai_status(self, probe: bool = False) -> dict:
        try:
            self._get("require_text_ai", self._get("require_openai"))()
            payload = {
                "status": "ok",
                "probe": bool(probe),
                "text_provider": self._get("AI_TEXT_PROVIDER", "openai"),
                "model": self._get("CHAT_MODEL"),
                "fallback_model": self._get("FALLBACK_MODEL"),
                "org_id_loaded": bool(self._get("OPENAI_ORG_ID")),
                "project_id_loaded": bool(self._get("OPENAI_PROJECT_ID")),
            }
            if not probe:
                payload["reply"] = None
                payload["message"] = (
                    "Text AI credentials are configured. Add ?probe=true to run a live model check."
                )
                return payload

            messages = [{"role": "user", "content": "Reply with OK only."}]
            generate_chat = self._get("generate_chat")
            if callable(generate_chat):
                reply = generate_chat(messages, model=self._get("CHAT_MODEL"), temperature=0, max_tokens=5).strip()
            else:
                response = self._get("client").chat.completions.create(
                    model=self._get("CHAT_MODEL"),
                    messages=messages,
                    temperature=0,
                    max_tokens=5,
                )
                reply = (response.choices[0].message.content or "").strip()
            payload["reply"] = reply
            return payload
        except Exception as error:
            return {
                "status": "error",
                "probe": bool(probe),
                "message": str(error),
                "hint": (
                    "Check OPENAI_API_KEY, OPENAI_ORG_ID, OPENAI_PROJECT_ID, billing, "
                    "project access, and model access."
                ),
            }
