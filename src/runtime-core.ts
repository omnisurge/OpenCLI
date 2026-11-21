#!/usr/bin/env node
/**
 * runtime-core entry: generic, browser-free command host for embedded adapters.
 *
 * This is intentionally a separate entry from src/main.ts. The development
 * tool remains the full OpenCLI CLI; this entry loads only explicitly
 * configured external adapter directories and provides the core executor.
 */

import { Command } from 'commander';
import { discoverExtraClisDirs } from './discovery.js';
import { getRegistry } from './registry.js';
import { render } from './output.js';
import { serializeCommand } from './serialization.js';
import { PKG_VERSION } from './version.js';
import { registerRuntimeCommands } from './runtime-commander.js';
import { emitHook } from './hooks.js';

const program = new Command('opencli');
program.version(PKG_VERSION, '-V, --version');

program
  .command('list [site]')
  .description('List registered commands')
  .option('-f, --format <fmt>', 'Output format: table, plain, json, yaml, md, csv', 'table')
  .option('--json', 'Shortcut for --format json', false)
  .action((site: string | undefined, options: { format?: string; json?: boolean }) => {
    const rows = [...new Set(getRegistry().values())]
      .filter((cmd) => !site || cmd.site === site)
      .map((cmd) => serializeCommand(cmd));
    render(rows, {
      fmt: options.json ? 'json' : options.format ?? 'table',
      fmtExplicit: Boolean(options.json || options.format),
      columns: ['site', 'name', 'description', 'access', 'browser'],
    });
  });

await discoverExtraClisDirs();
registerRuntimeCommands(program, new Map());
await emitHook('onStartup', { command: '__startup__', args: {} });

try {
  await program.parseAsync(process.argv);
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`error: ${message}\n`);
  process.exitCode = 1;
}
