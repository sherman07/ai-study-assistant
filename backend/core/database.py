import logging
from typing import Any, Dict, List, Optional

import requests

try:
    from core.config import (
        SYNAPSE_DATA_API_INTERNAL_URL,
        SYNAPSE_DATA_API_TIMEOUT_SECONDS,
        SYNAPSE_INTERNAL_API_TOKEN,
    )
except ModuleNotFoundError:
    from backend.core.config import (
        SYNAPSE_DATA_API_INTERNAL_URL,
        SYNAPSE_DATA_API_TIMEOUT_SECONDS,
        SYNAPSE_INTERNAL_API_TOKEN,
    )


logger = logging.getLogger(__name__)


class SynapseDataApiClient:
    """Persist generated study content through the Node/Supabase data API.

    FastAPI remains responsible for AI analysis. Persistence failures should not
    prevent the frontend from receiving generated notes.
    """

    def __init__(
        self,
        base_url: str = SYNAPSE_DATA_API_INTERNAL_URL,
        internal_token: str = SYNAPSE_INTERNAL_API_TOKEN,
        timeout_seconds: float = SYNAPSE_DATA_API_TIMEOUT_SECONDS,
    ):
        self.base_url = str(base_url or "").rstrip("/")
        self.internal_token = str(internal_token or "").strip()
        self.timeout_seconds = max(1.0, float(timeout_seconds or 5.0))
        self.session = requests.Session()

    def configured(self) -> bool:
        return bool(self.base_url and self.internal_token)

    def _headers(self) -> Dict[str, str]:
        return {
            "Content-Type": "application/json",
            "X-Synapse-Internal-Token": self.internal_token,
        }

    def _request(self, method: str, path: str, payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        if not self.configured():
            return {"ok": False, "skipped": True, "error": "Synapse data API internal token is not configured."}
        response = self.session.request(
            method,
            f"{self.base_url}{path}",
            json=payload or {},
            headers=self._headers(),
            timeout=self.timeout_seconds,
        )
        response.raise_for_status()
        data = response.json()
        return data if isinstance(data, dict) else {"ok": False, "error": "Data API returned a non-object payload."}

    def status(self) -> Dict[str, Any]:
        if not self.base_url:
            return {"ok": False, "configured": False, "error": "SYNAPSE_DATA_API_INTERNAL_URL is not configured."}
        try:
            response = self.session.get(f"{self.base_url}/health", timeout=self.timeout_seconds)
            data = response.json()
            return {
                "configured": self.configured(),
                "status_code": response.status_code,
                **(data if isinstance(data, dict) else {}),
            }
        except Exception as error:
            return {"ok": False, "configured": self.configured(), "error": str(error)}

    def counts(self) -> Dict[str, Any]:
        status = self.status()
        return {
            "data_api_configured": self.configured(),
            "data_api_url": self.base_url,
            "data_api_status": status,
        }

    def _log_skip(self, operation: str, error: Exception) -> None:
        logger.warning("[data-api] generated content %s skipped: %s", operation, error)

    def upsert_generated_content(
        self,
        identity: Dict[str, Any],
        result: Dict[str, Any],
        client_fingerprint: str = "",
    ) -> Dict[str, Any]:
        if not isinstance(result, dict) or result.get("error"):
            return {}
        payload = {
            "identity": identity or {},
            "result": result,
            "client_fingerprint": client_fingerprint or "",
        }
        try:
            data = self._request("POST", "/api/generated-content", payload)
            return data.get("database_record") or (data.get("item") or {}).get("database_record") or {}
        except Exception as error:
            self._log_skip("mirror", error)
            return {}

    def list_generated_content(self, identity: Dict[str, Any], limit: int = 50) -> List[Dict[str, Any]]:
        try:
            data = self._request("POST", "/api/internal/generated-content/list", {
                "identity": identity or {},
                "limit": limit,
            })
            items = data.get("items")
            return items if isinstance(items, list) else []
        except Exception as error:
            self._log_skip("list", error)
            return []

    def get_generated_content(self, identity: Dict[str, Any], content_id: str) -> Optional[Dict[str, Any]]:
        try:
            data = self._request("POST", "/api/internal/generated-content/get", {
                "identity": identity or {},
                "id": content_id,
            })
            item = data.get("item")
            return item if isinstance(item, dict) else None
        except Exception as error:
            self._log_skip("get", error)
            return None

    def delete_generated_content(self, identity: Dict[str, Any], content_id: str) -> bool:
        try:
            data = self._request("POST", "/api/internal/generated-content/delete", {
                "identity": identity or {},
                "id": content_id,
            })
            return bool(data.get("deleted"))
        except Exception as error:
            self._log_skip("delete", error)
            return False

    def export_user_content(self, identity: Dict[str, Any]) -> List[Dict[str, Any]]:
        try:
            data = self._request("POST", "/api/internal/generated-content/export", {
                "identity": identity or {},
            })
            items = data.get("items")
            return items if isinstance(items, list) else []
        except Exception as error:
            self._log_skip("export", error)
            return []

    def delete_user_content(self, identity: Dict[str, Any]) -> int:
        try:
            data = self._request("POST", "/api/internal/generated-content/delete-user", {
                "identity": identity or {},
            })
            return int(data.get("deleted_count") or 0)
        except Exception as error:
            self._log_skip("user-delete", error)
            return 0


synapse_database = SynapseDataApiClient()
