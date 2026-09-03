const WINDOWS_DRIVE_RE = /^[a-z]:[/\\]/iu
const SOURCE_RE = /^(.+):(\d+):(\d+)$/u
/** Sources with no file information, including JSC's `native`, `(1:11)` and `(:0)` frames. */
const NATIVE_SOURCE_RE = /^(?:<anonymous>|native|unknown|:?\d+(?::\d+)?)$/u

/**
 * Returns the index at which a frame's contents begin (just after `at `), or `-1` if the
 * line is not an indented `at ` frame, such as the leading `Error: message` header.
 */
function getFrameStart(line: string): number {
  let start = 0
  while (line[start] === ' ' || line[start] === '\t') {
    start++
  }
  return start > 0 && line.startsWith('at ', start) ? start + 3 : -1
}

/**
 * Parses the contents of a `fn (source)` (or `source`) frame, using string scanning rather
 * than a regular expression, since the equivalent pattern requires backtracking and is
 * vulnerable to polynomial-time matching on hostile input.
 */
function parseFrame(rest: string): ParsedTrace | undefined {
  const frame: ParsedTrace = { function: undefined, source: '' }

  if (rest.startsWith('async ')) {
    frame.isAsync = true
    rest = rest.slice(6)
  }
  if (rest.startsWith('new ')) {
    frame.isConstructor = true
    rest = rest.slice(4)
  }

  if (rest.endsWith(')')) {
    const open = rest.lastIndexOf(' (')
    const source = open > 0 ? rest.slice(open + 2, -1) : ''
    if (source && !source.includes(')')) {
      frame.function = rest.slice(0, open)
      frame.source = source
    }
    else if (!parseEvalFrame(rest, frame)) {
      return
    }
  }
  else if (!rest || /\s/u.test(rest)) {
    return
  }
  else {
    frame.source = rest
  }

  const match = SOURCE_RE.exec(frame.source)
  if (match) {
    frame.source = match[1]!
    frame.line = Number(match[2])
    frame.column = Number(match[3])
  }

  if (NATIVE_SOURCE_RE.test(frame.source)) {
    frame.isNative = true
  }

  frame.source = toFileURL(frame.source)

  return frame
}

/**
 * Resolves an `eval` frame, such as `eval (eval at fn (file:1:2), <anonymous>:3:4)`, to the
 * innermost real source location, discarding the position within the evaluated code since
 * it cannot be resolved to a file.
 */
function parseEvalFrame(rest: string, frame: ParsedTrace): boolean {
  const evalAt = rest.lastIndexOf('eval at ')
  const open = evalAt < 0 ? -1 : rest.indexOf('(', evalAt)
  const close = open < 0 ? -1 : rest.indexOf(')', open)
  const source = close < 0 ? '' : rest.slice(open + 1, close)
  if (!source) {
    return false
  }

  const origin = rest.indexOf(' (eval at ')
  frame.isEval = true
  frame.function = origin > 0 ? rest.slice(0, origin) : undefined
  frame.source = source
  return true
}

/**
 * Converts an absolute filesystem path into a `file://` URL, so that Windows paths become
 * valid URLs (`C:\x\y.js` -> `file:///C:/x/y.js`, `\\server\share\x.js` ->
 * `file://server/share/x.js`). Sources that already carry a scheme, device paths
 * (`\\.\pipe\x`) and relative paths are returned unchanged.
 */
function toFileURL(source: string): string {
  if (WINDOWS_DRIVE_RE.test(source)) {
    return `file:///${source.replaceAll('\\', '/')}`
  }

  const [first, second, third] = source
  if (first !== '/' && first !== '\\') {
    return source
  }
  if (second !== '/' && second !== '\\') {
    return `file://${source.replaceAll('\\', '/')}`
  }
  return third === '.' ? source : `file://${source.slice(2).replaceAll('\\', '/')}`
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
  const stack = (error as Error | null | undefined)?.stack

  return typeof stack === 'string' ? parseRawStackTrace(stack) : []
}

/**
 * Parses a stack trace produced by V8 (Node, Deno, Chromium) or JSC (Bun) into structured
 * frames.
 *
 * Lines that are recognisably frames but cannot be parsed further are returned with an
 * empty `source`, so that a consumer can still render their `raw` text.
 */
export function parseRawStackTrace(stacktrace: string): ParsedTrace[] {
  const trace: ParsedTrace[] = []
  for (const rawLine of stacktrace.split('\n')) {
    const line = rawLine.trimEnd()
    const start = getFrameStart(line)
    if (start < 0) {
      continue
    }

    const frame = parseFrame(line.slice(start))
    if (!frame) {
      trace.push({ source: '', raw: line })
      continue
    }
    if (frame.source === import.meta.url) {
      continue
    }

    frame.raw = line
    trace.push(frame)
  }

  return trace
}
