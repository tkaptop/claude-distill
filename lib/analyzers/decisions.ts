import type { Facet } from '../parsers/facets';

export interface DecisionsProfile {
  friction_summary: Record<string, number>;
  friction_details: Array<{ goal: string; friction: string; type: string }>;
  outcomes: Record<string, number>;
  session_types: Record<string, number>;
  satisfaction: Record<string, number>;
}

export function analyzeDecisions(facets: Facet[]): DecisionsProfile {
  const friction_summary: Record<string, number> = {};
  const friction_details: Array<{ goal: string; friction: string; type: string }> = [];
  const outcomes: Record<string, number> = {};
  const session_types: Record<string, number> = {};
  const satisfaction: Record<string, number> = {};

  for (const f of facets) {
    // Aggregate friction counts
    if (f.friction_counts) {
      for (const [key, val] of Object.entries(f.friction_counts)) {
        friction_summary[key] = (friction_summary[key] ?? 0) + val;
      }
    }

    // Collect friction details (raw text for LLM)
    if (f.friction_detail && f.underlying_goal) {
      const primaryType = f.friction_counts
        ? Object.entries(f.friction_counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'unknown'
        : 'unknown';
      friction_details.push({
        goal: f.underlying_goal,
        friction: f.friction_detail,
        type: primaryType,
      });
    }

    // Aggregate outcomes
    if (f.outcome) {
      outcomes[f.outcome] = (outcomes[f.outcome] ?? 0) + 1;
    }

    // Aggregate session types
    if (f.session_type) {
      session_types[f.session_type] = (session_types[f.session_type] ?? 0) + 1;
    }

    // Aggregate satisfaction
    if (f.user_satisfaction_counts) {
      for (const [key, val] of Object.entries(f.user_satisfaction_counts)) {
        satisfaction[key] = (satisfaction[key] ?? 0) + val;
      }
    }
  }

  return { friction_summary, friction_details, outcomes, session_types, satisfaction };
}
