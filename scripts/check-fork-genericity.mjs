#!/usr/bin/env node
/**
 * Fork genericity gate.
 *
 * The fork core is the generic OpenCLI runtime, not a private adapter for one
 * downstream product. Product-specific names, credentials and private domains
 * belong in adapters or host payloads, never in src/.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const files = execFileSync("git", ["ls-files", "-co", "--exclude-standard", "-z", "--", "src"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean)
  .sort();

const rules = [
  {
    id: "downstream product or adapter name",
    pattern: /\b(?:sccs|supervision(?:-assistant)?|jlt01)\b/i,
  },
  {
    id: "downstream Chinese product name",
    pattern: /监理/u,
  },
  {
    id: "downstream credential environment variable",
    pattern: /\b(?:SCCS|SUPERVISION|JLT)_[A-Z0-9_]+\b/,
  },
  {
    id: "private downstream domain",
    pattern: /\b(?:[a-z0-9-]+\.)*(?:sccs|supervision|guiju|mteam|ds-bot)\.(?:com|cn|net|org|io|dev|app)\b/i,
  },
  {
    id: "private IDN or punycode domain",
    pattern: /\bxn--[a-z0-9-]+\b/i,
  },
  {
    id: "private Chinese domain or brand",
    pattern: /守夜人/u,
  },
];

const findings = [];
for (const file of files) {
  const raw = readFileSync(file);
  if (raw.includes(0)) continue;
  const text = raw.toString("utf8");
  text.split(/\r?\n/).forEach((line, index) => {
    for (const rule of rules) {
      if (rule.pattern.test(line)) {
        findings.push({ file, line: index + 1, rule: rule.id, text: line.trim().slice(0, 180) });
      }
    }
  });
}

if (findings.length > 0) {
  console.error("fork genericity: FAIL");
  for (const finding of findings.slice(0, 50)) {
    console.error("  " + finding.file + ":" + finding.line + " [" + finding.rule + "] " + finding.text);
  }
  if (findings.length > 50) console.error("  ... " + (findings.length - 50) + " more");
  console.error("Move downstream-specific code to an adapter or host payload; keep src/ upstream-generic.");
  process.exitCode = 1;
} else {
  console.log("fork genericity: OK (" + files.length + " source files)");
}
