"""Environment helper utilities for Synapse configuration."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import dotenv_values, load_dotenv


def env_bool(name: str, default: str = "false") -> bool:
    return os.getenv(name, default).lower() not in {"0", "false", "no"}


def env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except Exception:
        return default


def env_float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, str(default)))
    except Exception:
        return default


def env_list(name: str, default: str = "") -> list:
    raw = os.getenv(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


def env_str(name: str, default: str = "") -> str:
    value = (os.getenv(name) or "").strip()
    return value or default


PLACEHOLDER_ENV_MARKERS = (
    "__ADD_",
    "__YOUR",
    "YOUR_",
    "your_key_here",
    "PASTE_",
)


def is_placeholder_env_value(value: str | None) -> bool:
    text = str(value or "").strip()
    if not text:
        return True
    upper_text = text.upper()
    return any(marker.upper() in upper_text for marker in PLACEHOLDER_ENV_MARKERS)


def apply_env_values(
    values: dict,
    *,
    environ: dict | None = None,
    override: bool = False,
    override_placeholders: bool = False,
) -> None:
    target = environ if environ is not None else os.environ
    for key, value in values.items():
        if value is None:
            continue
        current = str(target.get(key, "") or "").strip()
        should_replace = override or not current
        if override_placeholders and current:
            should_replace = should_replace or is_placeholder_env_value(current)
        if should_replace:
            target[key] = str(value).strip()


def load_env_defaults(env_paths: tuple[Path, ...]) -> None:
    for env_path in env_paths:
        load_dotenv(env_path)


def load_env_overrides_for_placeholders(env_paths: tuple[Path, ...]) -> None:
    for env_path in env_paths:
        if env_path.exists():
            apply_env_values(
                dotenv_values(env_path),
                override_placeholders=True,
            )
