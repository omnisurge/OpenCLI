import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { executeCommand } from '../execution.js';
import { ArgumentError, toEnvelope } from '../errors.js';
import { cli, Strategy } from '../registry.js';
import * as runtime from '../runtime.js';
import * as capRouting from '../capabilityRouting.js';

afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe('execution trace transport for immutable and primitive throws', () => {
  // This is a mocked browser lifecycle test, not live browser evidence.
  for (const browser of [false, true]) for (const trace of ['off', 'on', 'retain-on-failure']) {
    for (const kind of ['primitive', 'undefined', 'frozen']) {
      it(`keeps ${kind} evidence for browser=${browser}, trace=${trace}`, async () => {
        const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opencli-trace-transport-'));
        vi.stubEnv('OPENCLI_CONFIG_DIR', baseDir);
        const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
        const page = {
          closeWindow: vi.fn().mockResolvedValue(undefined),
          consoleMessages: vi.fn().mockResolvedValue([]), screenshot: vi.fn().mockResolvedValue(undefined),
        } as any;
        vi.spyOn(capRouting, 'shouldUseBrowserSession').mockReturnValue(browser);
        vi.spyOn(runtime, 'browserSession').mockImplementation(async (_Factory, fn) => fn(page));
        const original = kind === 'primitive' ? 'primitive password=SYNTHETIC-PRIMITIVE'
          : kind === 'undefined' ? undefined : Object.freeze(new ArgumentError('frozen failure', 'Run setup'));
        const definition = {
          site: 'test-execution', name: 'trace-transport-' + browser + '-' + trace + '-' + kind,
          access: 'read' as const, description: 'synthetic thrown value',
          func: async () => { throw original; },
        };
        const cmd = browser ? cli({ ...definition, browser: true })
          : cli({ ...definition, browser: false, strategy: Strategy.PUBLIC });
        try {
          const thrown = await executeCommand(cmd, {}, true, { trace }).catch((error) => error);
          const envelope = toEnvelope(thrown, { verbose: true });
          if (trace === 'off') {
            expect(thrown).toBe(original);
            expect(envelope.trace).toBeUndefined();
            expect(fs.existsSync(path.join(baseDir, 'profiles'))).toBe(false);
          } else {
            expect(envelope.trace?.status).toBe('failure');
            expect(fs.existsSync(envelope.trace!.receiptPath)).toBe(true);
            expect(fs.existsSync(envelope.trace!.summaryPath)).toBe(true);
            if (kind === 'frozen') {
              expect(thrown).toBe(original);
              expect(envelope.error).toMatchObject({ code: 'ARGUMENT', exitCode: 2, help: 'Run setup' });
            } else {
              expect(thrown).toBeInstanceOf(Error);
              expect((thrown as Error).cause).toBe(original);
            }
            expect(JSON.stringify(envelope)).not.toContain('SYNTHETIC-PRIMITIVE');
          }
          expect(stderrSpy.mock.calls.flat().join('')).not.toContain('SYNTHETIC-PRIMITIVE');
        } finally {
          fs.rmSync(baseDir, { recursive: true, force: true });
        }
      });
    }
  }

  it('reports a failed export callback safely, preserving both original error and exported receipt', async () => {
    const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opencli-trace-callback-'));
    vi.stubEnv('OPENCLI_CONFIG_DIR', baseDir);
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const original = Object.freeze(new ArgumentError('safe failure', 'Run setup'));
    const cmd = cli({
      site: 'test-execution', name: 'trace-callback', access: 'read', browser: false,
      description: 'synthetic callback failure', func: async () => { throw original; },
    });
    try {
      const thrown = await executeCommand(cmd, {}, false, {
        trace: 'on', onTraceExport: () => { throw new Error('callback password=SYNTHETIC-CALLBACK\nsecret=SYNTHETIC-LINE'); },
      }).catch((error) => error);
      expect(thrown).toBe(original);
      expect(fs.existsSync(toEnvelope(thrown).trace!.receiptPath)).toBe(true);
      const output = stderrSpy.mock.calls.flat().join('');
      expect(output).toContain('# [trace] Trace export callback failed: callback password=[REDACTED]');
      expect(output).toContain('# [trace] secret=[REDACTED]');
      expect(output).not.toContain('SYNTHETIC-CALLBACK');
      expect(output).not.toContain('SYNTHETIC-LINE');
    } finally {
      fs.rmSync(baseDir, { recursive: true, force: true });
    }
  });
});
