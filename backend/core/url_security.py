import ipaddress
import socket
from urllib.parse import urlparse


BLOCKED_HOSTNAMES = {"localhost", "localhost.localdomain", "ip6-localhost"}


def env_allows_private_urls() -> bool:
    try:
        import os

        return os.getenv("SYNAPSE_ALLOW_PRIVATE_SOURCE_URLS", "false").lower() in {"1", "true", "yes"}
    except Exception:
        return False


def _is_blocked_ip(address: str) -> bool:
    try:
        ip = ipaddress.ip_address(address)
    except ValueError:
        return False
    return any(
        (
            ip.is_private,
            ip.is_loopback,
            ip.is_link_local,
            ip.is_multicast,
            ip.is_reserved,
            ip.is_unspecified,
        )
    )


def _resolved_addresses(hostname: str, port: int) -> set:
    try:
        return {
            sockaddr[0]
            for *_, sockaddr in socket.getaddrinfo(hostname, port, type=socket.SOCK_STREAM)
            if sockaddr
        }
    except Exception:
        return set()


def normalize_public_http_url(url: str, purpose: str = "URL") -> str:
    raw, hostname, port = _validated_http_url_parts(url, purpose)
    if env_allows_private_urls():
        return raw

    resolved = _resolved_addresses(hostname, port)
    if any(_is_blocked_ip(address) for address in resolved):
        raise ValueError(f"{purpose} resolves to a private or local network address.")
    return raw


def _validated_http_url_parts(url: str, purpose: str) -> tuple[str, str, int]:
    raw = (url or "").strip()
    if raw.startswith("//"):
        raw = "https:" + raw
    parsed = urlparse(raw)
    if not parsed.scheme and not parsed.netloc and parsed.path:
        raw = "https://" + raw.lstrip("/")
        parsed = urlparse(raw)

    if parsed.scheme.lower() not in {"http", "https"}:
        raise ValueError(f"{purpose} must use http or https.")
    if not parsed.hostname:
        raise ValueError(f"{purpose} is missing a hostname.")
    if parsed.username or parsed.password:
        raise ValueError(f"{purpose} must not include embedded credentials.")

    hostname = parsed.hostname.rstrip(".").lower()
    if not env_allows_private_urls() and (
        hostname in BLOCKED_HOSTNAMES or hostname.endswith(".local")
    ):
        raise ValueError(f"{purpose} points to a private or local network address.")
    if not env_allows_private_urls() and _is_blocked_ip(hostname):
        raise ValueError(f"{purpose} points to a private or local network address.")

    try:
        port = parsed.port or (443 if parsed.scheme.lower() == "https" else 80)
    except ValueError:
        raise ValueError(f"{purpose} has an invalid port.")
    return raw, hostname, port


def resolve_public_http_target(url: str, purpose: str = "URL") -> tuple[str, str]:
    """Validate a public HTTP URL and return one address safe to connect to.

    Callers must connect directly to the returned address while retaining the
    URL hostname for the HTTP Host header and TLS certificate verification.
    This keeps DNS validation and the subsequent connection tied together.
    """
    raw, hostname, port = _validated_http_url_parts(url, purpose)
    resolved = _resolved_addresses(hostname, port)
    if not resolved:
        raise ValueError(f"{purpose} hostname could not be resolved.")
    if not env_allows_private_urls() and any(_is_blocked_ip(address) for address in resolved):
        raise ValueError(f"{purpose} resolves to a private or local network address.")

    try:
        address = min(
            resolved,
            key=lambda value: (
                ipaddress.ip_address(value).version,
                int(ipaddress.ip_address(value)),
            ),
        )
    except ValueError:
        raise ValueError(f"{purpose} resolved to an invalid network address.")
    return raw, address
