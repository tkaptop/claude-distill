import { readdir } from "node:fs/promises";
import { join } from "node:path";

export interface Facet {
  session_id?: string;
  underlying_goal?: string;
  goal_categories?: Record<string, number>;
  outcome?: string;
  user_satisfaction_counts?: Record<string, number>;
  claude_helpfulness?: string;
  session_type?: string;
  friction_counts?: Record<string, number>;
  friction_detail?: string;
  primary_success?: string;
  brief_summary?: string;
}

export interface FacetsData {
  facets: Facet[];
  totalCount: number;
}

function isRecordOfNumbers(val: unknown): val is Record<string, number> {
  if (typeof val !== "object" || val === null || Array.isArray(val)) return false;
  return Object.values(val).every((v) => typeof v === "number");
}

function parseFacetObject(raw: Record<string, unknown>): Facet {
  const facet: Facet = {};

  if (typeof raw["session_id"] === "string") facet.session_id = raw["session_id"];
  if (typeof raw["underlying_goal"] === "string") facet.underlying_goal = raw["underlying_goal"];
  if (isRecordOfNumbers(raw["goal_categories"])) facet.goal_categories = raw["goal_categories"] as Record<string, number>;
  if (typeof raw["outcome"] === "string") facet.outcome = raw["outcome"];
  if (isRecordOfNumbers(raw["user_satisfaction_counts"])) facet.user_satisfaction_counts = raw["user_satisfaction_counts"] as Record<string, number>;
  if (typeof raw["claude_helpfulness"] === "string") facet.claude_helpfulness = raw["claude_helpfulness"];
  if (typeof raw["session_type"] === "string") facet.session_type = raw["session_type"];
  if (isRecordOfNumbers(raw["friction_counts"])) facet.friction_counts = raw["friction_counts"] as Record<string, number>;
  if (typeof raw["friction_detail"] === "string") facet.friction_detail = raw["friction_detail"];
  if (typeof raw["primary_success"] === "string") facet.primary_success = raw["primary_success"];
  if (typeof raw["brief_summary"] === "string") facet.brief_summary = raw["brief_summary"];

  return facet;
}

export async function parseFacets(dirPath: string): Promise<FacetsData> {
  const empty: FacetsData = { facets: [], totalCount: 0 };

  let fileNames: string[];
  try {
    fileNames = await readdir(dirPath);
  } catch (err) {
    console.warn(`[facets] Directory not found or unreadable: ${dirPath}`, err);
    return empty;
  }

  const jsonFiles = fileNames.filter((f) => f.endsWith(".json"));
  const facets: Facet[] = [];

  for (const fileName of jsonFiles) {
    const filePath = join(dirPath, fileName);
    let text: string;
    try {
      const file = Bun.file(filePath);
      text = await file.text();
    } catch (err) {
      console.warn(`[facets] Failed to read file: ${filePath}`, err);
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      console.warn(`[facets] Skipping malformed file: ${filePath}`);
      continue;
    }

    if (typeof parsed !== "object" || parsed === null) continue;

    facets.push(parseFacetObject(parsed as Record<string, unknown>));
  }

  return { facets, totalCount: facets.length };
}
