/**
 * Embedded-runtime contracts (ADR 0003).
 *
 * Three opt-in environment contracts for hosts embedding OpenCLI. Every one
 * is fail-open: unset (or empty) means byte-identical behaviour to upstream.
 *
 * - OPENCLI_HOME: unified state root replacing every ~/.opencli derivation.
 * - OPENCLI_EXTRA_CLIS_DIR: path.delimiter-separated extra adapter dirs.
 * - OPENCLI_EMBEDDED: master switch suppressing the update-notifier chain.
 */

import * as os from 'node:os';
import * as path from 'node:path';

function nonEmptyEnv(name: string): string | undefined {
  const raw = process.env[name];
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Resolve the OpenCLI state root (the "~/.opencli" directory).
 *
 * OPENCLI_HOME, when non-empty, is trimmed and resolved to an absolute path
 * and REPLACES the whole ~/.opencli root (it is the root, not a parent).
 * When unset, every caller gets the same path it computed before:
 * defaultHome + '/.opencli'.
 *
 * @param defaultHome home base used by the caller when OPENCLI_HOME is unset;
 *   defaults to os.homedir(). plugin.ts passes its own getHomeDir() so its
 *   HOME/USERPROFILE override semantics are preserved.
 */
export function opencliRoot(defaultHome: string = os.homedir()): string {
  const configured = nonEmptyEnv('OPENCLI_HOME');
  if (configured) return path.resolve(configured);
  return path.join(defaultHome, '.opencli');
}

/**
 * Parse OPENCLI_EXTRA_CLIS_DIR into a list of extra adapter directories.
 * Entries are path.delimiter-separated; empty segments are dropped, each
 * surviving segment is trimmed, resolved against the process cwd, and
 * deduplicated. No ~ expansion or realpath/symlink normalisation — discovery
 * treats the entries exactly like the built-in clis dir.
 */
export function extraClisDirs(env: string | undefined = process.env.OPENCLI_EXTRA_CLIS_DIR): string[] {
  if (env === undefined) return [];
  const seen = new Set<string>();
  const dirs: string[] = [];
  for (const raw of env.split(path.delimiter)) {
    const trimmed = raw.trim();
    if (trimmed.length === 0) continue;
    const resolved = path.resolve(trimmed);
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    dirs.push(resolved);
  }
  return dirs;
}

/**
 * Embedded-runtime master switch: OPENCLI_EMBEDDED non-empty means the process
 * is driven by a host product, so exit update notices and the background
 * update fetch are suppressed at their call sites. OPENCLI_NO_UPDATE_NOTIFIER
 * stays an independent opt-out (ADR 0001).
 */
export function isEmbeddedRuntime(): boolean {
  return nonEmptyEnv('OPENCLI_EMBEDDED') !== undefined;
}
