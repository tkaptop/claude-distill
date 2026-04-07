export interface SanitizerConfig {
  projectNames: string[];       // extracted from history data
  userNames: string[];          // from system (whoami)
  customSensitiveWords: string[]; // user-provided
}

export function sanitize(content: string, config: SanitizerConfig): string {
  let result = content;

  // Remove lines containing secrets (case insensitive)
  result = result
    .split("\n")
    .filter((line) => !/API_KEY|SECRET|TOKEN/i.test(line))
    .join("\n");

  // Replace absolute paths: /Users/xxx/... → /Users/[user]/...
  result = result.replace(/\/Users\/[^/\s"'`]+/g, "/Users/[user]");

  // Replace email patterns
  result = result.replace(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, "[email]");

  // Replace URL/domain patterns (http/https URLs and bare domains)
  result = result.replace(/https?:\/\/[^\s"'`<>]+/g, "[url]");
  result = result.replace(
    /\b(?:[a-zA-Z0-9\-]+\.)+(?:com|io|dev|app|net|org|ai|co|sh|xyz)\b/g,
    "[url]"
  );

  // Replace monetary amounts ($X, ¥X, X USD, X CNY)
  result = result.replace(/\$[\d,]+(?:\.\d+)?/g, "[amount]");
  result = result.replace(/¥[\d,]+(?:\.\d+)?/g, "[amount]");
  result = result.replace(/[\d,]+(?:\.\d+)?\s*(?:USD|CNY|RMB)\b/gi, "[amount]");

  // Replace usernames
  for (const userName of config.userNames) {
    if (!userName) continue;
    const escaped = escapeRegex(userName);
    result = result.replace(new RegExp(escaped, "g"), "[user]");
  }

  // Replace project names
  // Sort by length descending to replace longer names first (avoid partial matches)
  const sortedProjects = [...config.projectNames].sort(
    (a, b) => b.length - a.length
  );

  const projectLabels: Record<string, string> = {};
  let labelIndex = 0;

  for (const project of sortedProjects) {
    if (!project) continue;

    if (!projectLabels[project]) {
      projectLabels[project] = `[project-${String.fromCharCode(65 + labelIndex)}]`;
      labelIndex++;
    }

    const label = projectLabels[project];
    const escaped = escapeRegex(project);

    if (project.length < 4) {
      // Short names: only replace when adjacent to path separators or common prefixes
      const shortPattern = new RegExp(
        `(?<=[\\/\\-_.~])${escaped}(?=[\\/\\-_.~\\s]|$)`,
        "g"
      );
      result = result.replace(shortPattern, label);
    } else {
      result = result.replace(new RegExp(escaped, "g"), label);
    }
  }

  // Replace custom sensitive words
  for (const word of config.customSensitiveWords) {
    if (!word) continue;
    const escaped = escapeRegex(word);
    result = result.replace(new RegExp(escaped, "gi"), "[redacted]");
  }

  return result;
}

export function buildSanitizerConfig(
  projectPaths: string[],
  userName: string
): SanitizerConfig {
  // Extract unique project names from project paths (last path segment)
  const projectNames = [
    ...new Set(
      projectPaths
        .map((p) => p.split("/").filter(Boolean).pop() ?? "")
        .filter((name) => name.length > 0)
    ),
  ];

  return {
    projectNames,
    userNames: [userName].filter(Boolean),
    customSensitiveWords: [],
  };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
