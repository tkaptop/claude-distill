#!/usr/bin/env bun
/**
 * distill-analyze — Claude Distill data collection and preprocessing binary.
 *
 * Reads Claude Code local data files, runs all preprocessors, and outputs
 * a structured profile.json that the LLM uses to generate rules.
 *
 * Usage:
 *   bun run bin/distill-analyze.ts
 *   ./dist/distill-analyze  (compiled binary)
 */

import { parseHistory } from '../lib/parsers/history';
import { parseSessionMeta } from '../lib/parsers/session-meta';
import { parseFacets } from '../lib/parsers/facets';
import { analyzeCommunication } from '../lib/analyzers/communication';
import { analyzeDecisions } from '../lib/analyzers/decisions';
import { analyzeWorkflow } from '../lib/analyzers/workflow';
import { analyzeFriction } from '../lib/analyzers/friction';
import { analyzeTools } from '../lib/analyzers/tools';
import { mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const HOME = homedir();
const CLAUDE_DIR = join(HOME, '.claude');
const OUTPUT_DIR = join(HOME, '.claude-distill');

async function main() {
  console.log('Claude Distill — Analyzing your Claude Code usage data...\n');

  // Phase 1: Parse data sources
  console.log('Reading data sources...');

  const [historyData, sessionData, facetsData] = await Promise.all([
    parseHistory(join(CLAUDE_DIR, 'history.jsonl')),
    parseSessionMeta(join(CLAUDE_DIR, 'usage-data', 'session-meta')),
    parseFacets(join(CLAUDE_DIR, 'usage-data', 'facets')),
  ]);

  console.log(`  history.jsonl: ${historyData.totalCount} entries`);
  console.log(`  session-meta:  ${sessionData.totalCount} sessions`);
  console.log(`  facets:        ${facetsData.totalCount} facets`);

  // Diagnose data sufficiency
  const totalSessions = sessionData.totalCount || historyData.sessionIds.size;
  const totalFacets = facetsData.totalCount;
  let confidenceTier: string;

  if (totalSessions < 20 || totalFacets < 10) {
    confidenceTier = 'low';
    console.warn('\n⚠ Low data volume (<20 sessions). Skill quality will be limited.');
    console.warn('  Use Claude Code more, then re-run /distill for better results.\n');
  } else if (totalSessions < 100) {
    confidenceTier = 'normal';
  } else {
    confidenceTier = 'high';
  }

  if (historyData.totalCount === 0) {
    console.error('\n✗ No history data found at ~/.claude/history.jsonl');
    console.error('  Make sure you have used Claude Code before running this tool.');
    process.exit(1);
  }

  // Phase 2: Run preprocessors
  console.log('\nRunning analyzers...');

  const communication = analyzeCommunication(historyData.entries);
  console.log('  ✓ Communication style');

  const decisions = analyzeDecisions(facetsData.facets);
  console.log('  ✓ Decision patterns');

  const workflow = analyzeWorkflow(historyData.entries, sessionData.sessions);
  console.log('  ✓ Workflow preferences');

  const friction = analyzeFriction(facetsData.facets, historyData.entries);
  console.log('  ✓ Friction patterns');

  const tools = analyzeTools(sessionData.sessions);
  console.log('  ✓ Tool usage');

  // Phase 3: Build profile.json
  const projects = [...historyData.projects.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([path, sessions]) => ({
      name: path.split('/').pop() ?? path,
      sessions,
    }));

  const profile = {
    version: '1.0',
    generated_at: new Date().toISOString(),
    data_sources: {
      history: {
        exists: historyData.totalCount > 0,
        entries: historyData.totalCount,
        path: join(CLAUDE_DIR, 'history.jsonl'),
      },
      session_meta: {
        exists: sessionData.totalCount > 0,
        count: sessionData.totalCount,
        path: join(CLAUDE_DIR, 'usage-data', 'session-meta'),
      },
      facets: {
        exists: facetsData.totalCount > 0,
        count: facetsData.totalCount,
        path: join(CLAUDE_DIR, 'usage-data', 'facets'),
      },
    },
    confidence_tier: confidenceTier,
    communication,
    decisions,
    workflow,
    red_flags: friction,
    tools,
    projects,
  };

  // Phase 4: Write output
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const outputPath = join(OUTPUT_DIR, 'profile.json');
  writeFileSync(outputPath, JSON.stringify(profile, null, 2));

  console.log(`\n✓ Profile written to ${outputPath}`);
  console.log(`  Confidence: ${confidenceTier}`);
  console.log(`  Sessions: ${totalSessions}`);
  console.log(`  Friction events: ${friction.friction_details_for_llm.length}`);
  console.log(`  Negative constraints: ${friction.negative_constraint_samples.length}`);
  console.log(`  Projects: ${projects.length}`);
  console.log('\nRun /distill in Claude Code to generate your skill file.');
}

main().catch((err) => {
  console.error('Error:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
