#!/bin/bash
# Claude Distill — Log session start/end
# Hook events: SessionStart, SessionEnd
INPUT=$(cat)

SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"')
HOOK_EVENT=$(echo "$INPUT" | jq -r '.hook_event_name // "unknown"')
CWD=$(echo "$INPUT" | jq -r '.cwd // ""')
SOURCE=$(echo "$INPUT" | jq -r '.source // ""')
TS=$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ 2>/dev/null || date -u +%Y-%m-%dT%H:%M:%SZ)

LOG_DIR="$HOME/.claude-distill/collected"
[ -d "$LOG_DIR" ] || mkdir -p "$LOG_DIR"

jq -n -c \
  --arg ts "$TS" \
  --arg sid "$SESSION_ID" \
  --arg event "$HOOK_EVENT" \
  --arg cwd "$CWD" \
  --arg source "$SOURCE" \
  '{ts:$ts,event:$event,session_id:$sid,cwd:$cwd,source:$source}' \
  >> "$LOG_DIR/sessions.jsonl" 2>/dev/null

exit 0
