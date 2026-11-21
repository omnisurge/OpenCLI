/**
 * Minimal non-browser pipeline executor for runtime-core.
 *
 * The full pipeline registry intentionally imports browser steps. Runtime-core
 * supports the pure HTTP/transform subset (fetch/select/map/filter/sort/limit);
 * browser and download steps require an optional capability and are rejected.
 */

import { CliError, EXIT_CODES } from './errors.js';
import { stepFetch } from './pipeline/steps/fetch.js';
import { stepSelect, stepMap, stepFilter, stepSort, stepLimit } from './pipeline/steps/transform.js';

type CoreStepHandler = (
  page: null,
  params: unknown,
  data: unknown,
  args: Record<string, unknown>,
) => Promise<unknown>;

const CORE_STEPS: Record<string, CoreStepHandler> = {
  fetch: stepFetch as unknown as CoreStepHandler,
  select: stepSelect,
  map: stepMap as CoreStepHandler,
  filter: stepFilter,
  sort: stepSort,
  limit: stepLimit,
};

export async function executeRuntimePipeline(
  pipeline: unknown[],
  args: Record<string, unknown>,
  _debug = false,
): Promise<unknown> {
  let data: unknown = null;
  for (let index = 0; index < pipeline.length; index++) {
    const step = pipeline[index];
    if (!step || typeof step !== 'object') continue;
    for (const [op, params] of Object.entries(step)) {
      const handler = CORE_STEPS[op];
      if (!handler) {
        throw new CliError(
          'CORE_PIPELINE_STEP_UNAVAILABLE',
          `Pipeline step "${op}" at index ${index} requires an optional capability.`,
          'Use the development tool or install the optional browser/download capability.',
          EXIT_CODES.SERVICE_UNAVAIL,
        );
      }
      data = await handler(null, params, data, args);
    }
  }
  return data;
}
