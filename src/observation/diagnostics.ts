import { writeDiagnostic } from '../diagnostics.js';

/** Trace labels share the host diagnostic sink; no independent raw error path. */
export function warnTrace(message: string, ...errors: [] | [unknown]): void {
  writeDiagnostic(message, { prefix: '[trace] ', ...(errors.length ? { error: errors[0] } : {}) });
}
