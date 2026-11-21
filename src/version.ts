/**
 * Single source of truth for package version.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Dev: __dirname is src/ (one level to root).
// Prod: __dirname is dist/src/ (two levels to root).
// runtime-core profile: package.json is next to the compiled entry.
const packageDirCandidates = [
  __dirname,
  path.resolve(__dirname, '..'),
  path.resolve(__dirname, '../..'),
];
const _pkgDir = packageDirCandidates.find((dir) => fs.existsSync(path.join(dir, 'package.json'))) ?? packageDirCandidates[0];
const pkgJsonPath = path.join(_pkgDir, 'package.json');

interface PackageJsonShape {
  version?: unknown;
  opencliFork?: { distribution?: unknown };
}

const pkgJson: PackageJsonShape | null = (() => {
  try {
    return JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8')) as PackageJsonShape;
  } catch {
    return null;
  }
})();

export const PKG_VERSION: string =
  typeof pkgJson?.version === 'string' ? pkgJson.version : '0.0.0';

/** Parse a declared distribution identity; missing/invalid stamps fail open to upstream. */
export function parseDistribution(pkg: unknown): string | undefined {
  if (!pkg || typeof pkg !== 'object') return undefined;
  const opencliFork = (pkg as { opencliFork?: unknown }).opencliFork;
  if (!opencliFork || typeof opencliFork !== 'object') return undefined;
  const distribution = (opencliFork as { distribution?: unknown }).distribution;
  return typeof distribution === 'string' && distribution.trim() ? distribution.trim() : undefined;
}

/** Declared distribution identity from package.json; absent for upstream builds. */
export const PKG_DISTRIBUTION: string | undefined = parseDistribution(pkgJson);
