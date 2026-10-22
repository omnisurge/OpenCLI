import { projectPublicError } from './public-error.js';
import { redactText } from './observation/redaction.js';

export interface DiagnosticOptions {
  /** Presence, even for undefined, means a caught value should be described. */
  error?: unknown;
  verbose?: boolean;
  /** Fixed host label repeated on continuation lines, e.g. [trace]. */
  prefix?: string;
}

function printable(text: string): string {
  let out = '';
  for (const character of text) {
    const code = character.codePointAt(0)!;
    // This is output encoding, not a second credential-matching policy. Raw
    // controls (including ANSI ESC) cannot appear inside a YAML comment safely.
    out += code < 0x20 || (code >= 0x7f && code <= 0x9f)
      || (code >= 0xd800 && code <= 0xdfff) || code === 0x2028 || code === 0x2029
      || code === 0xfffe || code === 0xffff
      ? '\\u' + code.toString(16).padStart(4, '0') : character;
  }
  return out;
}

/**
 * Host stderr diagnostics are redacted YAML comments, not data or raw errors.
 * Keep human text/level markers while making every continuation line ignorable
 * by the parser of a following error envelope. stdout is deliberately untouched.
 */
export function writeDiagnostic(message: string, opts: DiagnosticOptions = {}): void {
  const lines = [message];
  if (Object.hasOwn(opts, 'error')) {
    const error = projectPublicError(opts.error, { verbose: opts.verbose ?? !!process.env.OPENCLI_VERBOSE });
    lines[0] += ': ' + error.message;
    if (error.name) lines.push('  name: ' + error.name);
    lines.push('  code: ' + error.code, '  exitCode: ' + error.exitCode);
    if (error.hint) lines.push('  hint: ' + error.hint);
    if (error.cause !== undefined) lines.push('  cause: ' + error.cause);
    if (error.stack) lines.push('  stack: ' + error.stack);
  }
  const prefix = redactText(opts.prefix ?? '');
  const text = redactText(lines.join('\n'));
  // Recognize line breaks before encoding; no message fragment can escape its
  // comment merely by containing CR, LF, or a Unicode line separator.
  const comments = text.split(/\r\n|[\n\r\u0085\u2028\u2029]/u)
    .map((line) => '# ' + printable(prefix + line)).join('\n');
  process.stderr.write(comments + '\n');
}
