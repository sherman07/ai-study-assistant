"""Application layer: use-case orchestration for the AI backend.

New multi-step workflows (analyze pipelines, companion turns, broadcast jobs)
should land here and call into ``backend.domain`` plus ``backend.core`` infra.
HTTP adapters in ``app.py`` / ``app_sections`` should stay thin.
"""
