#!/usr/bin/env bash
set -euo pipefail

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

log()  { echo -e "${BLUE}▶${RESET} $*"; }
ok()   { echo -e "${GREEN}✓${RESET} $*"; }
warn() { echo -e "${YELLOW}⚠${RESET}  $*"; }
err()  { echo -e "${RED}✗${RESET} $*"; }
sep()  { echo -e "${CYAN}────────────────────────────────────────${RESET}"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

API_PORT="${AGENT_API_PORT:-3721}"
UI_PORT=3720
API_PID_FILE="$SCRIPT_DIR/.pids/api.pid"
UI_PID_FILE="$SCRIPT_DIR/.pids/ui.pid"
LOG_DIR="$SCRIPT_DIR/logs"

mkdir -p "$SCRIPT_DIR/.pids" "$LOG_DIR"

# ── Cleanup on exit ───────────────────────────────────────────────────────────
cleanup() {
  echo ""
  log "Shutting down..."
  if [[ -f "$API_PID_FILE" ]]; then
    kill "$(cat "$API_PID_FILE")" 2>/dev/null && ok "API server stopped" || true
    rm -f "$API_PID_FILE"
  fi
  if [[ -f "$UI_PID_FILE" ]]; then
    kill "$(cat "$UI_PID_FILE")" 2>/dev/null && ok "UI dev server stopped" || true
    rm -f "$UI_PID_FILE"
  fi
  exit 0
}
trap cleanup SIGINT SIGTERM

# ── Header ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${CYAN}  TXDNAgent — Multi-Agent Engineering Console${RESET}"
echo -e "  TransactionDNA & EnterpriseOS"
sep
echo ""

# ── 1. Check Node ─────────────────────────────────────────────────────────────
log "Checking prerequisites..."

if ! command -v node &>/dev/null; then
  err "Node.js not found. Install Node.js v22+ from https://nodejs.org"
  exit 1
fi
NODE_VER=$(node --version)
ok "Node.js $NODE_VER"

if ! command -v npm &>/dev/null; then
  err "npm not found. Install npm."
  exit 1
fi

if ! command -v npx &>/dev/null; then
  err "npx not found."
  exit 1
fi

# ── 2. .env check ─────────────────────────────────────────────────────────────
if [[ ! -f ".env" ]]; then
  if [[ -f ".env.example" ]]; then
    cp .env.example .env
    warn ".env created from .env.example"
    warn "Edit .env and set ANTHROPIC_API_KEY before running workflows."
    echo ""
  fi
else
  ok ".env found"
fi

# Check for API key
if [[ -f ".env" ]]; then
  # shellcheck disable=SC1091
  set -a; source .env 2>/dev/null || true; set +a
fi

if [[ -z "${ANTHROPIC_API_KEY:-}" ]] || [[ "${ANTHROPIC_API_KEY:-}" == "sk-ant-api03-..." ]]; then
  warn "ANTHROPIC_API_KEY is not set in .env"
  warn "The admin UI will start but workflows will fail until the key is configured."
  echo ""
fi

# ── 3. Install root dependencies ──────────────────────────────────────────────
if [[ ! -d "node_modules" ]]; then
  log "Installing root dependencies..."
  npm install --silent
  ok "Root dependencies installed"
else
  ok "Root node_modules present"
fi

# ── 4. Install UI dependencies ────────────────────────────────────────────────
if [[ ! -d "ui/node_modules" ]]; then
  log "Installing UI dependencies..."
  npm install --prefix ui --silent
  ok "UI dependencies installed"
else
  ok "UI node_modules present"
fi

# ── 5. Kill stale processes on our ports ─────────────────────────────────────
for PORT in $API_PORT $UI_PORT; do
  EXISTING=$(lsof -ti tcp:"$PORT" 2>/dev/null || true)
  if [[ -n "$EXISTING" ]]; then
    log "Freeing port $PORT (PID $EXISTING)..."
    kill "$EXISTING" 2>/dev/null || true
    sleep 1
  fi
done

# ── 6. Start API server ───────────────────────────────────────────────────────
log "Starting API server on port $API_PORT..."
npx tsx server.ts >"$LOG_DIR/api.log" 2>&1 &
API_PID=$!
echo "$API_PID" > "$API_PID_FILE"

# Wait for API to be ready
API_READY=false
for i in $(seq 1 15); do
  sleep 1
  if curl -sf "http://localhost:$API_PORT/api/agents" >/dev/null 2>&1; then
    API_READY=true
    break
  fi
done

if [[ "$API_READY" == "true" ]]; then
  ok "API server ready → http://localhost:$API_PORT"
else
  warn "API server may not be ready yet (check logs/api.log)"
  warn "This is normal if ANTHROPIC_API_KEY is not yet configured."
fi

# ── 7. Start UI dev server ────────────────────────────────────────────────────
log "Starting admin UI on port $UI_PORT..."
npm run dev --prefix ui >"$LOG_DIR/ui.log" 2>&1 &
UI_PID=$!
echo "$UI_PID" > "$UI_PID_FILE"

# Wait for Vite to be ready
UI_READY=false
for i in $(seq 1 15); do
  sleep 1
  if curl -sf "http://localhost:$UI_PORT" >/dev/null 2>&1; then
    UI_READY=true
    break
  fi
done

if [[ "$UI_READY" == "true" ]]; then
  ok "Admin UI ready"
else
  warn "UI server may still be starting (check logs/ui.log)"
fi

# ── 8. Open browser ───────────────────────────────────────────────────────────
BROWSER_URL="http://localhost:$UI_PORT"
if command -v open &>/dev/null; then       # macOS
  open "$BROWSER_URL" 2>/dev/null || true
elif command -v xdg-open &>/dev/null; then # Linux
  xdg-open "$BROWSER_URL" 2>/dev/null || true
fi

# ── 9. Summary ────────────────────────────────────────────────────────────────
echo ""
sep
echo -e "${BOLD}  Running${RESET}"
echo -e "  ${GREEN}Admin UI${RESET}   → ${BOLD}http://localhost:$UI_PORT${RESET}"
echo -e "  ${GREEN}API server${RESET} → http://localhost:$API_PORT"
echo -e "  ${GREEN}API log${RESET}    → logs/api.log"
echo -e "  ${GREEN}UI log${RESET}     → logs/ui.log"
echo -e "  ${GREEN}Audit log${RESET}  → logs/audit-trail.jsonl"
sep
echo ""
echo -e "  ${CYAN}Quick CLI examples:${RESET}"
echo -e "  npx tsx index.ts feature -f \"Add bulk exception close\""
echo -e "  npx tsx index.ts review  -F \"backend/src/.../ExceptionService.java\""
echo -e "  npx tsx index.ts deploy  -b release/v2.5 -e staging"
echo -e "  npx tsx index.ts risks"
echo ""
echo -e "  Press ${BOLD}Ctrl+C${RESET} to stop all services."
echo ""

# ── 10. Wait ──────────────────────────────────────────────────────────────────
wait
