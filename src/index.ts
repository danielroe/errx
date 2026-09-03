const IS_ROOTED_RE = /^[/\\](?![/\\])/u
const IS_UNC_RE = /^[/\\]{2}(?!\.)/u
const IS_WINDOWS_DRIVE_RE = /^[a-z]:[/\\]/iu
const SOURCE_RE = /^(?<source>.+):(?<line>\d+):(?<column>\d+)$/u
/** Sources that carry no file information, such as JSC's `(1:11)` and `(:0)` frames. */
const NATIVE_SOURCE_RE = /^:?\d+(?::\d+)?$/u
const NATIVE_SOURCES = new Set(['<anonymous>', 'native', 'unknown'])

/**
 * Returns the index at which a frame's contents begin (just after `at `), or `-1` if the
 * line is not an indented `at ` frame, such as the leading `Error: message` header.
 */
function getFrameStart(line: string): number {
  let start = 0
  while (start < line.length && (line[start] === ' ' || line[start] === '\t')) {
    start++
  }
  if (start === 0 || !line.startsWith('at ', start)) {
    return -1
  }
  return start + 3
}

/**
 * Extracts the function/source parts of a `    at fn (source)` (or `    at source`) stack
 * frame using string scanning rather than a regular expression, since the equivalent pattern
 * requires backtracking and is vulnerable to polynomial-time matching on hostile input.
 */
function parseTraceLine(line: string): ParsedFrame | undefined {
  const start = getFrameStart(line)
  if (start < 0) {
    return
  }

  let rest = line.slice(start)
  const flags: Omit<ParsedFrame, 'source'> = {}

  if (rest.startsWith('async ')) {
    flags.isAsync = true
    rest = rest.slice(6)
  }
  if (rest.startsWith('new ')) {
    flags.isConstructor = true
    rest = rest.slice(4)
  }

  if (rest.endsWith(')')) {
    const open = rest.lastIndexOf(' (')
    if (open > 0) {
      const source = rest.slice(open + 2, -1)
      if (source.length > 0 && !source.includes(')')) {
        return { ...flags, function: rest.slice(0, open), source }
      }
    }
    return parseEvalTraceLine(rest, flags)
  }

  if (rest.length === 0 || /\s/u.test(rest)) {
    return
  }
  return { ...flags, source: rest }
}

/**
 * Extracts the innermost real source location from an `eval` frame, such as
 * `eval (eval at fn (file:1:2), <anonymous>:3:4)`, discarding the position within the
 * evaluated code since it cannot be resolved to a file.
 */
function parseEvalTraceLine(rest: string, flags: Omit<ParsedFrame, 'source'>): ParsedFrame | undefined {
  const evalAt = rest.lastIndexOf('eval at ')
  if (evalAt < 0) {
    return
  }

  const open = rest.indexOf('(', evalAt)
  const close = open < 0 ? -1 : rest.indexOf(')', open)
  if (close < 0) {
    return
  }

  const source = rest.slice(open + 1, close)
  if (source.length === 0) {
    return
  }

  const origin = rest.indexOf(' (eval at ')
  return {
    ...flags,
    isEval: true,
    function: origin > 0 ? rest.slice(0, origin) : undefined,
    source,
  }
}

/**
 * Converts an absolute filesystem path into a `file://` URL, so that Windows paths become
 * valid URLs (`C:\x\y.js` -> `file:///C:/x/y.js`, `\\server\share\x.js` ->
 * `file://server/share/x.js`). Sources that already carry a scheme, and relative paths,
 * are returned unchanged.
 */
function toFileURL(source: string): string {
  if (IS_WINDOWS_DRIVE_RE.test(source)) {
    return `file:///${source.replaceAll('\\', '/')}`
  }
  if (IS_UNC_RE.test(source)) {
    return `file://${source.slice(2).replaceAll('\\', '/')}`
  }
  if (IS_ROOTED_RE.test(source)) {
    return `file://${source.replaceAll('\\', '/')}`
  }
  return source
}

export interface ParsedTrace {
  column?: number
  function?: string
  line?: number
  source: string
  /** Set when the frame is an `await` resumption point (`at async fn (...)`). */
  isAsync?: boolean
  /** Set when the frame is a constructor call (`at new Foo (...)`). */
  isConstructor?: boolean
  /** Set when the frame is inside evaluated code (`at eval (eval at fn (...), <anonymous>:1:1)`). */
  isEval?: boolean
  /** Set when the frame has no resolvable source, such as `<anonymous>`, `native` or `unknown`. */
  isNative?: boolean
  /** The original stack trace line, useful for rendering frames whose shape cannot be parsed. */
  raw?: string
}

type ParsedFrame = Partial<ParsedTrace> & { source: string }

export function captureRawStackTrace(): string | undefined {
  if (!Error.captureStackTrace) {
    return
  }

  // eslint-disable-next-line unicorn/error-message
  const stack = new Error()
  Error.captureStackTrace(stack)
  return stack.stack
}

export function captureStackTrace(): ParsedTrace[] {
  const stack = captureRawStackTrace()

  return stack ? parseRawStackTrace(stack) : []
}

/**
 * Parses the stack trace of an existing error, returning an empty array for errors
 * without a (string) stack.
 */
export function parseError(error: unknown): ParsedTrace[] {
  const stack = (error as { stack?: unknown } | undefined | null)?.stack

  return typeof stack === 'string' ? parseRawStackTrace(stack) : []
}

/**
 * Parses a stack trace produced by V8 (Node, Deno, Chromium) into structured frames.
 *
 * Lines that are recognisably frames but cannot be parsed further are returned with an
 * empty `source`, so that a consumer can still render their `raw` text.
 */
export function parseRawStackTrace(stacktrace: string): ParsedTrace[] {
  const trace: ParsedTrace[] = []
  for (const rawLine of stacktrace.split('\n')) {
    const line = rawLine.trimEnd()
    if (getFrameStart(line) < 0) {
      continue
    }

    const match = parseTraceLine(line)
    if (!match?.source) {
      trace.push({ source: '', raw: line })
      continue
    }
    const parsed: ParsedFrame = {
      function: undefined,
      ...match,
      raw: line,
    }

    const parsedSource = SOURCE_RE.exec(parsed.source)?.groups
    if (parsedSource) {
      parsed.source = parsedSource.source!
      parsed.line = Number(parsedSource.line)
      parsed.column = Number(parsedSource.column)
    }

    if (NATIVE_SOURCES.has(parsed.source) || NATIVE_SOURCE_RE.test(parsed.source)) {
      parsed.isNative = true
    }

    parsed.source = toFileURL(parsed.source)

    if (parsed.source === import.meta.url) {
      continue
    }

    trace.push(parsed as ParsedTrace)
  }

  return trace
}
