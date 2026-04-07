---
name: distill
description: |
  Distill your AI work style from Claude Code usage data into a portable skill file.
  Analyzes interaction history, decision patterns, friction points, and workflow
  preferences, then generates a skill.md that encodes your work style.
  Use when asked to "distill", "extract my style", "generate my skill", or
  "create work style profile".
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - AskUserQuestion
---

# Claude Distill — Generate Your Work Style Skill

You are about to analyze this user's Claude Code interaction history and generate a
portable work style skill file. This is a two-phase process:
1. Run the binary to collect and preprocess raw data into profile.json
2. YOU (Claude) read profile.json and generate meaningful rules

## Step 1: Run data analysis binary

```bash
DISTILL_DIR="$(cd "$(dirname "$(dirname "${BASH_SOURCE[0]:-$0}")")" 2>/dev/null && pwd)"
[ -z "$DISTILL_DIR" ] && DISTILL_DIR="$HOME/.claude/skills/claude-distill"
mkdir -p ~/.claude-distill

if [ -x "$DISTILL_DIR/dist/distill-analyze" ]; then
  "$DISTILL_DIR/dist/distill-analyze"
elif command -v bun >/dev/null 2>&1; then
  bun run "$DISTILL_DIR/bin/distill-analyze.ts"
else
  echo "ERROR: bun is required. Install: curl -fsSL https://bun.sh/install | bash"
  exit 1
fi
```

If the command fails, check if `~/.claude/history.jsonl` exists. If not, the user
hasn't used Claude Code enough — tell them and stop.

## Step 2: Read the profile

```bash
cat ~/.claude-distill/profile.json
```

Read the output carefully. This is the structured data you'll use to generate rules.

## Step 3: Generate rules from the profile data

You are the LLM. Use your understanding to extract meaningful, actionable rules
from the profile data. Work through each dimension:

### 3.1 Communication Rules
Read the `communication` section of profile.json:
- `primary_language` → set the language rule
- `prompt_length_distribution` → if short_pct > 40%, add "keep responses concise"
- `negative_constraints.samples` → each sample is a real thing the user said. Extract
  the underlying rule. Example: "先不要push" → "Never push unless explicitly told to"
- `confirmation_patterns` → if continue_count is high, add "When user says 继续, just
  continue without re-explaining"

### 3.2 Decision Rules (MOST IMPORTANT)
Read the `decisions` section:
- `friction_details` is the GOLD MINE. Each entry has:
  - `goal`: what the user was trying to do
  - `friction`: what went wrong (Claude's mistake)
  - `type`: category of the mistake
- For EACH friction detail, extract a concrete rule that would prevent this mistake
  from happening again. Be specific. Example:
  - friction: "Claude assumed all conflicts should use isapreview's implementation"
  - rule: "NEVER batch-resolve merge conflicts. Review each conflict individually."

### 3.3 Scope Control Rules
Read the `red_flags` section:
- `negative_constraint_samples` → rules about what NOT to do
- `excessive_changes_count` → if > 5, strong signal for "only modify what was requested"
- Look for patterns in the samples about scope, permissions, pushing

### 3.4 Workflow Rules
Read the `workflow` section:
- `git_patterns.commit_without_push_signals` → commit vs push distinction
- `review_before_commit` → CR workflow
- `build_before_push` → build/test habits
- `branch_strategy_signals` → branch naming, merge strategy

### 3.5 Tool Usage
Read the `tools` section:
- Note dominant tools and any unusual patterns
- `active_hours.peak_hours` → timezone/schedule info

## Step 4: Compile, deduplicate, and rank

Take all generated rules and:
1. **Merge** rules that say the same thing differently (e.g., "don't push" and "先不要push" are the same rule)
2. **Rank** by importance:
   - Friction-derived rules = highest priority (these caused real problems)
   - Negative constraint rules = high priority (user explicitly said "don't")
   - Workflow rules = medium priority
   - Communication preferences = lower priority
3. **Select top 25-30** for compact version
4. **Keep all** for full version

## Step 5: Write output files

### File 1: ~/.claude-distill/skill-compact.md

Write using the Write tool. Format:

```markdown
---
name: [username]-style
version: 1.0.0
generated_by: claude-distill
generated_at: [current ISO date]
sessions_analyzed: [from profile.json data_sources.session_meta.count]
confidence: [from profile.json confidence_tier]
---

# [Username]'s Work Style

## Communication
- [rules about language, verbosity, response style]

## Decision Rules
- [rules extracted from friction events — most important section]

## Scope Control
- [rules about what NOT to change, permission requirements]

## Workflow
- [git workflow, review process, branch strategy]

## Red Flags
- [things that have caused problems before — never do these]
```

### File 2: ~/.claude-distill/skill-full.md

Same structure but ALL rules, with source annotations:
```
- Rule text *(from: friction — "Claude assumed...")*
```

### File 3: ~/.claude-distill/profile.json

Already exists from Step 1 (the binary output). This is the machine-readable profile
used by /distill-compare and /distill-gap.

## Step 6: Report to user

Tell the user:
1. How many sessions/prompts were analyzed
2. Confidence level
3. How many rules extracted (compact vs full)
4. File locations
5. How to use: "Copy `skill-compact.md` to any project's `.claude/skills/` directory,
   or add its content to your project's `CLAUDE.md`"

Then ask: "Want to review the generated rules? I can explain any rule or adjust them."
