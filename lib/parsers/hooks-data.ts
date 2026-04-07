/**
 * hooks-data.ts — Parse collected hook data from ~/.claude-distill/collected/
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const COLLECTED_DIR = join(homedir(), '.claude-distill', 'collected');

export interface CollectedPrompt {
  ts: string;
  session_id: string;
  prompt: string;
  cwd: string;
}

export interface CollectedToolUse {
  ts: string;
  event: string; // "PreToolUse" | "PostToolUse"
  session_id: string;
  tool: string;
  input: Record<string, unknown>;
  cwd: string;
  result?: string;
}

export interface CollectedRejection {
  ts: string;
  session_id: string;
  tool: string;
  input: Record<string, unknown>;
  cwd: string;
}

export interface CollectedSession {
  ts: string;
  event: string; // "SessionStart" | "SessionEnd"
  session_id: string;
  cwd: string;
  source?: string;
}

export interface HooksData {
  prompts: CollectedPrompt[];
  toolUses: CollectedToolUse[];
  rejections: CollectedRejection[];
  sessions: CollectedSession[];
  hasData: boolean;
}

async function parseJsonl<T>(filePath: string): Promise<T[]> {
  if (!existsSync(filePath)) return [];
  try {
    const content = await Bun.file(filePath).text();
    const results: T[] = [];
    for (const line of content.split('\n')) {
      if (!line.trim()) continue;
      try {
        results.push(JSON.parse(line) as T);
      } catch {
        // skip malformed lines
      }
    }
    return results;
  } catch {
    return [];
  }
}

export async function parseHooksData(): Promise<HooksData> {
  const [prompts, toolUses, rejections, sessions] = await Promise.all([
    parseJsonl<CollectedPrompt>(join(COLLECTED_DIR, 'prompts.jsonl')),
    parseJsonl<CollectedToolUse>(join(COLLECTED_DIR, 'tools.jsonl')),
    parseJsonl<CollectedRejection>(join(COLLECTED_DIR, 'rejections.jsonl')),
    parseJsonl<CollectedSession>(join(COLLECTED_DIR, 'sessions.jsonl')),
  ]);

  return {
    prompts,
    toolUses,
    rejections,
    sessions,
    hasData: prompts.length > 0 || toolUses.length > 0 || rejections.length > 0,
  };
}
