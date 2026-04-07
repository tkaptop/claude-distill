import { readdir } from "node:fs/promises";
import { join } from "node:path";

export interface SessionMeta {
  session_id: string;
  project_path?: string;
  start_time?: string;
  duration_minutes?: number;
  user_message_count?: number;
  assistant_message_count?: number;
  tool_counts?: Record<string, number>;
  languages?: Record<string, number>;
  git_commits?: number;
  git_pushes?: number;
  first_prompt?: string;
  user_interruptions?: number;
  tool_errors?: number;
  tool_error_categories?: Record<string, number>;
  lines_added?: number;
  lines_removed?: number;
  files_modified?: number;
  message_hours?: number[];
}

export interface SessionMetaData {
  sessions: SessionMeta[];
  totalCount: number;
}

function isRecordOfNumbers(val: unknown): val is Record<string, number> {
  if (typeof val !== "object" || val === null || Array.isArray(val)) return false;
  return Object.values(val).every((v) => typeof v === "number");
}

function parseSessionMetaObject(raw: Record<string, unknown>): SessionMeta | null {
  const session_id = typeof raw["session_id"] === "string" ? raw["session_id"] : undefined;
  if (!session_id) return null;

  const meta: SessionMeta = { session_id };

  if (typeof raw["project_path"] === "string") meta.project_path = raw["project_path"];
  if (typeof raw["start_time"] === "string") meta.start_time = raw["start_time"];
  if (typeof raw["duration_minutes"] === "number") meta.duration_minutes = raw["duration_minutes"];
  if (typeof raw["user_message_count"] === "number") meta.user_message_count = raw["user_message_count"];
  if (typeof raw["assistant_message_count"] === "number") meta.assistant_message_count = raw["assistant_message_count"];
  if (isRecordOfNumbers(raw["tool_counts"])) meta.tool_counts = raw["tool_counts"] as Record<string, number>;
  if (isRecordOfNumbers(raw["languages"])) meta.languages = raw["languages"] as Record<string, number>;
  if (typeof raw["git_commits"] === "number") meta.git_commits = raw["git_commits"];
  if (typeof raw["git_pushes"] === "number") meta.git_pushes = raw["git_pushes"];
  if (typeof raw["first_prompt"] === "string") meta.first_prompt = raw["first_prompt"];
  if (typeof raw["user_interruptions"] === "number") meta.user_interruptions = raw["user_interruptions"];
  if (typeof raw["tool_errors"] === "number") meta.tool_errors = raw["tool_errors"];
  if (isRecordOfNumbers(raw["tool_error_categories"])) meta.tool_error_categories = raw["tool_error_categories"] as Record<string, number>;
  if (typeof raw["lines_added"] === "number") meta.lines_added = raw["lines_added"];
  if (typeof raw["lines_removed"] === "number") meta.lines_removed = raw["lines_removed"];
  if (typeof raw["files_modified"] === "number") meta.files_modified = raw["files_modified"];

  if (Array.isArray(raw["message_hours"]) && raw["message_hours"].every((h) => typeof h === "number")) {
    meta.message_hours = raw["message_hours"] as number[];
  }

  return meta;
}

export async function parseSessionMeta(dirPath: string): Promise<SessionMetaData> {
  const empty: SessionMetaData = { sessions: [], totalCount: 0 };

  let fileNames: string[];
  try {
    fileNames = await readdir(dirPath);
  } catch (err) {
    console.warn(`[session-meta] Directory not found or unreadable: ${dirPath}`, err);
    return empty;
  }

  const jsonFiles = fileNames.filter((f) => f.endsWith(".json"));
  const sessions: SessionMeta[] = [];

  for (const fileName of jsonFiles) {
    const filePath = join(dirPath, fileName);
    let text: string;
    try {
      const file = Bun.file(filePath);
      text = await file.text();
    } catch (err) {
      console.warn(`[session-meta] Failed to read file: ${filePath}`, err);
      continue;
    }

    // Some files may have extra data after the first JSON object; extract the first object only
    let parsed: unknown;
    try {
      // Attempt full parse first
      parsed = JSON.parse(text);
    } catch {
      // Try to extract the first complete JSON object via a streaming approach
      try {
        const trimmed = text.trim();
        // Walk forward to find the balanced end of the first object or array
        let depth = 0;
        let inString = false;
        let escape = false;
        let end = -1;
        for (let i = 0; i < trimmed.length; i++) {
          const ch = trimmed[i];
          if (escape) { escape = false; continue; }
          if (ch === "\\" && inString) { escape = true; continue; }
          if (ch === '"') { inString = !inString; continue; }
          if (inString) continue;
          if (ch === "{" || ch === "[") depth++;
          else if (ch === "}" || ch === "]") {
            depth--;
            if (depth === 0) { end = i; break; }
          }
        }
        if (end !== -1) {
          parsed = JSON.parse(trimmed.slice(0, end + 1));
        } else {
          console.warn(`[session-meta] Could not extract JSON from: ${filePath}`);
          continue;
        }
      } catch {
        console.warn(`[session-meta] Skipping malformed file: ${filePath}`);
        continue;
      }
    }

    if (typeof parsed !== "object" || parsed === null) continue;

    const meta = parseSessionMetaObject(parsed as Record<string, unknown>);
    if (meta) {
      sessions.push(meta);
    }
  }

  return { sessions, totalCount: sessions.length };
}
