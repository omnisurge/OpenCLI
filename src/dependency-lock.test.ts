import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Fork release floors for dependencies whose lockfile entries have regressed
 * below the approved embedded-runtime baseline. package.json is part of the
 * guard: a lockfile downgrade that still satisfies an older range is not enough
 * to pass this test.
 */
const APPROVED_FLOORS = {
  turndown: {
    version: '7.2.4',
    integrity: 'sha512-I8yFsfRzmzK0WV1pNNOA4A7y4RDfFxPRxb3t+e3ui14qSGOxGtiSP6GjeX+Y6CHb7HYaFj7ECUD7VE5kQMZWGQ==',
  },
  ws: {
    version: '8.22.0',
    integrity: 'sha512-Ydggc987+RO0AnWtZ/7Wq9FtNvcrL1b/RO0ud9mWjUPgDrsAAwQSF51sm2hm1XofbU/4jkpGEsLFsZZxU+1DOg==',
  },
} as const;

interface PackageJson {
  dependencies?: Record<string, string>;
}

interface Lockfile {
  packages?: Record<string, { version?: string; integrity?: string; dependencies?: Record<string, string> }>;
}

function readJson<T>(name: string): T {
  return JSON.parse(readFileSync(join(process.cwd(), name), 'utf8')) as T;
}

describe('approved dependency lock floors', () => {
  it('keeps package declarations and lockfile entries at the approved floors', () => {
    const pkg = readJson<PackageJson>('package.json');
    const lock = readJson<Lockfile>('package-lock.json');

    for (const [name, approved] of Object.entries(APPROVED_FLOORS)) {
      expect(pkg.dependencies?.[name], `package.json dependency: ${name}`).toBe(`^${approved.version}`);
      expect(lock.packages?.['']?.dependencies?.[name], `lock root dependency: ${name}`).toBe(pkg.dependencies?.[name]);
      const entry = lock.packages?.[`node_modules/${name}`];
      expect(entry, `lockfile entry: ${name}`).toBeDefined();
      expect(entry?.version, `lockfile version: ${name}`).toBe(approved.version);
      expect(entry?.integrity, `lockfile integrity: ${name}`).toBe(approved.integrity);
    }
  });
});
