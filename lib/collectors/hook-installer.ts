/**
 * hook-installer.ts — Install/uninstall Claude Distill hooks in CC settings.json
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const SETTINGS_PATH = join(homedir(), '.claude', 'settings.json');
const HOOKS_DIR = join(homedir(), '.claude', 'skills', 'claude-distill', 'hooks');

interface HookEntry {
  type: string;
  command: string;
  async?: boolean;
}

interface HookMatcher {
  matcher: string;
  hooks: HookEntry[];
}

interface Settings {
  hooks?: Record<string, HookMatcher[]>;
  [key: string]: unknown;
}

const DISTILL_HOOKS: Record<string, HookMatcher> = {
  UserPromptSubmit: {
    matcher: '',
    hooks: [{ type: 'command', command: `"${HOOKS_DIR}/log-prompt.sh"`, async: true }],
  },
  PreToolUse: {
    matcher: '',
    hooks: [{ type: 'command', command: `"${HOOKS_DIR}/log-tool-use.sh"`, async: true }],
  },
  PostToolUse: {
    matcher: '',
    hooks: [{ type: 'command', command: `"${HOOKS_DIR}/log-tool-use.sh"`, async: true }],
  },
  PermissionDenied: {
    matcher: '',
    hooks: [{ type: 'command', command: `"${HOOKS_DIR}/log-rejection.sh"`, async: true }],
  },
  SessionStart: {
    matcher: 'startup',
    hooks: [{ type: 'command', command: `"${HOOKS_DIR}/log-session.sh"`, async: true }],
  },
  SessionEnd: {
    matcher: '',
    hooks: [{ type: 'command', command: `"${HOOKS_DIR}/log-session.sh"`, async: true }],
  },
};

function isDistillHook(entry: HookMatcher): boolean {
  return entry.hooks?.some(h => h.command?.includes('claude-distill')) ?? false;
}

function readSettings(): Settings {
  if (!existsSync(SETTINGS_PATH)) return {};
  try {
    return JSON.parse(readFileSync(SETTINGS_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function writeSettings(settings: Settings): void {
  const tmp = SETTINGS_PATH + '.tmp';
  writeFileSync(tmp, JSON.stringify(settings, null, 2) + '\n');
  const { renameSync } = require('node:fs');
  renameSync(tmp, SETTINGS_PATH);
}

export function installHooks(): { installed: string[]; skipped: string[] } {
  const settings = readSettings();
  if (!settings.hooks) settings.hooks = {};

  const installed: string[] = [];
  const skipped: string[] = [];

  for (const [event, hookDef] of Object.entries(DISTILL_HOOKS)) {
    if (!settings.hooks[event]) settings.hooks[event] = [];

    const alreadyInstalled = settings.hooks[event].some(isDistillHook);
    if (alreadyInstalled) {
      skipped.push(event);
      continue;
    }

    settings.hooks[event].push(hookDef);
    installed.push(event);
  }

  if (installed.length > 0) {
    writeSettings(settings);
  }

  return { installed, skipped };
}

export function uninstallHooks(): { removed: string[] } {
  const settings = readSettings();
  if (!settings.hooks) return { removed: [] };

  const removed: string[] = [];

  for (const event of Object.keys(DISTILL_HOOKS)) {
    if (!settings.hooks[event]) continue;
    const before = settings.hooks[event].length;
    settings.hooks[event] = settings.hooks[event].filter(e => !isDistillHook(e));
    if (settings.hooks[event].length < before) removed.push(event);
    if (settings.hooks[event].length === 0) delete settings.hooks[event];
  }

  if (Object.keys(settings.hooks).length === 0) delete settings.hooks;
  if (removed.length > 0) writeSettings(settings);

  return { removed };
}

export function getHookStatus(): { event: string; installed: boolean }[] {
  const settings = readSettings();
  return Object.keys(DISTILL_HOOKS).map(event => ({
    event,
    installed: settings.hooks?.[event]?.some(isDistillHook) ?? false,
  }));
}
