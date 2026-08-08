"""Resolve request AI provider against billing plan access."""

from __future__ import annotations

from typing import Any, Optional

import requests

from backend.domain.provider_access import (
    denial_message,
    resolve_provider_for_plan,
)


class ProviderPlanDenied(PermissionError):
    """Raised when a free-plan request insists on a Pro-only provider and strict mode is on."""

    def __init__(self, message: str, *, resolution: Optional[dict[str, Any]] = None):
        super().__init__(message)
        self.resolution = resolution or {}


def entitlements_is_pro(payload: Any) -> bool:
    if not isinstance(payload, dict):
        return False
    entitlements = payload.get("entitlements") if isinstance(payload.get("entitlements"), dict) else payload
    if isinstance(entitlements, dict) and "isPro" in entitlements:
        return bool(entitlements.get("isPro"))
    user = payload.get("user") if isinstance(payload.get("user"), dict) else {}
    plan = str(user.get("plan") or entitlements.get("plan") or "").lower()
    status = str(user.get("subscriptionStatus") or user.get("subscription_status") or entitlements.get("subscriptionStatus") or "").lower()
    if not plan.startswith("pro_"):
        return False
    return status in {"active", "trialing"}


def fetch_is_pro_from_data_api(
    authorization: str = "",
    *,
    base_url: str,
    timeout_seconds: float = 3.0,
) -> bool:
    """Fail closed: missing/invalid auth → free (DeepSeek only)."""
    token = str(authorization or "").strip()
    root = str(base_url or "").rstrip("/")
    if not token or not root:
        return False
    if not token.lower().startswith("bearer "):
        token = f"Bearer {token}"
    try:
        response = requests.get(
            f"{root}/api/billing/entitlements",
            headers={"Authorization": token, "Accept": "application/json"},
            timeout=max(1.0, float(timeout_seconds)),
        )
        if response.status_code >= 400:
            return False
        data = response.json()
        return entitlements_is_pro(data)
    except Exception:
        return False


def resolve_request_provider(
    requested: str = "",
    *,
    is_pro: bool,
    backend_default: str,
    strict: bool = False,
) -> dict[str, Any]:
    """
    Resolve the provider for this request.

    When strict=True and the free user requested a Pro provider, raise ProviderPlanDenied
    instead of silently clamping (useful for explicit API feedback).
    Default behaviour clamps to DeepSeek so existing free flows keep working.
    """
    resolution = resolve_provider_for_plan(
        requested,
        is_pro=is_pro,
        backend_default=backend_default,
    )
    if strict and resolution.get("clamped") and not is_pro:
        raise ProviderPlanDenied(
            resolution.get("reason") or denial_message(requested),
            resolution=resolution,
        )
    return resolution
