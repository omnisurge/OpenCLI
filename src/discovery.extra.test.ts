import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { discoverExtraClisDirs } from './discovery.js';
import { getRegistry } from './registry.js';
import { log } from './logger.js';

let root = '';
let warn: ReturnType<typeof vi.spyOn>;

beforeEach(async () => {
  root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'opencli-extra-dir-'));
  warn = vi.spyOn(log, 'warn').mockImplementation(() => {});
});

afterEach(async () => {
  vi.unstubAllEnvs();
  warn.mockRestore();
  await fs.promises.rm(root, { recursive: true, force: true });
});

describe('OPENCLI_EXTRA_CLIS_DIR failure visibility', () => {
  it('warns and skips a missing directory instead of throwing', async () => {
    vi.stubEnv('OPENCLI_EXTRA_CLIS_DIR', path.join(root, 'missing'));
    await expect(discoverExtraClisDirs()).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('not readable or failed'));
  });

  it('warns and skips a file path instead of throwing', async () => {
    const file = path.join(root, 'not-a-dir');
    await fs.promises.writeFile(file, '');
    vi.stubEnv('OPENCLI_EXTRA_CLIS_DIR', file);
    await expect(discoverExtraClisDirs()).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('not readable or failed'));
  });

  it('warns when a flat plugin-shaped directory has no site subdirectory', async () => {
    const flat = path.join(root, 'flat');
    await fs.promises.mkdir(flat);
    await fs.promises.writeFile(path.join(flat, 'command.js'), 'export {};\n');
    vi.stubEnv('OPENCLI_EXTRA_CLIS_DIR', flat);
    await expect(discoverExtraClisDirs()).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('no <site> subdirectory'));
  });

  it('warns for flat adapter files even when a valid site subdirectory exists', async () => {
    const extra = path.join(root, 'mixed');
    const site = path.join(extra, 'sample');
    await fs.promises.mkdir(site, { recursive: true });
    await fs.promises.writeFile(path.join(extra, 'flat.js'), 'export {};\n');
    await fs.promises.writeFile(path.join(site, 'hello.js'), 'export {};\n');
    vi.stubEnv('OPENCLI_EXTRA_CLIS_DIR', extra);

    await expect(discoverExtraClisDirs()).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('flat adapter file(s) ignored'));
  });

  it('skips only the unreadable site and keeps loading the other site', async () => {
    const extra = path.join(root, 'partial');
    const good = path.join(extra, 'good');
    const bad = path.join(extra, 'bad');
    const scope = path.join(extra, 'node_modules', '@jackwener');
    await fs.promises.mkdir(good, { recursive: true });
    await fs.promises.mkdir(bad, { recursive: true });
    await fs.promises.mkdir(scope, { recursive: true });
    await fs.promises.symlink(path.resolve(process.cwd()), path.join(scope, 'opencli'), 'dir');
    await fs.promises.writeFile(
      path.join(good, 'hello.js'),
      "import { cli } from '@jackwener/opencli/registry';\n" +
      "cli({ site: 'sample', name: 'hello', description: 'extra fixture', access: 'read' });\n",
    );
    await fs.promises.chmod(bad, 0o000);
    vi.stubEnv('OPENCLI_EXTRA_CLIS_DIR', extra);

    try {
      await expect(discoverExtraClisDirs()).resolves.toBeUndefined();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining(`site directory ${bad}`));
      expect(getRegistry().get('sample/hello')).toBeDefined();
    } finally {
      getRegistry().delete('sample/hello');
      await fs.promises.chmod(bad, 0o700);
    }
  });

  it('loads a clis-shaped extra adapter that imports the host registry', async () => {
    const extra = path.join(root, 'extra');
    const site = path.join(extra, 'sample');
    const scope = path.join(extra, 'node_modules', '@jackwener');
    await fs.promises.mkdir(site, { recursive: true });
    await fs.promises.mkdir(scope, { recursive: true });
    await fs.promises.symlink(path.resolve(process.cwd()), path.join(scope, 'opencli'), 'dir');
    await fs.promises.writeFile(
      path.join(site, 'hello.js'),
      "import { cli } from '@jackwener/opencli/registry';\n" +
      "cli({ site: 'sample', name: 'hello', description: 'extra fixture', access: 'read' });\n",
    );
    vi.stubEnv('OPENCLI_EXTRA_CLIS_DIR', extra);

    await expect(discoverExtraClisDirs()).resolves.toBeUndefined();
    expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('Failed to load module'));
  });
});
