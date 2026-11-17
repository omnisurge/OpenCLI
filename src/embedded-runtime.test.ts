import { afterEach, describe, expect, it, vi } from 'vitest';
import * as path from 'node:path';
import { extraClisDirs, isEmbeddedRuntime, opencliRoot } from './embedded-runtime.js';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('embedded runtime env contract', () => {
  it('keeps the legacy root when OPENCLI_HOME is unset', () => {
    vi.stubEnv('OPENCLI_HOME', '');
    expect(opencliRoot('/home/me')).toBe(path.join('/home/me', '.opencli'));
  });

  it('uses a trimmed absolute OPENCLI_HOME as the complete root', () => {
    vi.stubEnv('OPENCLI_HOME', '  /tmp/opencli-home  ');
    expect(opencliRoot('/home/me')).toBe(path.resolve('/tmp/opencli-home'));
  });

  it('resolves a relative OPENCLI_HOME against the process cwd', () => {
    vi.stubEnv('OPENCLI_HOME', 'relative-opencli-home');
    expect(opencliRoot('/home/me')).toBe(path.resolve('relative-opencli-home'));
  });

  it('parses, trims, resolves and deduplicates extra dirs', () => {
    const a = path.resolve('/tmp/opencli-extra-a');
    const b = path.resolve('/tmp/opencli-extra-b');
    vi.stubEnv('OPENCLI_EXTRA_CLIS_DIR', ['  ' + a + '  ', '', b, a].join(path.delimiter));
    expect(extraClisDirs()).toEqual([a, b]);
  });

  it('treats empty extra-dir env as no extra dirs', () => {
    vi.stubEnv('OPENCLI_EXTRA_CLIS_DIR', '');
    expect(extraClisDirs()).toEqual([]);
  });

  it('detects a non-empty embedded switch, not just 1/true', () => {
    vi.stubEnv('OPENCLI_EMBEDDED', '  ');
    expect(isEmbeddedRuntime()).toBe(false);
    vi.stubEnv('OPENCLI_EMBEDDED', '1');
    expect(isEmbeddedRuntime()).toBe(true);
    vi.stubEnv('OPENCLI_EMBEDDED', '0');
    expect(isEmbeddedRuntime()).toBe(true);
  });
});
