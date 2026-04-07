#!/bin/bash
# Claude Distill — Log permission denials (THE key signal for distillation)
# Hook event: PermissionDenied
# This is the GOLD: when a user rejects Claude's proposed action,
# it's the strongest signal of what NOT to do.
INPUT=$(cat)

SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"')
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // "unknown"')
TOOL_INPUT=$(echo "$INPUT" | jq -c '.tool_input // {}' 2>/dev/null || echo '{}')
CWD=$(echo "$INPUT" | jq -r '.cwd // ""')
TS=$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ 2>/dev/null || date -u +%Y-%m-%dT%H:%M:%SZ)

LOG_DIR="$HOME/.claude-distill/collected"
[ -d "$LOG_DIR" ] || mkdir -p "$LOG_DIR"

jq -n -c \
  --arg ts "$TS" \
  --arg sid "$SESSION_ID" \
  --arg tool "$TOOL_NAME" \
  --argjson input "$TOOL_INPUT" \
  --arg cwd "$CWD" \
  --arg event "permission_denied" \
  '{ts:$ts,event:$event,session_id:$sid,tool:$tool,input:$input,cwd:$cwd}' \
  >> "$LOG_DIR/rejections.jsonl" 2>/dev/null

exit 0
