#!/bin/bash
# Claude Distill — Log user prompts (richer than history.jsonl)
# Hook event: UserPromptSubmit
INPUT=$(cat)

SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"')
PROMPT=$(echo "$INPUT" | jq -r '.prompt // ""')
CWD=$(echo "$INPUT" | jq -r '.cwd // ""')
TS=$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ 2>/dev/null || date -u +%Y-%m-%dT%H:%M:%SZ)

LOG_DIR="$HOME/.claude-distill/collected"
mkdir -p "$LOG_DIR"

jq -n -c \
  --arg ts "$TS" \
  --arg sid "$SESSION_ID" \
  --arg prompt "$PROMPT" \
  --arg cwd "$CWD" \
  --arg event "user_prompt" \
  '{ts:$ts,event:$event,session_id:$sid,prompt:$prompt,cwd:$cwd}' \
  >> "$LOG_DIR/prompts.jsonl" 2>/dev/null

exit 0
