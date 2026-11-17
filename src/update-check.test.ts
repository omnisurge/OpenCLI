import { describe, expect, it, vi } from 'vitest';
import {
  _extractLatestExtensionVersionFromReleases as extractLatestExtensionVersionFromReleases,
  _buildUpdateNotices as buildUpdateNotices,
  _EXTENSION_STALE_MS as EXTENSION_STALE_MS,
  registerUpdateNoticeOnExit,
} from './update-check.js';
import { PKG_DISTRIBUTION, parseDistribution } from './version.js';

describe('package distribution identity', () => {
  it('reads the declared omnisurge fork stamp from package.json', () => {
    expect(PKG_DISTRIBUTION).toBe('omnisurge');
  });

  it('fail-opens when the distribution stamp is missing or invalid', () => {
    for (const pkg of [
      null,
      {},
      { opencliFork: {} },
      { opencliFork: { distribution: '' } },
      { opencliFork: { distribution: '   ' } },
      { opencliFork: { distribution: 42 } },
    ]) {
      expect(parseDistribution(pkg)).toBeUndefined();
    }
  });

  it('returns the trimmed declared distribution', () => {
    expect(parseDistribution({ opencliFork: { distribution: ' omnisurge ' } })).toBe('omnisurge');
  });
});

describe('extractLatestExtensionVersionFromReleases', () => {
  it('reads the extension version from a versioned asset on a normal CLI release', () => {
    expect(
      extractLatestExtensionVersionFromReleases([
        {
          tag_name: 'v1.7.3',
          assets: [
            { name: 'opencli-extension.zip' },
            { name: 'opencli-extension-v1.0.2.zip' },
          ],
        },
      ]),
    ).toBe('1.0.2');
  });

  it('falls back to ext-v tags for extension-only releases', () => {
    expect(
      extractLatestExtensionVersionFromReleases([
        {
          tag_name: 'ext-v1.1.0',
          assets: [{ name: 'opencli-extension.zip' }],
        },
      ]),
    ).toBe('1.1.0');
  });

  it('returns undefined when no extension version source exists', () => {
    expect(
      extractLatestExtensionVersionFromReleases([
        {
          tag_name: 'v1.7.3',
          assets: [{ name: 'opencli-extension.zip' }],
        },
      ]),
    ).toBeUndefined();
  });
});

describe('buildUpdateNotices', () => {
  const now = 1_700_000_000_000;

  it('returns nothing when cache is empty', () => {
    expect(buildUpdateNotices({ cliVersion: '1.0.0', cache: null, now, isForkDistribution: false })).toEqual({});
  });

  it('emits a CLI notice when registry version is newer', () => {
    const lines = buildUpdateNotices({
      cliVersion: '1.0.0',
      cache: { lastCheck: now, latestVersion: '1.0.1' },
      now,
      isForkDistribution: false,
    });
    expect(lines.cli).toContain('v1.0.0 → v1.0.1');
    expect(lines.extension).toBeUndefined();
  });

  it('emits an extension notice when current ext is older and cache is fresh', () => {
    const lines = buildUpdateNotices({
      cliVersion: '1.0.0',
      cache: {
        lastCheck: now,
        latestVersion: '1.0.0',
        latestExtensionVersion: '2.1.0',
        currentExtensionVersion: '2.0.0',
        extensionLastSeenAt: now - 60_000,
      },
      now,
      isForkDistribution: false,
    });
    expect(lines.cli).toBeUndefined();
    expect(lines.extension).toContain('v2.0.0 → v2.1.0');
  });

  it('skips the extension notice when lastSeenAt is older than the stale window', () => {
    const lines = buildUpdateNotices({
      cliVersion: '1.0.0',
      cache: {
        lastCheck: now,
        latestVersion: '1.0.0',
        latestExtensionVersion: '2.1.0',
        currentExtensionVersion: '2.0.0',
        extensionLastSeenAt: now - EXTENSION_STALE_MS - 1,
      },
      now,
      isForkDistribution: false,
    });
    expect(lines.extension).toBeUndefined();
  });

  it('skips the extension notice when current and latest are equal', () => {
    const lines = buildUpdateNotices({
      cliVersion: '1.0.0',
      cache: {
        lastCheck: now,
        latestVersion: '1.0.0',
        latestExtensionVersion: '2.0.0',
        currentExtensionVersion: '2.0.0',
        extensionLastSeenAt: now,
      },
      now,
      isForkDistribution: false,
    });
    expect(lines.extension).toBeUndefined();
  });

  it('does not throw when cache has only daemon-written fields and no latestVersion', () => {
    const lines = buildUpdateNotices({
      cliVersion: '1.0.0',
      cache: {
        currentExtensionVersion: '2.0.0',
        extensionLastSeenAt: now,
      },
      now,
      isForkDistribution: false,
    });
    expect(lines.cli).toBeUndefined();
    expect(lines.extension).toBeUndefined();
  });

  it('emits both notices when both are out of date', () => {
    const lines = buildUpdateNotices({
      cliVersion: '1.0.0',
      cache: {
        lastCheck: now,
        latestVersion: '1.1.0',
        latestExtensionVersion: '2.1.0',
        currentExtensionVersion: '2.0.0',
        extensionLastSeenAt: now,
      },
      now,
      isForkDistribution: false,
    });
    expect(lines.cli).toContain('v1.0.0 → v1.1.0');
    expect(lines.extension).toContain('v2.0.0 → v2.1.0');
  });

  it('suppresses both notices for the fork distribution', () => {
    const lines = buildUpdateNotices({
      cliVersion: '1.8.8-omnisurge.2',
      cache: {
        lastCheck: now,
        latestVersion: '2.0.3',
        latestExtensionVersion: '2.1.0',
        currentExtensionVersion: '2.0.0',
        extensionLastSeenAt: now,
      },
      now,
      isForkDistribution: true,
    });
    expect(lines).toEqual({});
  });

  it('keeps both notices for an upstream build with the same versions', () => {
    const lines = buildUpdateNotices({
      cliVersion: '1.8.8-omnisurge.2',
      cache: {
        lastCheck: now,
        latestVersion: '2.0.3',
        latestExtensionVersion: '2.1.0',
        currentExtensionVersion: '2.0.0',
        extensionLastSeenAt: now,
      },
      now,
      isForkDistribution: false,
    });
    expect(lines.cli).toContain('v1.8.8-omnisurge.2 → v2.0.3');
    expect(lines.extension).toContain('v2.0.0 → v2.1.0');
  });
});

describe('registerUpdateNoticeOnExit', () => {
  it('does not register the exit hook when OPENCLI_NO_UPDATE_NOTIFIER is set', () => {
    const previous = {
      optOut: process.env.OPENCLI_NO_UPDATE_NOTIFIER,
      ci: process.env.CI,
      continuousIntegration: process.env.CONTINUOUS_INTEGRATION,
    };
    process.env.OPENCLI_NO_UPDATE_NOTIFIER = '1';
    delete process.env.CI;
    delete process.env.CONTINUOUS_INTEGRATION;
    const onSpy = vi.spyOn(process, 'on').mockImplementation(() => process);
    try {
      registerUpdateNoticeOnExit();
      expect(onSpy.mock.calls.some(([event]) => event === 'exit')).toBe(false);
    } finally {
      onSpy.mockRestore();
      const restore = (key: string, value: string | undefined) => {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      };
      restore('OPENCLI_NO_UPDATE_NOTIFIER', previous.optOut);
      restore('CI', previous.ci);
      restore('CONTINUOUS_INTEGRATION', previous.continuousIntegration);
    }
  });
});
