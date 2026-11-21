#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'dist', 'runtime-core');
if (!fs.existsSync(outDir)) {
  console.error('runtime-core profile is not built; run npm run build:runtime-core first');
  process.exit(1);
}
const bannedDirs = ['clis', 'skills', 'scripts', 'browser', 'download', 'tests', 'docs'];
for (const dir of bannedDirs) {
  if (fs.existsSync(path.join(outDir, dir))) {
    console.error(`runtime-core contains forbidden directory: ${dir}`);
    process.exit(1);
  }
}
const bannedFiles = ['cli-manifest.json'];
for (const file of bannedFiles) {
  if (fs.existsSync(path.join(outDir, file))) {
    console.error(`runtime-core contains forbidden file: ${file}`);
    process.exit(1);
  }
}
const bannedSpecifiers = ['turndown', '@mixmark-io/domino', '@mozilla/readability', 'ws'];
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.js')) files.push(full);
  }
}
walk(outDir);
const importPattern = /(?:from\s*['"]|import\s*\(\s*['"]|import\s+['"]|require\s*\(\s*['"])([^'"]+)['"]/g;
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  for (const match of text.matchAll(importPattern)) {
    const spec = match[1];
    if (/(^|\/)(browser|download)(\/|$)/.test(spec) || bannedSpecifiers.some((dep) => spec === dep || spec.startsWith(dep + '/'))) {
      console.error(`runtime-core imports forbidden module ${spec}: ${path.relative(root, file)}`);
      process.exit(1);
    }
  }
}
if (files.some((file) => file.endsWith('.test.js'))) {
  console.error('runtime-core contains compiled test files');
  process.exit(1);
}
const pkg = JSON.parse(fs.readFileSync(path.join(outDir, 'package.json'), 'utf8'));
if (pkg.bin?.opencli !== 'runtime-core.js' || !pkg.opencliFork) {
  console.error('runtime-core package is missing bin.opencli or opencliFork metadata');
  process.exit(1);
}
if (!fs.existsSync(path.join(outDir, 'package-lock.json'))) {
  console.error('runtime-core package is missing package-lock.json');
  process.exit(1);
}
if (!fs.existsSync(path.join(outDir, 'npm-shrinkwrap.json'))) {
  console.error('runtime-core package is missing npm-shrinkwrap.json');
  process.exit(1);
}
for (const dep of bannedSpecifiers) {
  if (pkg.dependencies && dep in pkg.dependencies) {
    console.error(`runtime-core package declares forbidden dependency: ${dep}`);
    process.exit(1);
  }
}
console.log(`runtime-core boundary OK: ${files.length} JS files, deps=${Object.keys(pkg.dependencies ?? {}).join(',')}`);
