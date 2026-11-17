#!/usr/bin/env node
/**
 * check-docs.mjs — omnisurge OpenCLI fork documentation oracle.
 *
 * Checks:
 *  1. every markdown file under docs/ belongs to a declared layer;
 *  2. relative links in docs/, root governance files, and AGENTS.md resolve;
 *  3. the docs map (docs/developer/documentation.md) lists required governance entries;
 *  4. developer/ADR pages and evidence indexes are wired into VitePress sidebar;
 *  5. ADR files are contiguous, correctly titled/statused/sectioned, indexed exactly once,
 *     and the index max-number claim matches.
 *
 * Usage:
 *   node scripts/check-docs.mjs
 *   node scripts/check-docs.mjs --adr-only
 *   node scripts/check-docs.mjs --json
 */
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const DOCS = join(ROOT, 'docs');
const ALLOWED_LAYERS = new Set([
  'guide', 'adapters', 'developer', 'conventions', 'advanced',
  'design', 'superpowers', 'adr', 'evidence', 'zh',
]);
const ROOT_DOCS = new Set(['index.md', 'comparison.md']);
const SKIP_DIRS = new Set(['.vitepress', 'node_modules', '.git', 'dist']);
const SECTIONS = ['背景', '决策', '验收', '边界'];
const DOC_MAP = join(DOCS, 'developer', 'documentation.md');
const MAP_REQUIRED = [
  'AGENTS.md',
  'CONTRIBUTING.md',
  'TESTING.md',
  'docs/developer/development-process.md',
  'docs/developer/documentation.md',
  'docs/developer/fork-release.md',
  'docs/developer/testing.md',
  'docs/developer/contributing.md',
  'docs/adr/index.md',
  'docs/evidence/index.md',
];
const ADR_DIR = join(DOCS, 'adr');
const ADR_INDEX = join(ADR_DIR, 'index.md');
const ADR_FILE_RE = /^\d{4}-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;
const CONFIG = join(DOCS, '.vitepress', 'config.mts');
const EVIDENCE_DIR = join(DOCS, 'evidence');
const EVIDENCE_INDEX = join(EVIDENCE_DIR, 'index.md');
const EVIDENCE_FILE_RE = /^(?:\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*|release-[a-z0-9][a-z0-9.-]*)\.md$/;
const ROOT_LINK_FILES = [
  'AGENTS.md',
  'README.md',
  'README.zh-CN.md',
  'CONTRIBUTING.md',
  'TESTING.md',
  '.github/pull_request_template.md',
];

const args = new Set(process.argv.slice(2));
const adrOnly = args.has('--adr-only');
const asJson = args.has('--json');
const violations = [];

const rel = (p) => relative(ROOT, p).split(sep).join('/');
const report = (file, message) => violations.push(rel(file) + ': ' + message);

async function walkMarkdown(dir, out) {
  const entries = await readdir(dir, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkMarkdown(full, out);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      out.push(full);
    }
  }
}

function checkClassification(file) {
  const relPath = relative(DOCS, file).split(sep).join('/');
  const parts = relPath.split('/');
  if (parts.length === 1) {
    if (!ROOT_DOCS.has(parts[0])) report(file, 'root-level doc is not allowlisted: ' + relPath);
    return;
  }
  if (!ALLOWED_LAYERS.has(parts[0])) report(file, 'unclassified docs layer: ' + parts[0]);
}

function stripFencedCode(text) {
  return text
    .replace(/\u0060\u0060\u0060[\s\S]*?\u0060\u0060\u0060/g, '')
    .replace(/~~~[\s\S]*?~~~/g, '');
}

function linkTargets(text) {
  const targets = [];
  const re = /\[[^\]]*\]\((<[^>]+>|[^)\s]+)\)/g;
  let match;
  while ((match = re.exec(text)) !== null) targets.push(match[1]);
  return targets;
}

async function checkLinks(file) {
  if (!existsSync(file)) {
    report(file, 'required file is missing');
    return;
  }
  let text;
  try {
    text = await readFile(file, 'utf8');
  } catch (error) {
    report(file, 'cannot read file: ' + error.message);
    return;
  }
  for (let target of linkTargets(stripFencedCode(text))) {
    if (target.startsWith('<') && target.endsWith('>')) target = target.slice(1, -1);
    if (!target) continue;
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(target)) continue;
    if (target.startsWith('/') || target.startsWith('~')) continue;
    target = target.split('#')[0].split('?')[0];
    if (!target) continue;
    try {
      target = decodeURIComponent(target);
    } catch {
      /* keep raw target */
    }
    const resolved = resolve(dirname(file), target);
    const candidates = [
      resolved,
      resolved + '.md',
      join(resolved, 'index.md'),
      join(resolved, 'README.md'),
    ];
    if (!candidates.some((candidate) => existsSync(candidate))) {
      report(file, 'relative link does not resolve: ' + target);
    }
  }
}

async function checkDocsMap() {
  if (!existsSync(DOC_MAP)) {
    report(DOC_MAP, 'docs map is missing');
    return;
  }
  const text = await readFile(DOC_MAP, 'utf8');
  for (const required of MAP_REQUIRED) {
    if (!text.includes(required)) report(DOC_MAP, 'docs map does not list required entry: ' + required);
  }
}

async function checkSidebar(includeDocs = true) {
  if (!existsSync(CONFIG)) {
    report(CONFIG, 'VitePress config is missing');
    return;
  }
  const config = await readFile(CONFIG, 'utf8');
  const requireRoute = (route) => {
    if (!config.includes("'" + route + "'")) report(CONFIG, 'sidebar is missing route ' + route);
  };
  requireRoute('/adr/');
  if (includeDocs) {
    requireRoute('/evidence/');
    const developerDir = join(DOCS, 'developer');
    if (existsSync(developerDir)) {
      const names = (await readdir(developerDir)).filter((name) => name.endsWith('.md'));
      for (const name of names) requireRoute('/developer/' + name.replace(/\.md$/, ''));
    }
  }
  if (existsSync(ADR_DIR)) {
    const names = (await readdir(ADR_DIR)).filter((name) => ADR_FILE_RE.test(name));
    for (const name of names) requireRoute('/adr/' + name.replace(/\.md$/, ''));
  }
}

async function checkEvidence() {
  if (!existsSync(EVIDENCE_DIR)) {
    report(EVIDENCE_DIR, 'evidence directory is missing');
    return 0;
  }
  const all = (await readdir(EVIDENCE_DIR)).filter((name) => name.endsWith('.md')).sort();
  const records = all.filter((name) => name !== 'index.md' && name !== 'template.md');
  for (const name of records) {
    if (!EVIDENCE_FILE_RE.test(name)) {
      report(join(EVIDENCE_DIR, name), 'invalid evidence filename (expected YYYY-MM-DD-<slug>.md or release-<version>.md)');
    }
  }
  if (!existsSync(EVIDENCE_INDEX)) {
    report(EVIDENCE_INDEX, 'evidence index is missing');
    return records.length;
  }
  const indexText = await readFile(EVIDENCE_INDEX, 'utf8');
  const indexTargets = new Set(
    linkTargets(indexText).map((target) => target.replace(/^<|>$/g, '').split('#')[0].split('?')[0].split('/').pop()),
  );
  for (const name of records) {
    if (!indexTargets.has(name)) {
      report(join(EVIDENCE_DIR, name), 'evidence file is missing from docs/evidence/index.md');
    }
  }
  return records.length;
}

async function checkAdr() {
  if (!existsSync(ADR_DIR)) {
    report(ADR_DIR, 'ADR directory is missing');
    return { count: 0 };
  }
  const allNames = (await readdir(ADR_DIR)).filter((name) => name.endsWith('.md'));
  for (const name of allNames) {
    if (name === 'index.md' || name === 'template.md') continue;
    if (!ADR_FILE_RE.test(name)) {
      report(join(ADR_DIR, name), 'invalid ADR filename (expected NNNN-kebab-title.md)');
    }
  }
  const names = allNames.filter((name) => ADR_FILE_RE.test(name)).sort();
  const byNumber = new Map();
  const statusByNumber = new Map();
  const titleByNumber = new Map();
  const normalizeTitle = (value) => value.replace(/\s+/g, ' ').trim();

  for (const name of names) {
    const number = Number(name.slice(0, 4));
    const file = join(ADR_DIR, name);
    const text = await readFile(file, 'utf8');

    if (byNumber.has(number)) {
      report(file, 'duplicate ADR number ' + String(number).padStart(4, '0'));
      continue;
    }
    byNumber.set(number, file);

    const title = text.match(/^#\s+ADR\s+(\d{4})\s*[:：]\s*(.+)$/m);
    if (!title) {
      report(file, 'missing title matching "# ADR NNNN："');
    } else {
      titleByNumber.set(number, normalizeTitle(title[2]));
      if (Number(title[1]) !== number) {
        report(file, 'title number ' + title[1] + ' does not match filename');
      }
    }

    const status = text.match(/^- 状态：\s*(Draft|Proposed|Accepted|Implemented|Superseded|Rejected)/m);
    if (!status) {
      report(file, 'missing or invalid status line');
    } else {
      statusByNumber.set(number, status[1]);
    }
    if (!/20\d{2}-\d{2}-\d{2}/.test(text)) {
      report(file, 'missing YYYY-MM-DD date near the status');
    }

    for (const section of SECTIONS) {
      if (!new RegExp('^##\\s+' + section, 'm').test(text)) {
        report(file, 'missing required section "## ' + section + '"');
      }
    }
  }

  const sorted = [...byNumber.keys()].sort((a, b) => a - b);
  sorted.forEach((number, index) => {
    const expected = index + 1;
    if (number !== expected) {
      report(byNumber.get(number), 'ADR numbering gap: expected ' + String(expected).padStart(4, '0') + ', found ' + String(number).padStart(4, '0'));
    }
  });

  if (!existsSync(ADR_INDEX)) {
    report(ADR_INDEX, 'ADR index is missing (docs/adr/index.md)');
    return { count: names.length };
  }
  const indexText = await readFile(ADR_INDEX, 'utf8');
  const rows = new Map();
  const rowRe = /^\|\s*\[(\d{4})\]\(([^)]+)\)\s*\|([^|]*)\|([^|]*)\|/gm;
  let row;
  while ((row = rowRe.exec(indexText)) !== null) {
    const number = Number(row[1]);
    const target = row[2].trim();
    const rowTitle = row[3].trim();
    const rowStatus = row[4].trim();
    if (rows.has(number)) {
      report(ADR_INDEX, 'duplicate ADR index row ' + row[1]);
      continue;
    }
    rows.set(number, target);

    const targetPath = resolve(ADR_DIR, target);
    if (!existsSync(targetPath)) {
      report(ADR_INDEX, 'index target does not exist: ' + target);
      continue;
    }
    const base = target.split('/').pop();
    if (!base.startsWith(row[1] + '-')) {
      report(ADR_INDEX, 'index target does not match number ' + row[1] + ': ' + target);
    }
    if (!byNumber.has(number)) {
      report(ADR_INDEX, 'index lists unknown ADR ' + row[1]);
    } else {
      if (statusByNumber.has(number) && rowStatus !== statusByNumber.get(number)) {
        report(ADR_INDEX, 'status mismatch for ADR ' + row[1] + ': index says "' + rowStatus + '", file says "' + statusByNumber.get(number) + '"');
      }
      if (titleByNumber.has(number) && normalizeTitle(rowTitle) !== titleByNumber.get(number)) {
        report(ADR_INDEX, 'title mismatch for ADR ' + row[1] + ': index says "' + rowTitle + '", file says "' + titleByNumber.get(number) + '"');
      }
    }
  }

  for (const [number, file] of byNumber) {
    if (!rows.has(number)) report(file, 'ADR is missing from docs/adr/index.md');
  }

  const maxNumber = sorted.length ? sorted[sorted.length - 1] : 0;
  const maxClaim = indexText.match(/本仓当前最大编号是\s*\u0060(\d{4})\u0060/);
  if (!maxClaim) {
    report(ADR_INDEX, 'missing max-number claim sentence');
  } else if (Number(maxClaim[1]) !== maxNumber) {
    report(ADR_INDEX, 'max-number claim ' + maxClaim[1] + ' does not match actual max ' + String(maxNumber).padStart(4, '0'));
  }

  return { count: names.length };
}

const docFiles = [];
let evidenceCount = 0;
if (!adrOnly) {
  await walkMarkdown(DOCS, docFiles);
  for (const file of docFiles) checkClassification(file);
  for (const file of docFiles) await checkLinks(file);
  for (const relPath of ROOT_LINK_FILES) await checkLinks(join(ROOT, relPath));
  await checkDocsMap();
  evidenceCount = await checkEvidence();
}
const adrResult = await checkAdr();
await checkSidebar(!adrOnly);

if (asJson) {
  console.log(JSON.stringify({ ok: violations.length === 0, docs: docFiles.length, adrs: adrResult.count, evidence: evidenceCount, violations }, null, 2));
} else if (violations.length) {
  console.error('docs-check: ' + violations.length + ' violation(s)');
  for (const violation of violations) console.error('  - ' + violation);
} else {
  const parts = [docFiles.length + ' docs', adrResult.count + ' ADR'];
  if (!adrOnly) parts.push(evidenceCount + ' evidence');
  console.log('docs-check: OK (' + parts.join(', ') + ')');
}

process.exit(violations.length ? 1 : 0);
