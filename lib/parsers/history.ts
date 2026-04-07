// Each line: {"display":"...", "pastedContents":{}, "timestamp":..., "project":"...", "sessionId":"..."}

export interface HistoryEntry {
  display: string;
  timestamp: number;
  project: string;
  sessionId: string;
}

export interface HistoryData {
  entries: HistoryEntry[];
  totalCount: number;
  projects: Map<string, number>; // project path -> count
  sessionIds: Set<string>;
}

export async function parseHistory(path: string): Promise<HistoryData> {
  const empty: HistoryData = {
    entries: [],
    totalCount: 0,
    projects: new Map(),
    sessionIds: new Set(),
  };

  let text: string;
  try {
    const file = Bun.file(path);
    const exists = await file.exists();
    if (!exists) {
      console.warn(`[history] File not found: ${path}`);
      return empty;
    }
    text = await file.text();
  } catch (err) {
    console.warn(`[history] Failed to read file: ${path}`, err);
    return empty;
  }

  const entries: HistoryEntry[] = [];
  const projects = new Map<string, number>();
  const sessionIds = new Set<string>();

  const lines = text.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      // skip malformed lines
      continue;
    }

    if (typeof parsed !== "object" || parsed === null) continue;

    const raw = parsed as Record<string, unknown>;

    const display = typeof raw["display"] === "string" ? raw["display"] : undefined;
    const timestamp = typeof raw["timestamp"] === "number" ? raw["timestamp"] : undefined;
    const project = typeof raw["project"] === "string" ? raw["project"] : undefined;
    const sessionId = typeof raw["sessionId"] === "string" ? raw["sessionId"] : undefined;

    // All four fields are required
    if (
      display === undefined ||
      timestamp === undefined ||
      project === undefined ||
      sessionId === undefined
    ) {
      continue;
    }

    const entry: HistoryEntry = { display, timestamp, project, sessionId };
    entries.push(entry);

    projects.set(project, (projects.get(project) ?? 0) + 1);
    sessionIds.add(sessionId);
  }

  return {
    entries,
    totalCount: entries.length,
    projects,
    sessionIds,
  };
}
