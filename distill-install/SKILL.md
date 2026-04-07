---
name: distill-install
description: |
  Install or manage Claude Distill data collection hooks. These hooks run in the
  background during your Claude Code sessions, collecting richer interaction data
  that improves distillation quality over time. Use when asked to "install hooks",
  "start collecting", "distill-install", or "enable distill collection".
allowed-tools:
  - Bash
  - Read
  - AskUserQuestion
---

# Claude Distill — Install Collection Hooks

## What this does

Installs 5 lightweight hooks into your Claude Code settings that silently collect:

| Hook | Event | What it captures |
|------|-------|-----------------|
| log-prompt.sh | UserPromptSubmit | Every prompt you send (richer than history.jsonl) |
| log-tool-use.sh | PreToolUse + PostToolUse | Every tool call with context and result |
| log-rejection.sh | PermissionDenied | When you reject Claude's action (highest value signal) |
| log-session.sh | SessionStart + SessionEnd | Session boundaries |

All hooks are **async** (zero impact on response speed) and data stays on your machine at `~/.claude-distill/collected/`.

## Step 1: Check current status

```bash
DISTILL_DIR="$HOME/.claude/skills/claude-distill"
bun run "$DISTILL_DIR/lib/collectors/hook-installer.ts" 2>/dev/null || echo "Run setup first"
```

If that fails, use inline check:

```bash
cat ~/.claude/settings.json | grep -c "claude-distill" 2>/dev/null || echo "0"
```

If count is 0, hooks are not installed. If > 0, they're already installed.

## Step 2: Install hooks

```bash
cd "$HOME/.claude/skills/claude-distill"
bun -e "
const { installHooks } = require('./lib/collectors/hook-installer');
const result = installHooks();
console.log('Installed:', result.installed.join(', ') || 'none (already installed)');
console.log('Skipped:', result.skipped.join(', ') || 'none');
"
```

If bun is not available, manually add to `~/.claude/settings.json`:

Read the current settings file, then add the hooks section. The hooks should point to:
- `~/.claude/skills/claude-distill/hooks/log-prompt.sh`
- `~/.claude/skills/claude-distill/hooks/log-tool-use.sh`
- `~/.claude/skills/claude-distill/hooks/log-rejection.sh`
- `~/.claude/skills/claude-distill/hooks/log-session.sh`

## Step 3: Verify installation

```bash
echo "=== Hook scripts ===" && ls -la ~/.claude/skills/claude-distill/hooks/*.sh
echo ""
echo "=== Settings hooks ===" && cat ~/.claude/settings.json | python3 -c "import json,sys; d=json.load(sys.stdin); hooks=d.get('hooks',{}); print(f'{len(hooks)} hook events registered'); [print(f'  {k}: {len(v)} entries') for k,v in hooks.items()]" 2>/dev/null
echo ""
echo "=== Collection dir ===" && ls ~/.claude-distill/collected/ 2>/dev/null || echo "Empty (will populate after first session)"
```

## Step 4: Report to user

Tell the user:
1. Which hooks were installed
2. Data will be collected at `~/.claude-distill/collected/`
3. Run `/distill` anytime to regenerate their skill with the richer data
4. To uninstall: run `bun -e "require('./lib/collectors/hook-installer').uninstallHooks()"`

**Important: Hooks take effect on the NEXT Claude Code session, not the current one.**
