import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import yaml from 'js-yaml';
import { log } from './logger.js';
import { CliError } from './errors.js';

let output: string;
beforeEach(() => {
  output = '';
  vi.stubEnv('OPENCLI_VERBOSE', '1');
  vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => { output += String(chunk); return true; });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

const emitters: [string, (message: string) => void, string][] = [
  ['info', (message) => log.info(message), 'ℹ  '],
  ['status', (message) => log.status(message), ''],
  ['success', (message) => log.success(message), ''],
  ['warn', (message) => log.warn(message), '⚠  '],
  ['error', (message) => log.error(message), '✖  '],
  ['verbose', (message) => log.verbose(message), '[verbose] '],
  ['debug', (message) => log.debug(message), '[verbose] '],
  ['step', (message) => log.step(2, 3, 'fetch', ' → ' + message), '  [2/3] fetch → '],
  ['stepResult', (message) => log.stepResult(message), '       → '],
];

describe('common host diagnostic boundary', () => {
  for (const [name, emit, prefix] of emitters) it(name + ' sanitizes all lines without losing human information or YAML parseability', () => {
    emit('safe progress password=SYNTHETIC-LOG-SECRET\r\nok: injected\n  field: token=SYNTHETIC-LOG-TOKEN');
    expect(output).toContain(prefix + 'safe progress password=[REDACTED]');
    expect(output).toContain('# ok: injected');
    expect(output).not.toContain('SYNTHETIC-LOG-SECRET');
    expect(output).not.toContain('SYNTHETIC-LOG-TOKEN');
    expect(output.trimEnd().split('\n').every((line) => line.startsWith('# '))).toBe(true);
    expect(yaml.load(output + 'ok: false\nerror: safe\n')).toEqual({ ok: false, error: 'safe' });
  });

  it('keeps verbosity gates and unconditional status/step behavior', () => {
    vi.stubEnv('OPENCLI_VERBOSE', '');
    log.verbose('hidden password=SYNTHETIC-HIDDEN');
    log.debug('also hidden');
    expect(output).toBe('');
    log.status('progress remains visible');
    log.step(1, 1, 'fetch');
    log.stepResult('1 item');
    expect(output).toContain('progress remains visible');
    expect(output).toContain('[1/1] fetch');
    expect(output).toContain('1 item');
  });

  for (const verbose of [false, true]) it('projects structured errors rather than silently dropping cause/hint/stack, verbose=' + verbose, () => {
    vi.stubEnv('OPENCLI_VERBOSE', verbose ? '1' : '');
    const error = new CliError('AUTH_REQUIRED', 'recover password=SYNTHETIC-ERROR-MESSAGE', 'Run login-api token=SYNTHETIC-ERROR-HINT', 77);
    error.name = 'HookError password=SYNTHETIC-ERROR-NAME';
    error.cause = new Error('safe root token=SYNTHETIC-ERROR-CAUSE');
    error.stack = 'safe_hook_frame password=SYNTHETIC-ERROR-STACK';
    log.warn('Hook failed', error);
    for (const secret of ['MESSAGE', 'HINT', 'NAME', 'CAUSE', 'STACK']) expect(output).not.toContain('SYNTHETIC-ERROR-' + secret);
    expect(output).toContain('⚠  Hook failed: recover password=[REDACTED]');
    expect(output).toContain('AUTH_REQUIRED');
    expect(output).toContain('77');
    expect(output).toContain('Run login-api token=[REDACTED]');
    expect(output).toContain('safe root token=[REDACTED]');
    expect(output.includes('safe_hook_frame')).toBe(verbose);
    expect(error.message).toContain('SYNTHETIC-ERROR-MESSAGE');
    expect(yaml.load(output + 'ok: false\n')).toEqual({ ok: false });
  });

  it('encodes YAML line breaks and nonprinting control characters instead of injecting raw diagnostic content', () => {
    log.error('first\x00\x1b[31m\rsecond\nthird\u0085fourth\u2028fifth\u2029last');
    expect(output).not.toContain('\x00');
    expect(output).not.toContain('\x1b');
    expect(yaml.load(output + 'ok: false\n')).toEqual({ ok: false });
    expect(output).toContain('first');
    expect(output).toContain('last');
  });
});
