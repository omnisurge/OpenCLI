import { describe, expect, it } from 'vitest';
import { projectPublicError } from './public-error.js';
import { CliError, attachTraceReceipt, getTraceReceipt, toEnvelope } from './errors.js';
import type { ObservationTraceReceipt } from './observation/events.js';

function receipt(id: string): ObservationTraceReceipt {
  return {
    schemaVersion: 1, opencliVersion: 'synthetic', traceId: id,
    traceDir: '/synthetic/' + id, summaryPath: '/synthetic/' + id + '/summary.md',
    receiptPath: '/synthetic/' + id + '/receipt.json', status: 'failure', createdAt: '2026-10-19T00:00:00Z',
  };
}

describe('public error projection', () => {
  it('projects every output text field without mutating internal errors', () => {
    const error = new CliError('CONFIG', 'message password=SYNTHETIC-MESSAGE', 'Run setup token=SYNTHETIC-HINT', 78);
    error.name = 'Error password=SYNTHETIC-NAME';
    error.cause = new Error('cause token=SYNTHETIC-CAUSE', { cause: new Error('deep password=SYNTHETIC-DEEP') });
    error.stack = 'safe-frame token=SYNTHETIC-STACK';
    expect(projectPublicError(error, { verbose: true })).toEqual({
      name: 'Error password=[REDACTED]', code: 'CONFIG', exitCode: 78,
      message: 'message password=[REDACTED]', hint: 'Run setup token=[REDACTED]',
      cause: 'cause token=[REDACTED]\n  caused by: deep password=[REDACTED]',
      stack: 'safe-frame token=[REDACTED]',
    });
    expect(error.message).toBe('message password=SYNTHETIC-MESSAGE');
    expect(error.cause).toBeInstanceOf(Error);
    expect(toEnvelope(error, { verbose: true }).error.stack).toBe('safe-frame token=[REDACTED]');
    expect(toEnvelope(error).error.stack).toBeUndefined();
  });

  it('does not allow name or code text to bypass safety while preserving normal machine codes', () => {
    const error = new CliError('CONFIG token=SYNTHETIC-CODE', 'safe', 'Run setup', 78);
    expect(projectPublicError(error).code).toBe('CONFIG token=[REDACTED]');
    expect(projectPublicError(new CliError('AUTH_REQUIRED', 'safe', 'Run login-api', 77)).code).toBe('AUTH_REQUIRED');
  });

  it('bounds circular causes and retains useful non-secret context', () => {
    const error = new Error('safe outer');
    error.cause = error;
    const projected = projectPublicError(error);
    expect(projected.cause).toContain('safe outer');
    expect(projected.cause).toContain('(cause chain truncated)');
  });

  it('preserves falsy primitive causes instead of silently losing them', () => {
    expect(projectPublicError(new Error('safe', { cause: 0 })).cause).toBe('0');
    expect(projectPublicError(new Error('safe', { cause: false })).cause).toBe('false');
  });
});

describe('trace receipt transport', () => {
  for (const primitive of ['same value', 0, false, null, undefined, 12n, Symbol('synthetic')]) {
    it('gives a primitive failure its own carrier and keeps the original cause: ' + String(primitive), () => {
      const first = attachTraceReceipt(primitive, receipt('first'));
      const second = attachTraceReceipt(primitive, receipt('second'));
      expect(first).toBeInstanceOf(Error);
      expect(first).not.toBe(second);
      expect((first as Error).cause).toBe(primitive);
      expect(Object.hasOwn(first as Error, 'cause')).toBe(true);
      expect(getTraceReceipt(first)?.traceId).toBe('first');
      expect(getTraceReceipt(second)?.traceId).toBe('second');
      expect(getTraceReceipt(primitive)).toBeUndefined();
    });
  }

  for (const freeze of [Object.freeze, Object.seal, Object.preventExtensions]) {
    it('keeps immutable CliError identity, code and hint using weak metadata: ' + freeze.name, () => {
      const error = freeze(new CliError('AUTH_REQUIRED', 'safe', 'Run login-api', 77));
      const keys = Reflect.ownKeys(error);
      expect(attachTraceReceipt(error, receipt('immutable'))).toBe(error);
      expect(Reflect.ownKeys(error)).toEqual(keys);
      expect(toEnvelope(error)).toMatchObject({
        error: { code: 'AUTH_REQUIRED', exitCode: 77, help: 'Run login-api' },
        trace: { traceId: 'immutable' },
      });
    });
  }

  it('keeps compatible Symbol metadata for cross-package readers of extensible errors', () => {
    const error = new Error('safe');
    const trace = receipt('symbol');
    attachTraceReceipt(error, trace);
    expect((error as any)[Symbol.for('opencli.traceReceipt')]).toBe(trace);
    expect(Object.keys(error)).not.toContain('opencli.traceReceipt');
  });
});
