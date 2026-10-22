import { redactText } from './observation/redaction.js';

export interface PublicError {
  name?: string;
  code: string;
  message: string;
  hint?: string;
  exitCode: number;
  cause?: string;
  stack?: string;
}

export interface PublicErrorOptions {
  verbose?: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && (typeof value === 'object' || typeof value === 'function');
}

function causeText(cause: unknown, depth = 0): string {
  if (depth > 10) return '(cause chain truncated)';
  if (cause instanceof Error) {
    const nested = cause.cause === undefined ? '' : '\n  caused by: ' + causeText(cause.cause, depth + 1);
    return cause.message + nested;
  }
  return String(cause);
}

/**
 * The only projection from an internal thrown value to public error text.
 * Callers may rename/omit fields, but must not append raw hint/cause/stack later.
 * Keep the original error intact for programmatic identity and cause inspection.
 */
export function projectPublicError(error: unknown, opts: PublicErrorOptions = {}): PublicError {
  const record = isRecord(error) ? error : undefined;
  // exitCode distinguishes cross-package CliError copies from Node errno errors.
  const cliLike = record && typeof record.code === 'string'
    && typeof record.message === 'string' && typeof record.exitCode === 'number';
  const message = error instanceof Error || cliLike ? String(record!.message) : String(error);
  const cause = record?.cause === undefined ? undefined : causeText(record.cause);
  return {
    ...(typeof record?.name === 'string' ? { name: redactText(record.name) } : {}),
    code: cliLike ? redactText(record.code as string) : 'UNKNOWN',
    message: redactText(message),
    ...(cliLike && typeof record.hint === 'string' && record.hint ? { hint: redactText(record.hint) } : {}),
    exitCode: cliLike ? record.exitCode as number : 1,
    ...(cause === undefined ? {} : { cause: redactText(cause) }),
    ...(opts.verbose && typeof record?.stack === 'string' ? { stack: redactText(record.stack) } : {}),
  };
}
