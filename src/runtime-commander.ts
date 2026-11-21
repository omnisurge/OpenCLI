/**
 * Minimal Commander adapter for the runtime-core profile.
 *
 * It deliberately does not import execution.ts (which statically imports
 * browser/daemon modules). Execution is injected through runtime-execution.ts.
 */

import { Command } from 'commander';
import yaml from 'js-yaml';
import { type CliCommand, fullName, getRegistry } from './registry.js';
import { render as renderOutput } from './output.js';
import { toEnvelope } from './errors.js';
import { executeRuntimeCommand } from './runtime-execution.js';

function renderRuntimeError(err: unknown, verbose: boolean): number {
  const envelope = toEnvelope(err, { verbose });
  let output = yaml.dump(envelope, { sortKeys: false, lineWidth: 120, noRefs: true });
  const code = envelope.error.code;
  if (code === 'SELECTOR' || code === 'EMPTY_RESULT' || code === 'ADAPTER_LOAD' || code === 'UNKNOWN') {
    output += '# AutoFix: re-run with --trace=retain-on-failure for trace artifact\n';
  }
  process.stderr.write(output);
  return envelope.error.exitCode;
}

function registerCommand(siteCmd: Command, cmd: CliCommand): void {
  if (siteCmd.commands.some((c: Command) => c.name() === cmd.name)) return;
  const subCmd = siteCmd.command(cmd.name).description(cmd.description ?? '');
  if (cmd.aliases?.length) subCmd.aliases(cmd.aliases);

  const positionalArgs = cmd.args.filter((arg) => arg.positional);
  for (const arg of cmd.args) {
    if (arg.positional) {
      const bracket = arg.required ? `<${arg.name}>` : `[${arg.name}]`;
      subCmd.argument(bracket, arg.help ?? '');
      continue;
    }
    const expectsValue = arg.required || arg.valueRequired;
    const flag = expectsValue ? `--${arg.name} <value>` : `--${arg.name} [value]`;
    if (arg.required) subCmd.requiredOption(flag, arg.help ?? '');
    else if (arg.default != null) subCmd.option(flag, arg.help ?? '', String(arg.default));
    else subCmd.option(flag, arg.help ?? '');
  }
  subCmd
    .option('-f, --format <fmt>', 'Output format: table, plain, json, yaml, md, csv', 'table')
    .option('--trace <mode>', 'Trace mode accepted for compatibility', 'off')
    .option('-v, --verbose', 'Debug output', false);

  subCmd.action(async (...actionArgs: unknown[]) => {
    const optionsRecord = (actionArgs[positionalArgs.length] ?? {}) as Record<string, unknown>;
    const rawKwargs: Record<string, unknown> = {};
    for (let i = 0; i < positionalArgs.length; i++) {
      const value = actionArgs[i];
      if (value !== undefined) rawKwargs[positionalArgs[i].name] = value;
    }
    for (const arg of cmd.args) {
      if (arg.positional) continue;
      const camelName = arg.name.replace(/-([a-z])/g, (_m, ch: string) => ch.toUpperCase());
      const value = optionsRecord[arg.name] ?? optionsRecord[camelName];
      if (value !== undefined) rawKwargs[arg.name] = value;
    }
    const verbose = optionsRecord.verbose === true;
    let format = typeof optionsRecord.format === 'string' ? optionsRecord.format : 'table';
    const formatExplicit = subCmd.getOptionValueSource('format') === 'cli';
    if (verbose) process.env.OPENCLI_VERBOSE = '1';
    try {
      const result = await executeRuntimeCommand(cmd, rawKwargs, verbose, {
        trace: typeof optionsRecord.trace === 'string' ? optionsRecord.trace : 'off',
      });
      if (result === null || result === undefined) return;
      const resolved = getRegistry().get(fullName(cmd)) ?? cmd;
      if (!formatExplicit && format === 'table' && resolved.defaultFormat) format = resolved.defaultFormat;
      renderOutput(result, {
        fmt: format,
        fmtExplicit: formatExplicit,
        columns: resolved.columns,
        title: `${resolved.site}/${resolved.name}`,
        source: fullName(resolved),
      });
    } catch (err) {
      process.exitCode = renderRuntimeError(err, verbose);
    }
  });
}

export function registerRuntimeCommands(program: Command, siteGroups: Map<string, Command>): string[] {
  const commandsBySite = new Map<string, CliCommand[]>();
  const seen = new Set<CliCommand>();
  for (const [, cmd] of getRegistry()) {
    if (seen.has(cmd)) continue;
    seen.add(cmd);
    const commands = commandsBySite.get(cmd.site) ?? [];
    commands.push(cmd);
    commandsBySite.set(cmd.site, commands);
  }
  for (const [site, commands] of commandsBySite) {
    let siteCmd = siteGroups.get(site);
    if (!siteCmd) {
      siteCmd = program.command(site);
      siteGroups.set(site, siteCmd);
    }
    for (const cmd of commands) registerCommand(siteCmd, cmd);
  }
  return [...commandsBySite.keys()].sort((a, b) => a.localeCompare(b));
}
