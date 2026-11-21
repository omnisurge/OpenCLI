#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'dist', 'runtime-core');
const tsc = path.join(root, 'node_modules', '.bin', 'tsc');
if (!fs.existsSync(tsc)) throw new Error(`tsc not found: ${tsc}`);

fs.rmSync(outDir, { recursive: true, force: true });
execFileSync(tsc, ['-p', 'tsconfig.runtime-core.json'], { cwd: root, stdio: 'inherit' });

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const profilePkg = {
  name: '@jackwener/opencli',
  version: pkg.version,
  private: true,
  type: 'module',
  main: 'runtime-core.js',
  bin: { opencli: 'runtime-core.js', 'opencli-core': 'runtime-core.js' },
  opencliFork: pkg.opencliFork,
  exports: {
    './registry': './registry-api.js',
    './errors': './errors.js',
    './types': './types.js',
  },
  dependencies: {
    commander: pkg.dependencies.commander,
    'js-yaml': pkg.dependencies['js-yaml'],
    'cli-table3': pkg.dependencies['cli-table3'],
  },
};
fs.writeFileSync(path.join(outDir, 'package.json'), JSON.stringify(profilePkg, null, 2) + '\n');
const profileLock = path.join(root, 'release', 'inputs', 'runtime-core', 'package-lock.json');
if (fs.existsSync(profileLock)) fs.copyFileSync(profileLock, path.join(outDir, 'package-lock.json'));
fs.chmodSync(path.join(outDir, 'runtime-core.js'), 0o755);
console.log(`runtime-core profile written to ${path.relative(root, outDir)}`);
