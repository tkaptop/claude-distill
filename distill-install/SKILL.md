---
name: distill-install
description: |
  Install data collection hooks for Claude Distill (Phase 2 - coming soon).
  Enhances distillation quality by collecting richer interaction data over time.
allowed-tools:
  - Bash
  - AskUserQuestion
---

# Claude Distill — Install Collection Hooks

**Status: Coming in Phase 2**

Currently, `/distill` analyzes existing Claude Code data (history.jsonl, session-meta, facets).

Phase 2 will add real-time collection hooks that capture richer signals:
- Tool call context and outcomes
- User correction events  
- Decision point logging

For now, use `/distill` to generate your work style skill from existing data.
The more you use Claude Code, the richer your profile becomes.
