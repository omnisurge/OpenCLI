/**
 * Runtime-core command execution.
 *
 * This module intentionally has no browser, download, or observation imports.
 * It executes browser:false adapter functions and the pure non-browser pipeline
 * subset; browser-only commands/steps fail with an explicit capability error.
 */

import { pathToFileURL } from 'node:url';
import {
  type CliCommand,
  type CommandArgs,
  type InternalCliCommand,
  type NonBrowserCliCommand,
  fullName,
  getRegistry,
} from './registry.js';
import { ArgumentError, CliError, EXIT_CODES, getErrorMessage } from './errors.js';
import { prepareCommandArgs } from './execution-core.js';

export { coerceAndValidateArgs, prepareCommandArgs } from './execution-core.js';
import { emitHook, type HookContext } from './hooks.js';
import { executeRuntimePipeline } from './runtime-pipeline.js';

const loadedModules = new Map<string, Promise<void>>();

export function prepareRuntimeArgs(cmd: CliCommand, rawKwargs: CommandArgs): CommandArgs {
  return prepareCommandArgs(cmd, rawKwargs);
}

async function loadRuntimeCommand(cmd: CliCommand): Promise<CliCommand> {
  const internal = cmd as InternalCliCommand;
  if (internal._lazy && internal._modulePath) {
    const modulePath = internal._modulePath;
    if (!loadedModules.has(modulePath)) {
      const loadPromise = import(pathToFileURL(modulePath).href).then(
        () => undefined,
        (err) => {
          loadedModules.delete(modulePath);
          throw new CliError(
            'ADAPTER_LOAD',
            `Failed to load adapter module ${modulePath}: ${getErrorMessage(err)}`,
            'Check that the adapter file exists and has no syntax errors.',
            EXIT_CODES.SERVICE_UNAVAIL,
          );
        },
      );
      loadedModules.set(modulePath, loadPromise);
    }
    await loadedModules.get(modulePath);
    return getRegistry().get(fullName(cmd)) ?? cmd;
  }
  return cmd;
}

export interface RuntimeExecuteOptions {
  prepared?: boolean;
  trace?: string;
}

export async function executeRuntimeCommand(
  cmd: CliCommand,
  rawKwargs: CommandArgs,
  debug = false,
  opts: RuntimeExecuteOptions = {},
): Promise<unknown> {
  if (cmd.browser === true) {
    throw new CliError(
      'BROWSER_CAPABILITY_UNAVAILABLE',
      `Command ${fullName(cmd)} requires the optional browser capability.`,
      'Use the development tool, or install the optional browser capability before running this command.',
      EXIT_CODES.SERVICE_UNAVAIL,
    );
  }

  let kwargs: CommandArgs;
  try {
    kwargs = opts.prepared ? rawKwargs : prepareRuntimeArgs(cmd, rawKwargs);
  } catch (err) {
    if (err instanceof ArgumentError) throw err;
    throw new ArgumentError(getErrorMessage(err));
  }

  const hookCtx: HookContext = {
    command: fullName(cmd),
    args: kwargs,
    startedAt: Date.now(),
  };
  await emitHook('onBeforeExecute', hookCtx);

  try {
    const resolved = await loadRuntimeCommand(cmd);
    if (resolved.browser === true) {
      throw new CliError(
        'BROWSER_CAPABILITY_UNAVAILABLE',
        `Command ${fullName(resolved)} requires the optional browser capability.`,
        'Use the development tool, or install the optional browser capability before running this command.',
        EXIT_CODES.SERVICE_UNAVAIL,
      );
    }
    const func = (resolved as NonBrowserCliCommand).func;
    let result: unknown;
    if (func) {
      result = await func(kwargs, debug);
    } else if (Array.isArray(resolved.pipeline) && resolved.pipeline.length > 0) {
      result = await executeRuntimePipeline(resolved.pipeline, kwargs, debug);
    } else {
      throw new CliError(
        'CORE_COMMAND_UNAVAILABLE',
        `Command ${fullName(resolved)} has neither a function nor a pipeline.`,
        'Use the development tool or check the adapter definition.',
        EXIT_CODES.CONFIG_ERROR,
      );
    }
    hookCtx.finishedAt = Date.now();
    await emitHook('onAfterExecute', hookCtx, result);
    return result;
  } catch (err) {
    hookCtx.error = err;
    hookCtx.finishedAt = Date.now();
    await emitHook('onAfterExecute', hookCtx);
    throw err;
  }
}
