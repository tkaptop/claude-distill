#!/bin/bash
# Claude Distill — Log tool calls (PreToolUse + PostToolUse)
# Hook events: PreToolUse, PostToolUse
INPUT=$(cat)

SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"')
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // "unknown"')
TOOL_INPUT=$(echo "$INPUT" | jq -c '.tool_input // {}')
HOOK_EVENT=$(echo "$INPUT" | jq -r '.hook_event_name // "unknown"')
CWD=$(echo "$INPUT" | jq -r '.cwd // ""')
TS=$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ 2>/dev/null || date -u +%Y-%m-%dT%H:%M:%SZ)

LOG_DIR="$HOME/.claude-distill/collected"
mkdir -p "$LOG_DIR"

# For PostToolUse, also capture result summary (truncated to avoid huge logs)
TOOL_RESULT=""
if [ "$HOOK_EVENT" = "PostToolUse" ]; then
  TOOL_RESULT=$(echo "$INPUT" | jq -c '.tool_result // {}' | head -c 500)
fi

jq -n -c \
  --arg ts "$TS" \
  --arg sid "$SESSION_ID" \
  --arg tool "$TOOL_NAME" \
  --argjson input "$TOOL_INPUT" \
  --arg event "$HOOK_EVENT" \
  --arg cwd "$CWD" \
  --arg result "$TOOL_RESULT" \
  '{ts:$ts,event:$event,session_id:$sid,tool:$tool,input:$input,cwd:$cwd,result:$result}' \
  >> "$LOG_DIR/tools.jsonl" 2>/dev/null

exit 0
