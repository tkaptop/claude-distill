export interface Rule {
  dimension: string; // "communication" | "decisions" | "scope_control" | "workflow" | "red_flags"
  text: string;
  priority: number; // 1-10, higher = more important
  source: string; // "friction", "prompt_pattern", "workflow_signal"
}

export interface SkillMetadata {
  name: string;
  version: string;
  generatedAt: string;
  sessionsAnalyzed: number;
  confidence: string;
}

export const DIMENSION_TITLES: Record<string, string> = {
  communication: "Communication",
  decisions: "Decision Rules",
  scope_control: "Scope Control",
  workflow: "Workflow",
  red_flags: "Red Flags",
};

export const DIMENSION_ORDER = [
  "communication",
  "decisions",
  "scope_control",
  "workflow",
  "red_flags",
];

export function generateCompactSkill(
  rules: Rule[],
  metadata: SkillMetadata
): string {
  // Sort rules by priority descending
  const sorted = [...rules].sort((a, b) => b.priority - a.priority);

  // Take top 30
  const top30 = sorted.slice(0, 30);

  // Group by dimension
  const grouped: Record<string, Rule[]> = {};
  for (const rule of top30) {
    const dim = rule.dimension || "workflow";
    if (!grouped[dim]) grouped[dim] = [];
    grouped[dim].push(rule);
  }

  const displayName =
    metadata.name.charAt(0).toUpperCase() + metadata.name.slice(1);

  // Build YAML frontmatter
  const frontmatter = [
    "---",
    `name: ${metadata.name}-style`,
    `version: ${metadata.version}`,
    `generated_by: claude-distill`,
    `generated_at: ${metadata.generatedAt}`,
    `sessions_analyzed: ${metadata.sessionsAnalyzed}`,
    `confidence: ${metadata.confidence}`,
    "---",
  ].join("\n");

  // Build body
  const sections: string[] = [`# ${displayName}'s Work Style`];

  for (const dim of DIMENSION_ORDER) {
    const dimRules = grouped[dim];
    if (!dimRules || dimRules.length === 0) continue;

    const title = DIMENSION_TITLES[dim] ?? dim;
    const lines = [`## ${title}`];
    for (const rule of dimRules) {
      lines.push(`- ${rule.text}`);
    }
    sections.push(lines.join("\n"));
  }

  // Include any dimensions not in DIMENSION_ORDER
  for (const dim of Object.keys(grouped)) {
    if (DIMENSION_ORDER.includes(dim)) continue;
    const dimRules = grouped[dim];
    const title = DIMENSION_TITLES[dim] ?? dim;
    const lines = [`## ${title}`];
    for (const rule of dimRules) {
      lines.push(`- ${rule.text}`);
    }
    sections.push(lines.join("\n"));
  }

  return [frontmatter, "", sections.join("\n\n"), ""].join("\n");
}
