import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CliCommand } from './registry.js';
import { clearAllHooks, emitHook, onStartup } from './hooks.js';
import { coerceAndValidateArgs, executeRuntimeCommand } from './runtime-execution.js';

afterEach(() => {
  clearAllHooks();
  vi.unstubAllGlobals();
});

function command(overrides: Partial<CliCommand> = {}): CliCommand {
  return {
    site: 'demo',
    name: 'echo',
    description: 'Echo a value',
    access: 'read',
    args: [{ name: 'count', type: 'int', default: 1 }],
    browser: false,
    func: async (kwargs: Record<string, unknown>) => ({ count: kwargs.count }),
    ...overrides,
  } as unknown as CliCommand;
}

describe('runtime core execution', () => {
  it('coerces and applies argument defaults', () => {
    expect(coerceAndValidateArgs([{ name: 'count', type: 'int' }], { count: '2' })).toEqual({ count: 2 });
    expect(coerceAndValidateArgs([{ name: 'count', type: 'int', default: 1 }], {})).toEqual({ count: 1 });
    expect(() => coerceAndValidateArgs([{ name: 'count', type: 'int' }], { count: '1.5' })).toThrow();
  });

  it('executes browser:false commands without browser modules', async () => {
    const result = await executeRuntimeCommand(command(), { count: '3' });
    expect(result).toEqual({ count: 3 });
  });

  it('fails browser commands with a capability error instead of loading browser code', async () => {
    await expect(executeRuntimeCommand(command({ browser: true }), {})).rejects.toMatchObject({
      code: 'BROWSER_CAPABILITY_UNAVAILABLE',
      exitCode: 69,
    });
  });

  it('executes the non-browser fetch/transform pipeline subset', async () => {
    vi.stubGlobal('fetch', async () => ({
      ok: true, status: 200, statusText: 'OK',
      json: async () => ({ items: [1, 2, 3] }),
    }));
    const pipelineCommand = command({
      func: undefined,
      pipeline: [
        { fetch: 'https://example.invalid/data' },
        { select: 'items' },
        { limit: '2' },
      ],
    } as unknown as Partial<CliCommand>);
    const result = await executeRuntimeCommand(pipelineCommand, {});
    expect(result).toEqual([1, 2]);
  });

  it('rejects browser-only pipeline steps explicitly', async () => {
    const pipelineCommand = command({
      func: undefined,
      pipeline: [{ navigate: 'https://example.invalid' }],
    } as unknown as Partial<CliCommand>);
    await expect(executeRuntimeCommand(pipelineCommand, {})).rejects.toMatchObject({
      code: 'CORE_PIPELINE_STEP_UNAVAILABLE',
      exitCode: 69,
    });
  });

  it('runs lifecycle hooks around a core command', async () => {
    const seen: string[] = [];
    const { onBeforeExecute, onAfterExecute } = await import('./hooks.js');
    onBeforeExecute(() => { seen.push('before'); });
    onAfterExecute(() => { seen.push('after'); });
    await executeRuntimeCommand(command(), {});
    expect(seen).toEqual(['before', 'after']);
  });

  it('emits the startup hook used by the core entry', async () => {
    const seen: string[] = [];
    onStartup(() => { seen.push('startup'); });
    await emitHook('onStartup', { command: '__startup__', args: {} });
    expect(seen).toEqual(['startup']);
  });

  it('supports --json shortcut on registered runtime subcommands', async () => {
    const { Command } = await import('commander');
    const { getRegistry } = await import('./registry.js');
    const { registerRuntimeCommands } = await import('./runtime-commander.js');
    const site = 'demo-json-test';
    getRegistry().set(
      `${site}/status`,
      command({ site, name: 'status', args: [], func: async () => ({ ok: true }) }),
    );
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      const program = new Command('opencli');
      registerRuntimeCommands(program, new Map());
      await program.parseAsync(['node', 'opencli', site, 'status', '--json']);
      const written = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(JSON.parse(written)).toEqual({ ok: true });
    } finally {
      logSpy.mockRestore();
      getRegistry().delete(`${site}/status`);
    }
  });
});
