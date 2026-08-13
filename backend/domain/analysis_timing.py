"""Pure timing helpers for analysis request budgets."""

from __future__ import annotations


def elapsed_seconds_since(started_at: float, now: float) -> float:
    return max(0.0, float(now) - float(started_at))


def remaining_seconds_since(started_at: float, now: float, max_seconds: float) -> float:
    return max(0.0, float(max_seconds) - elapsed_seconds_since(started_at, now))


def should_run_optional_stage(
    started_at: float,
    now: float,
    max_seconds: float,
    min_remaining_seconds: float,
) -> bool:
    return remaining_seconds_since(started_at, now, max_seconds) >= float(min_remaining_seconds)
