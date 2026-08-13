"""CORS configuration values for the Synapse backend."""

from __future__ import annotations

import os

from core.config_env import env_bool, env_list

DEFAULT_CORS_ALLOW_ORIGINS = [
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://127.0.0.1:5175",
    "http://localhost:5175",
    "http://127.0.0.1:5176",
    "http://localhost:5176",
]
CORS_ALLOW_ORIGINS = env_list(
    "SYNAPSE_CORS_ALLOW_ORIGINS",
    ",".join(DEFAULT_CORS_ALLOW_ORIGINS),
)
for origin in DEFAULT_CORS_ALLOW_ORIGINS:
    if origin not in CORS_ALLOW_ORIGINS:
        CORS_ALLOW_ORIGINS.append(origin)
CORS_ALLOW_ORIGIN_REGEX = (
    os.getenv(
        "SYNAPSE_CORS_ALLOW_ORIGIN_REGEX",
        r"^http://(?:10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}):(?:5175|5176|5500)$",
    ).strip()
    or None
)
CORS_ALLOW_CREDENTIALS = env_bool("SYNAPSE_CORS_ALLOW_CREDENTIALS", "false")


