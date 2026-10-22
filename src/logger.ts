/**
 * Unified logging for opencli.
 *
 * All framework stderr diagnostics pass one safe, parseable output boundary.
 * Messages keep their existing human level markers and verbosity semantics;
 * the leading YAML comment marker keeps them out of machine error envelopes.
 */
import { writeDiagnostic } from './diagnostics.js';

function isVerbose(): boolean {
  return !!process.env.OPENCLI_VERBOSE;
}

function emit(message: string, errors: [] | [unknown]): void {
  writeDiagnostic(message, errors.length ? { error: errors[0] } : {});
}

export const log = {
  /** Informational message (always shown) */
  info(msg: string, ...errors: [] | [unknown]): void {
    emit('ℹ  ' + msg, errors);
  },

  /** Lightweight status line for adapter progress updates */
  status(msg: string, ...errors: [] | [unknown]): void {
    emit(msg, errors);
  },

  /** Positive completion/status line without the heavier info prefix */
  success(msg: string, ...errors: [] | [unknown]): void {
    emit(msg, errors);
  },

  /** Warning (always shown); pass caught values separately to retain safe context. */
  warn(msg: string, ...errors: [] | [unknown]): void {
    emit('⚠  ' + msg, errors);
  },

  /** Error (always shown) */
  error(msg: string, ...errors: [] | [unknown]): void {
    emit('✖  ' + msg, errors);
  },

  /** Verbose output (shown when -v flag or OPENCLI_VERBOSE is set) */
  verbose(msg: string, ...errors: [] | [unknown]): void {
    if (isVerbose()) emit('[verbose] ' + msg, errors);
  },

  /** Alias for verbose output. */
  debug(msg: string, ...errors: [] | [unknown]): void {
    this.verbose(msg, ...errors);
  },

  /** Step-style debug (for pipeline steps, etc.) */
  step(stepNum: number, total: number, op: string, preview: string = ''): void {
    emit('  [' + stepNum + '/' + total + '] ' + op + preview, []);
  },

  /** Step result summary */
  stepResult(summary: string): void {
    emit('       → ' + summary, []);
  },
};
