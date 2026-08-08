"""Domain rules: which AI text providers a billing plan may use.

Free / anonymous → DeepSeek only.
Active Pro → GPT (openai), Gemini, and DeepSeek.
"""

from __future__ import annotations

from typing import Any, Iterable

PROVIDER_OPENAI = "openai"
PROVIDER_GEMINI = "gemini"
PROVIDER_DEEPSEEK = "deepseek"

ALL_TEXT_PROVIDERS = (PROVIDER_OPENAI, PROVIDER_GEMINI, PROVIDER_DEEPSEEK)
FREE_TEXT_PROVIDERS = (PROVIDER_DEEPSEEK,)
PRO_TEXT_PROVIDERS = ALL_TEXT_PROVIDERS

FREE_DEFAULT_PROVIDER = PROVIDER_DEEPSEEK


def normalise_provider_id(provider: object = "") -> str:
    value = provider if isinstance(provider, str) else ""
    value = value.strip().lower()
    if value in {"gpt", "openai", "chatgpt"}:
        return PROVIDER_OPENAI
    if value in {"gemini", "google", "vertex"}:
        return PROVIDER_GEMINI
    if value in {"deepseek", "deepsea"}:
        return PROVIDER_DEEPSEEK
    if value in {"", "backend", "default", "auto"}:
        return ""
    return value


def allowed_providers_for_plan(*, is_pro: bool) -> tuple[str, ...]:
    return PRO_TEXT_PROVIDERS if is_pro else FREE_TEXT_PROVIDERS


def default_provider_for_plan(*, is_pro: bool, backend_default: str = PROVIDER_OPENAI) -> str:
    if is_pro:
        # Empty means “use backend env default” for Pro.
        return ""
    # Free users never inherit a GPT/Gemini backend default.
    return FREE_DEFAULT_PROVIDER


def provider_allowed(provider: str, *, is_pro: bool) -> bool:
    selected = normalise_provider_id(provider)
    allowed = allowed_providers_for_plan(is_pro=is_pro)
    if selected == "":
        # Empty = backend default. Allowed for Pro; remapped for free.
        return bool(is_pro)
    return selected in allowed


def resolve_provider_for_plan(
    requested: str = "",
    *,
    is_pro: bool,
    backend_default: str = PROVIDER_OPENAI,
) -> dict[str, Any]:
    """Return the effective provider plus whether the request was clamped."""
    requested_norm = normalise_provider_id(requested)
    backend = normalise_provider_id(backend_default) or PROVIDER_OPENAI
    if backend not in ALL_TEXT_PROVIDERS:
        backend = PROVIDER_OPENAI

    if is_pro:
        effective = requested_norm or backend
        if effective not in ALL_TEXT_PROVIDERS:
            effective = backend
        return {
            "requested": requested_norm,
            "provider": effective,
            "allowed": list(PRO_TEXT_PROVIDERS),
            "clamped": False,
            "is_pro": True,
            "reason": "",
        }

    # Free / anonymous
    if requested_norm in FREE_TEXT_PROVIDERS:
        effective = requested_norm
        clamped = False
        reason = ""
    else:
        effective = FREE_DEFAULT_PROVIDER
        clamped = requested_norm != FREE_DEFAULT_PROVIDER
        reason = (
            "Free plan can only use DeepSeek. Upgrade to Pro to unlock GPT and Gemini."
            if requested_norm in {PROVIDER_OPENAI, PROVIDER_GEMINI, ""}
            else "That AI provider is not available on the Free plan."
        )
    return {
        "requested": requested_norm,
        "provider": effective,
        "allowed": list(FREE_TEXT_PROVIDERS),
        "clamped": clamped,
        "is_pro": False,
        "reason": reason if clamped else "",
    }


def denial_message(provider: str = "") -> str:
    selected = normalise_provider_id(provider) or "that provider"
    label = {
        PROVIDER_OPENAI: "GPT",
        PROVIDER_GEMINI: "Gemini",
        PROVIDER_DEEPSEEK: "DeepSeek",
    }.get(selected, selected)
    return (
        f"{label} is available on Pro. Free plan can only use DeepSeek. "
        "Upgrade to Pro to unlock GPT and Gemini."
    )


def providers_from_iterable(values: Iterable[str] | None) -> list[str]:
    if not values:
        return []
    out = []
    for value in values:
        normalised = normalise_provider_id(value)
        if normalised in ALL_TEXT_PROVIDERS and normalised not in out:
            out.append(normalised)
    return out
