import type { Facet } from '../parsers/facets';
import type { HistoryEntry } from '../parsers/history';

export interface FrictionProfile {
  top_friction_types: Array<{ type: string; count: number; pct: number }>;
  negative_constraint_samples: string[];
  excessive_changes_count: number;
  friction_details_for_llm: Array<{ goal: string; friction: string }>;
}

const NEGATIVE_WORDS = ['不要', '别', '不用', '不需要', '别动', '不改', '别改', '别碰', '你不要乱改'];

export function analyzeFriction(facets: Facet[], entries: HistoryEntry[]): FrictionProfile {
  // Aggregate friction types
  const frictionCounts = new Map<string, number>();
  let totalFriction = 0;

  for (const f of facets) {
    if (f.friction_counts) {
      for (const [key, val] of Object.entries(f.friction_counts)) {
        frictionCounts.set(key, (frictionCounts.get(key) ?? 0) + val);
        totalFriction += val;
      }
    }
  }

  const top_friction_types = [...frictionCounts.entries()]
    .map(([type, count]) => ({
      type,
      count,
      pct: totalFriction > 0 ? Math.round((count / totalFriction) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Collect negative constraint prompts
  const negativePrompts: string[] = [];
  for (const e of entries) {
    if (NEGATIVE_WORDS.some(w => e.display.includes(w))) {
      negativePrompts.push(e.display.slice(0, 120));
    }
  }

  // Count excessive_changes
  let excessiveCount = 0;
  for (const f of facets) {
    if (f.friction_counts?.['excessive_changes']) {
      excessiveCount += f.friction_counts['excessive_changes'];
    }
  }

  // Collect ALL friction details for LLM analysis
  const friction_details_for_llm: Array<{ goal: string; friction: string }> = [];
  for (const f of facets) {
    if (f.friction_detail && f.underlying_goal) {
      friction_details_for_llm.push({
        goal: f.underlying_goal,
        friction: f.friction_detail,
      });
    }
  }

  return {
    top_friction_types,
    negative_constraint_samples: negativePrompts.slice(0, 20),
    excessive_changes_count: excessiveCount,
    friction_details_for_llm,
  };
}
