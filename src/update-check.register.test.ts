import { describe, expect, it, vi } from 'vitest';

const CACHE = {
  lastCheck: 1_700_000_000_000,
  latestVersion: '2.0.3',
  latestExtensionVersion: '2.1.0',
  currentExtensionVersion: '2.0.0',
};

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

async function captureRegistration(packageJson: object) {
  const previous = {
    optOut: process.env.OPENCLI_NO_UPDATE_NOTIFIER,
    ci: process.env.CI,
    continuousIntegration: process.env.CONTINUOUS_INTEGRATION,
    argv: process.argv,
  };
  delete process.env.OPENCLI_NO_UPDATE_NOTIFIER;
  delete process.env.CI;
  delete process.env.CONTINUOUS_INTEGRATION;
  process.argv = ['node', 'opencli', '--help'];

  vi.resetModules();
  vi.doMock('node:fs', () => ({
    existsSync: () => true,
    readFileSync: (file: string | URL | number) => {
      const value = String(file);
      if (value.endsWith('package.json')) return JSON.stringify(packageJson);
      return JSON.stringify({ ...CACHE, extensionLastSeenAt: Date.now() });
    },
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
  }));

  let exitHandler: ((code: number) => void) | undefined;
  const onSpy = vi.spyOn(process, 'on').mockImplementation((event, listener) => {
    if (event === 'exit') exitHandler = listener as (code: number) => void;
    return process;
  });
  const writeSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

  const cleanup = () => {
    onSpy.mockRestore();
    writeSpy.mockRestore();
    vi.doUnmock('node:fs');
    vi.resetModules();
    process.argv = previous.argv;
    restoreEnv('OPENCLI_NO_UPDATE_NOTIFIER', previous.optOut);
    restoreEnv('CI', previous.ci);
    restoreEnv('CONTINUOUS_INTEGRATION', previous.continuousIntegration);
  };

  try {
    const mod = await import('./update-check.js');
    mod.registerUpdateNoticeOnExit();
  } catch (error) {
    cleanup();
    throw error;
  }

  return { onSpy, writeSpy, exitHandler, cleanup };
}

describe('registerUpdateNoticeOnExit integration', () => {
  it('wires the fork stamp through registration and suppresses output', async () => {
    const registration = await captureRegistration({
      version: '1.8.8-omnisurge.2',
      opencliFork: { distribution: 'omnisurge' },
    });
    try {
      expect(registration.onSpy).toHaveBeenCalledWith('exit', expect.any(Function));
      expect(registration.exitHandler).toBeTypeOf('function');
      registration.exitHandler?.(0);
      expect(registration.writeSpy).not.toHaveBeenCalled();
    } finally {
      registration.cleanup();
    }
  });

  it('keeps upstream output when package.json has no fork stamp', async () => {
    const registration = await captureRegistration({ version: '1.8.8' });
    try {
      expect(registration.onSpy).toHaveBeenCalledWith('exit', expect.any(Function));
      expect(registration.exitHandler).toBeTypeOf('function');
      registration.exitHandler?.(0);
      expect(registration.writeSpy).toHaveBeenCalledTimes(1);
      const output = String(registration.writeSpy.mock.calls[0]?.[0] ?? '');
      expect(output).toContain('Update available: v1.8.8 → v2.0.3');
      expect(output).toContain('Extension update available: v2.0.0 → v2.1.0');
    } finally {
      registration.cleanup();
    }
  });
});
