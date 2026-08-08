#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${PROJECT_ROOT}/backend/.env"

if [ ! -f "${ENV_FILE}" ]; then
  install -m 600 /dev/null "${ENV_FILE}"
fi

OPENAI_KEY="${1:-}"
if [ -z "${OPENAI_KEY}" ]; then
  read -r -s -p "OpenAI API key: " OPENAI_KEY
  echo
fi

if [ -z "${OPENAI_KEY}" ]; then
  echo "No key provided." >&2
  exit 1
fi

tmp_file="$(mktemp)"
awk -v new_line="OPENAI_API_KEY=${OPENAI_KEY}" '
  BEGIN { replaced = 0 }
  /^OPENAI_API_KEY=/ {
    print new_line
    replaced = 1
    next
  }
  { print }
  END {
    if (!replaced) print new_line
  }
' "${ENV_FILE}" > "${tmp_file}"
mv "${tmp_file}" "${ENV_FILE}"

echo "Saved OpenAI API key to backend/.env"
