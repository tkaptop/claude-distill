import {
  Rule,
  SkillMetadata,
  DIMENSION_TITLES,
  DIMENSION_ORDER,
} from "./compact";

// Re-export for convenience
export type { Rule, SkillMetadata };

export function generateFullSkill(
  rules: Rule[],
  metadata: SkillMetadata
): string {
  // Sort rules by priority descending (keep ALL rules)
  const sorted = [...rules].sort((a, b) => b.priority - a.priority);

  // Group by dimension
  const grouped: Record<string, Rule[]> = {};
  for (const rule of sorted) {
    const dim = rule.dimension || "workflow";
    if (!grouped[dim]) grouped[dim] = [];
    grouped[dim].push(rule);
  }

  const displayName =
    metadata.name.charAt(0).toUpperCase() + metadata.name.slice(1);

  const totalRules = sorted.length;
  const compactCount = Math.min(30, totalRules);

  // Count by source type for statistics
  const frictionCount = sorted.filter((r) => r.source === "friction").length;
  const promptCount = sorted.filter(
    (r) => r.source === "prompt_pattern"
  ).length;

  // Build YAML frontmatter
  const frontmatter = [
    "---",
    `name: ${metadata.name}-style`,
    `version: ${metadata.version}`,
    `generated_by: claude-distill`,
    `generated_at: ${metadata.generatedAt}`,
    `sessions_analyzed: ${metadata.sessionsAnalyzed}`,
    `confidence: ${metadata.confidence}`,
    `type: full`,
    "---",
  ].join("\n");

  // Build header with summary blurb
  const header = [
    `# ${displayName}'s Work Style (Full Profile)`,
    "",
    `> This is the complete work style profile with ${totalRules} rules.`,
    `> For the compact version (top ${compactCount} rules), see skill-compact.md.`,
  ].join("\n");

  // Build dimension sections with source + priority annotations
  const dimOrder = [...DIMENSION_ORDER];
  // Append any dimensions not in the standard order
  for (const dim of Object.keys(grouped)) {
    if (!dimOrder.includes(dim)) dimOrder.push(dim);
  }

  const sections: string[] = [];
  for (const dim of dimOrder) {
    const dimRules = grouped[dim];
    if (!dimRules || dimRules.length === 0) continue;

    const title = DIMENSION_TITLES[dim] ?? dim;
    const lines = [`## ${title}`];
    for (const rule of dimRules) {
      const sourceLabel = formatSourceLabel(rule.source);
      lines.push(
        `- ${rule.text} *(source: ${sourceLabel}, priority: ${rule.priority})*`
      );
    }
    sections.push(lines.join("\n"));
  }

  // Build statistics section
  const stats = [
    "## Statistics",
    `- Sessions analyzed: ${metadata.sessionsAnalyzed}`,
    `- Confidence: ${metadata.confidence}`,
    `- Total rules: ${totalRules}`,
    `- Friction events analyzed: ${frictionCount}`,
    `- Prompts analyzed: ${promptCount}`,
  ].join("\n");

  const body = [header, ...sections, stats].join("\n\n");

  return [frontmatter, "", body, ""].join("\n");
}

function formatSourceLabel(source: string): string {
  switch (source) {
    case "friction":
      return "friction event";
    case "prompt_pattern":
      return "prompt pattern";
    case "workflow_signal":
      return "workflow signal";
    default:
      return source;
  }
}
