# Claude Distill

> Distill your AI work style into a portable skill file.

One command turns hundreds of Claude Code interactions into a reusable **skill.md** that encodes your decision patterns, communication style, workflow preferences, and red flags. Give it to a new hire, and Claude Code works like you do.

## What it does

```
149 sessions + 9152 prompts + 69 friction events
                    ↓
        bin/distill-analyze (data preprocessing)
                    ↓
              profile.json (structured behavioral data)
                    ↓
        Claude reads profile → generates rules
                    ↓
    skill-compact.md (30 rules) + skill-full.md (all rules)
```

## Install

```bash
git clone https://github.com/user/claude-distill ~/.claude/skills/claude-distill
cd ~/.claude/skills/claude-distill && ./setup
```

## Usage

### In Claude Code (recommended)

```
> /distill
```

Claude reads your usage data, analyzes patterns, and generates a skill file.

### CLI

```bash
cd ~/.claude/skills/claude-distill
bun run distill
```

Outputs `~/.claude-distill/profile.json`. Use `/distill` in Claude Code to generate rules from it.

## Output

### skill-compact.md (example)

```markdown
# Bryan's Work Style

## Communication
- Use Chinese as primary language. Keep responses short and direct.
- When I say "继续", just continue without re-explaining.
- Never summarize what you just did at the end of a response.

## Decision Rules
- NEVER batch-resolve merge conflicts. Review each individually.
- NEVER push code unless I explicitly say "push".
- Fix actual code logic when fixing bugs. Never just add comments.

## Scope Control
- Only modify what was explicitly requested.
- If you think other files need changes, list them and ask first.

## Red Flags
- Do NOT assume what I want without reading the code first.
- Do NOT remove features/props/UI elements without asking.
- Do NOT confuse similar concepts (cost vs price, model tiers).
```

### How to use your skill

Copy the generated skill file to any project:

```bash
cp ~/.claude-distill/skill-compact.md /your-project/.claude/skills/my-style/SKILL.md
```

Or add the rules to your project's `CLAUDE.md`.

## How it works

1. **Data Collection** — Reads Claude Code's local files:
   - `~/.claude/history.jsonl` — every prompt you've sent
   - `~/.claude/usage-data/session-meta/` — session statistics
   - `~/.claude/usage-data/facets/` — semantic analysis of each session

2. **Preprocessing** — 5 analyzers extract structured signals:
   - Communication style (language, verbosity, keywords)
   - Decision patterns (friction events, outcomes)
   - Workflow preferences (git habits, review patterns)
   - Red flags (negative constraints, scope issues)
   - Tool usage (preferred tools, active hours)

3. **Rule Generation** — Claude (in `/distill` mode) reads the preprocessed profile and generates human-readable rules using its language understanding. This is why rules are high quality — the LLM understands context, not just keywords.

4. **Privacy** — Everything runs locally. No data is uploaded anywhere. The sanitizer can strip project names, emails, and business details for a shareable public version.

## Privacy

All data stays on your machine. The tool reads local files and writes local files.

For sharing your skill publicly:
- `skill-compact.md` — private version (may contain project-specific references)
- Use `/distill` with sanitization to generate a clean public version

## Requirements

- [Bun](https://bun.sh) runtime
- Claude Code with some usage history (20+ sessions recommended)

## Roadmap

- [x] Phase 0-1: Core distillation + open source release
- [ ] Phase 2: Real-time data collection hooks
- [ ] Phase 3: Skill comparison + gap analysis

## License

MIT
