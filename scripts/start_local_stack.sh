#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
RUNTIME_DIR="${PROJECT_ROOT}/.synapse_runtime"
LOG_DIR="${RUNTIME_DIR}/logs"
PID_DIR="${RUNTIME_DIR}/pids"
BACKEND_ENV="${PROJECT_ROOT}/backend/.env"
BACKEND_ENV_EXAMPLE="${PROJECT_ROOT}/backend/.env.example"
SERVER_ENV="${PROJECT_ROOT}/server/.env"

mkdir -p "${LOG_DIR}" "${PID_DIR}"

ensure_node() {
  if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
    return
  fi
  # shellcheck disable=SC1091
  source "${PROJECT_ROOT}/scripts/use_local_node.sh" >/dev/null
}

ensure_backend_env() {
  if [ -f "${BACKEND_ENV}" ]; then
    return
  fi
  cp "${BACKEND_ENV_EXAMPLE}" "${BACKEND_ENV}"
  echo "Created backend/.env from backend/.env.example"
}

backend_reports_openai_key() {
  curl --silent --fail --max-time 2 "http://127.0.0.1:8001/health" 2>/dev/null | grep -q '"api_key_loaded":true'
}

port_is_listening() {
  local port="$1"
  lsof -nP -iTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1
}

start_backend() {
  if port_is_listening 8001; then
    echo "Backend already listening on 8001"
    return
  fi
  nohup "${PROJECT_ROOT}/.venv/bin/python" -m uvicorn backend.app:app --host 127.0.0.1 --port 8001 \
    >"${LOG_DIR}/backend.log" 2>&1 &
  echo $! > "${PID_DIR}/backend.pid"
}

start_data_api() {
  if port_is_listening 3001; then
    echo "Data API already listening on 3001"
    return
  fi
  (
    cd "${PROJECT_ROOT}/server"
    nohup node src/server.js >"${LOG_DIR}/data-api.log" 2>&1 &
    echo $! > "${PID_DIR}/data-api.pid"
  )
}

start_frontend() {
  if port_is_listening 5175; then
    echo "Frontend already listening on 5175"
    return
  fi
  (
    cd "${PROJECT_ROOT}"
    nohup node ./node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5175 --strictPort \
      >"${LOG_DIR}/frontend.log" 2>&1 &
    echo $! > "${PID_DIR}/frontend.pid"
  )
}

wait_for_http() {
  local url="$1"
  local label="$2"
  local attempts=30
  local count=0
  until curl --silent --fail --max-time 2 "${url}" >/dev/null 2>&1; do
    count=$((count + 1))
    if [ "${count}" -ge "${attempts}" ]; then
      echo "${label} did not become ready at ${url}" >&2
      return 1
    fi
    sleep 1
  done
}

if [ ! -x "${PROJECT_ROOT}/.venv/bin/python" ]; then
  echo "Missing Python virtualenv at ${PROJECT_ROOT}/.venv. Create it first." >&2
  exit 1
fi

if [ ! -f "${SERVER_ENV}" ]; then
  echo "Missing server/.env. Create it before starting the local stack." >&2
  exit 1
fi

ensure_node
ensure_backend_env
node "${PROJECT_ROOT}/scripts/ensure_legacy_controller_combined.mjs"
start_data_api
start_backend
start_frontend

if ! wait_for_http "http://127.0.0.1:3001/health" "Data API"; then
  echo "Data API is running in degraded mode or Supabase is unavailable. Continuing without durable app data."
fi
wait_for_http "http://127.0.0.1:8001/health" "Backend"
wait_for_http "http://127.0.0.1:5175/frontend/index.html" "Frontend"

echo "Synapse local stack is running:"
echo "  Frontend: http://127.0.0.1:5175/frontend/index.html"
echo "  Backend:  http://127.0.0.1:8001/health"
echo "  Data API: http://127.0.0.1:3001/health"

if backend_reports_openai_key; then
  echo "Backend OpenAI key detected."
else
  echo "Backend OpenAI key is still unavailable to the running service, so AI note generation will not work until you add it."
fi
