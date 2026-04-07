import type { HistoryEntry } from '../parsers/history';

export interface CommunicationProfile {
  primary_language: string;
  prompt_length_distribution: { short_pct: number; medium_pct: number; long_pct: number };
  top_keywords: Array<{ keyword: string; count: number }>;
  negative_constraints: { total: number; samples: string[] };
  confirmation_patterns: { continue_count: number; short_approval_count: number };
}

const KEYWORDS = [
  '改', '继续', 'push', 'cr', '看看', '怎么', '加', '修', '不要',
  'review', '为什么', '别', '帮我', '删', 'test', '部署', '检查', 'bug', 'commit', 'fix'
];

const NEGATIVE_WORDS = ['不要', '别', '不用', '不需要', '别动', '不改', '别改', '别碰', '不碰'];
const CONTINUE_WORDS = ['继续', '继续。', '继续吧', 'continue', '好 继续', '继续继续'];
const APPROVAL_WORDS = ['好', '行', 'ok', 'OK', '可以', '好的', '嗯', '对', '是的', 'yes', 'y', '1'];

function hasChinese(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text);
}

export function analyzeCommunication(entries: HistoryEntry[]): CommunicationProfile {
  if (entries.length === 0) {
    return {
      primary_language: 'unknown',
      prompt_length_distribution: { short_pct: 0, medium_pct: 0, long_pct: 0 },
      top_keywords: [],
      negative_constraints: { total: 0, samples: [] },
      confirmation_patterns: { continue_count: 0, short_approval_count: 0 },
    };
  }

  // Prompt length distribution
  let short = 0, medium = 0, long = 0;
  for (const e of entries) {
    const len = e.display.length;
    if (len < 20) short++;
    else if (len < 100) medium++;
    else long++;
  }
  const total = entries.length;

  // Language detection
  let chineseCount = 0;
  for (const e of entries) {
    if (hasChinese(e.display)) chineseCount++;
  }
  const chinesePct = chineseCount / total;
  const primary_language = chinesePct > 0.6 ? 'zh-CN' : chinesePct > 0.3 ? 'mixed' : 'en';

  // Keyword frequency
  const kwCounts = new Map<string, number>();
  for (const kw of KEYWORDS) kwCounts.set(kw, 0);
  for (const e of entries) {
    const lower = e.display.toLowerCase();
    for (const kw of KEYWORDS) {
      if (lower.includes(kw.toLowerCase())) {
        kwCounts.set(kw, (kwCounts.get(kw) ?? 0) + 1);
      }
    }
  }
  const top_keywords = [...kwCounts.entries()]
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  // Negative constraints
  const negativePrompts: string[] = [];
  for (const e of entries) {
    if (NEGATIVE_WORDS.some(w => e.display.includes(w))) {
      negativePrompts.push(e.display);
    }
  }

  // Confirmation patterns
  let continueCount = 0;
  let approvalCount = 0;
  for (const e of entries) {
    const trimmed = e.display.trim();
    if (CONTINUE_WORDS.includes(trimmed)) continueCount++;
    if (APPROVAL_WORDS.includes(trimmed)) approvalCount++;
  }

  return {
    primary_language,
    prompt_length_distribution: {
      short_pct: Math.round((short / total) * 100),
      medium_pct: Math.round((medium / total) * 100),
      long_pct: Math.round((long / total) * 100),
    },
    top_keywords,
    negative_constraints: {
      total: negativePrompts.length,
      samples: negativePrompts.slice(0, 20).map(p => p.slice(0, 120)),
    },
    confirmation_patterns: {
      continue_count: continueCount,
      short_approval_count: approvalCount,
    },
  };
}
