#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CORE_VERSION } from './runtime-core-version.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const profileDir = path.join(root, 'dist', 'runtime-core');
if (!fs.existsSync(path.join(profileDir, 'runtime-core.js'))) {
  throw new Error('runtime-core profile is not built; run npm run build:runtime-core first');
}
const pkg = JSON.parse(fs.readFileSync(path.join(profileDir, 'package.json'), 'utf8'));
if (pkg.version !== CORE_VERSION) throw new Error(`runtime-core package version ${pkg.version} != ${CORE_VERSION}`);
const tempDir = fs.mkdtempSync(path.join(root, 'dist', '.runtime-core-pack-'));
execFileSync('npm', ['pack', '--pack-destination', tempDir], { cwd: profileDir, stdio: 'inherit' });
const packed = fs.readdirSync(tempDir).find((name) => name.endsWith('.tgz'));
if (!packed) throw new Error('npm pack did not produce a tgz');
const target = path.join(root, 'dist', `opencli-runtime-core-${pkg.version}.tgz`);
fs.copyFileSync(path.join(tempDir, packed), target);
fs.rmSync(tempDir, { recursive: true, force: true });
const hash = crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex');
fs.writeFileSync(`${target}.sha256`, `${hash}  ${path.basename(target)}\n`);
console.log(`${target}\n${hash}  ${path.basename(target)}`);
