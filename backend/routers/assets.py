"""Asset-serving helpers used by runtime asset routes."""

from __future__ import annotations

from typing import Any, Callable, Optional, Tuple

from fastapi.responses import FileResponse, Response


def serve_visual_asset_response(
    asset_name: str,
    *,
    runtime_asset_path_for_relative_path: Callable[[str], Any],
    fetch_visual_asset_from_durable_storage: Callable[[str], Optional[Tuple[bytes, str]]],
) -> Response:
    """Serve a local visual or restore it from private durable storage."""
    asset_path = runtime_asset_path_for_relative_path(f"visuals/{asset_name}")
    if asset_path and asset_path.is_file():
        return FileResponse(asset_path)

    restored = fetch_visual_asset_from_durable_storage(asset_name)
    if not restored:
        return Response(status_code=404)

    content, content_type = restored
    if asset_path:
        try:
            asset_path.parent.mkdir(parents=True, exist_ok=True)
            asset_path.write_bytes(content)
        except OSError:
            pass
    return Response(content=content, media_type=content_type)


def serve_runtime_asset_response(
    asset_path: str,
    *,
    runtime_asset_path_for_relative_path: Callable[[str], Any],
) -> Response:
    """Keep existing runtime audio and preview URLs working without static mounts."""
    path = runtime_asset_path_for_relative_path(asset_path)
    if not path or not path.is_file():
        return Response(status_code=404)
    return FileResponse(path)
