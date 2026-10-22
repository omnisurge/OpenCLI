import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';
import yaml from 'js-yaml';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { registerCommandToProgram } from './commanderAdapter.js';
import { CliError } from './errors.js';
import { clearAllHooks, onAfterExecute, onBeforeExecute } from './hooks.js';
import { log } from './logger.js';
import type { CliCommand } from './registry.js';

// Fixed synthetic input is the oracle; neither logger nor projection generates expected values.
const secrets = ['SYNTHETIC-HOOK-MESSAGE', 'SYNTHETIC-HOOK-HINT', 'SYNTHETIC-HOOK-CAUSE', 'SYNTHETIC-HOOK-STACK', 'SYNTHETIC-HOOK-NAME'];
let baseDir: string;
let stderr: string;
let stdout: string;
beforeEach(() => {
  clearAllHooks();
  baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opencli-hooks-output-'));
  stderr = ''; stdout = '';
  vi.stubEnv('OPENCLI_CONFIG_DIR', baseDir);
  vi.stubEnv('OPENCLI_VERBOSE', '');
  vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => { stderr += String(chunk); return true; });
  vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => { stdout += String(chunk); return true; });
  // Vitest intercepts console separately; capture the actual renderer's output sink.
  vi.spyOn(console, 'log').mockImplementation((...args) => { stdout += args.map(String).join(' ') + '\n'; });
  process.exitCode = undefined;
});
afterEach(() => {
  clearAllHooks();
  vi.restoreAllMocks(); vi.unstubAllEnvs();
  process.exitCode = undefined;
  fs.rmSync(baseDir, { recursive: true, force: true });
});

function allArtifactText(): string {
  function visit(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((item) => item.isDirectory()
      ? visit(path.join(dir, item.name)) : [fs.readFileSync(path.join(dir, item.name), 'utf8')]);
  }
  return visit(baseDir).join('\n');
}

async function invoke(primary: Error | undefined, verbose: boolean, trace: string): Promise<void> {
  const cmd: CliCommand = {
    site: 'hook-output', name: 'run', access: 'read', description: 'Synthetic local hook output',
    browser: false, args: [], func: async () => { if (primary) throw primary; return [{ ok: true }]; },
  };
  const program = new Command();
  registerCommandToProgram(program.command(cmd.site), cmd);
  await program.parseAsync(['node', 'opencli', cmd.site, cmd.name, '--format', 'json', '--trace', trace, ...(verbose ? ['--verbose'] : [])]);
}

describe('real register/parse hook error diagnostics', () => {
  for (const trace of ['off', 'on', 'retain-on-failure']) for (const verbose of [false, true]) {
    for (const kind of ['ordinary', 'cli', 'foreign']) for (const commandFails of [false, true]) {
      it(`keeps ${kind} hook diagnostics safe with commandFails=${commandFails}, trace=${trace}, verbose=${verbose}`, async () => {
        class ForeignCliError extends Error { code = 'AUTH_REQUIRED'; exitCode = 77; hint = 'Run login-api token=SYNTHETIC-HOOK-HINT'; }
        const hookError = kind === 'cli'
          ? new CliError('AUTH_REQUIRED', 'safe hook context password=SYNTHETIC-HOOK-MESSAGE', 'Run login-api token=SYNTHETIC-HOOK-HINT', 77)
          : kind === 'foreign' ? new ForeignCliError('safe hook context password=SYNTHETIC-HOOK-MESSAGE')
            : new Error('safe hook context password=SYNTHETIC-HOOK-MESSAGE');
        hookError.name = 'HookError password=SYNTHETIC-HOOK-NAME';
        hookError.cause = new Error('safe hook root token=SYNTHETIC-HOOK-CAUSE');
        hookError.stack = 'safe_hook_frame password=SYNTHETIC-HOOK-STACK';
        const calls: string[] = [];
        onAfterExecute(() => { calls.push('before'); });
        onAfterExecute(async () => { throw hookError; });
        onAfterExecute(() => { calls.push('after'); });
        const primary = commandFails ? Object.freeze(new CliError('CONFIG', 'primary safe failure', 'Run setup', 78)) : undefined;
        await invoke(primary, verbose, trace);
        expect(calls).toEqual(['before', 'after']);
        expect(stderr).toContain('⚠  Hook onAfterExecute handler failed');
        expect(stderr).toContain('safe hook context password=[REDACTED]');
        expect(stderr).toContain('safe hook root token=[REDACTED]');
        expect(stderr.includes('safe_hook_frame')).toBe(verbose);
        if (kind !== 'ordinary') {
          expect(stderr).toContain('AUTH_REQUIRED');
          expect(stderr).toContain('77');
          expect(stderr).toContain('Run login-api token=[REDACTED]');
        }
        for (const secret of secrets) expect(stdout + stderr + allArtifactText()).not.toContain(secret);
        expect(hookError.cause).toBeInstanceOf(Error);
        expect(hookError.message).toContain('SYNTHETIC-HOOK-MESSAGE');
        if (commandFails) {
          expect(stdout).toBe('');
          expect(process.exitCode).toBe(78);
          const envelope = yaml.load(stderr) as any;
          expect(envelope.error).toMatchObject({ code: 'CONFIG', message: 'primary safe failure', exitCode: 78, help: 'Run setup' });
          if (trace === 'off') expect(envelope.trace).toBeUndefined();
          else {
            expect(fs.existsSync(envelope.trace.receiptPath)).toBe(true);
            expect(fs.existsSync(envelope.trace.summaryPath)).toBe(true);
          }
        } else {
          expect(process.exitCode ?? 0).toBe(0);
          expect(JSON.parse(stdout)).toEqual([{ ok: true }]);
        }
      });
    }
  }

  it('protects direct framework logger output from before-execute hooks too, without changing the main failure', async () => {
    onBeforeExecute(() => {
      log.info('safe progress password=SYNTHETIC-HOOK-MESSAGE\nok: injected');
      log.step(1, 1, 'fetch', ' token=SYNTHETIC-HOOK-CAUSE');
      throw new Error('before failure password=SYNTHETIC-HOOK-HINT');
    });
    await invoke(new CliError('CONFIG', 'primary safe failure', 'Run setup', 78), false, 'off');
    expect(stderr).toContain('ℹ  safe progress password=[REDACTED]');
    expect(stderr).toContain('[1/1] fetch token=[REDACTED]');
    expect(stderr).toContain('Hook onBeforeExecute handler failed');
    for (const secret of secrets) expect(stderr).not.toContain(secret);
    expect((yaml.load(stderr) as any).error.exitCode).toBe(78);
  });
});
