"""Domain layer: pure business contracts and validators.

HTTP, LLM clients, and persistence must not live here.
Prefer ``backend.domain`` for new application code.
Compatibility shims remain under ``backend.core`` for existing callers.
"""
