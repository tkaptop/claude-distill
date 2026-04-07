import type { SessionMeta } from '../parsers/session-meta';

export interface ToolsProfile {
  usage_ranking: Array<{ tool: string; count: number }>;
  languages: Record<string, number>;
  active_hours: { peak_hours: number[] };
}

export function analyzeTools(sessions: SessionMeta[]): ToolsProfile {
  const toolCounts = new Map<string, number>();
  const langCounts: Record<string, number> = {};
  const hourCounts = new Map<number, number>();

  for (const s of sessions) {
    // Aggregate tool counts
    if (s.tool_counts) {
      for (const [tool, count] of Object.entries(s.tool_counts)) {
        toolCounts.set(tool, (toolCounts.get(tool) ?? 0) + count);
      }
    }

    // Aggregate languages
    if (s.languages) {
      for (const [lang, count] of Object.entries(s.languages)) {
        langCounts[lang] = (langCounts[lang] ?? 0) + count;
      }
    }

    // Aggregate active hours
    if (s.message_hours) {
      for (const h of s.message_hours) {
        hourCounts.set(h, (hourCounts.get(h) ?? 0) + 1);
      }
    }
  }

  const usage_ranking = [...toolCounts.entries()]
    .map(([tool, count]) => ({ tool, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  // Find top 3 peak hours
  const peak_hours = [...hourCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([hour]) => hour)
    .sort((a, b) => a - b);

  return { usage_ranking, languages: langCounts, active_hours: { peak_hours } };
}
