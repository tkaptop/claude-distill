import type { HistoryEntry } from '../parsers/history';
import type { SessionMeta } from '../parsers/session-meta';

export interface WorkflowProfile {
  git_patterns: {
    total_commits: number;
    total_pushes: number;
    commit_without_push_signals: string[];
  };
  review_before_commit: boolean;
  build_before_push: boolean;
  branch_strategy_signals: string[];
}

const COMMIT_NO_PUSH_PATTERNS = [
  '先提交但不要push', '提交但不push', '提交代码吧，但不要push',
  '先不要push', '提交吧。', '提交把',
  '合并到main分支吧。先不要push',
];

const CR_BEFORE_COMMIT_PATTERNS = [
  'cr一下', 'CR一下', 'review', 'code review', '看一下代码',
  'cr一下，没问题就提交', 'cr一下，有问题修复，没问题就提交',
];

const BUILD_BEFORE_PUSH_PATTERNS = [
  '先build', 'build一下', '先测试', 'test一下', '看会不会出错',
];

const BRANCH_PATTERNS = [
  'preview分支', 'main分支', 'feature', '合并到preview', '合并到main',
  '切换到preview', 'push preview', 'push main',
];

function countMatches(entries: HistoryEntry[], patterns: string[]): number {
  let count = 0;
  for (const e of entries) {
    const lower = e.display.toLowerCase();
    if (patterns.some(p => lower.includes(p.toLowerCase()))) count++;
  }
  return count;
}

function findMatchingPrompts(entries: HistoryEntry[], patterns: string[]): string[] {
  const matches: string[] = [];
  for (const e of entries) {
    const lower = e.display.toLowerCase();
    if (patterns.some(p => lower.includes(p.toLowerCase()))) {
      matches.push(e.display.slice(0, 120));
    }
  }
  return matches.slice(0, 10);
}

export function analyzeWorkflow(entries: HistoryEntry[], sessions: SessionMeta[]): WorkflowProfile {
  let totalCommits = 0;
  let totalPushes = 0;
  for (const s of sessions) {
    totalCommits += s.git_commits ?? 0;
    totalPushes += s.git_pushes ?? 0;
  }

  const crCount = countMatches(entries, CR_BEFORE_COMMIT_PATTERNS);
  const buildCount = countMatches(entries, BUILD_BEFORE_PUSH_PATTERNS);

  return {
    git_patterns: {
      total_commits: totalCommits,
      total_pushes: totalPushes,
      commit_without_push_signals: findMatchingPrompts(entries, COMMIT_NO_PUSH_PATTERNS),
    },
    review_before_commit: crCount > 3,
    build_before_push: buildCount > 2,
    branch_strategy_signals: findMatchingPrompts(entries, BRANCH_PATTERNS),
  };
}
