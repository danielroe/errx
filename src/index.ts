const SELF_URL = import.meta.url
const WINDOWS_DRIVE_RE = /^[a-z]:[/\\]/iu
/** Sources with no file information, including JSC's `native`, `(1:11)` and `(:0)` frames. */
const NATIVE_SOURCE_RE = /^(?:<anonymous>|native|unknown|:?\d+(?::\d+)?)$/u

function isDigit(code: number): boolean {
  return code > 47 && code < 58
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

  let src: string
  if (rest.endsWith(')')) {
    const open = rest.lastIndexOf(' (')
    const inner = open > 0 ? rest.slice(open + 2, -1) : ''
    if (inner && !inner.includes(')')) {
      frame.function = rest.slice(0, open)
      src = inner
    }
    else {
      src = parseEvalFrame(rest, frame)
      if (!src) {
        return
      }
    }
  }
  else if (!rest || /\s/u.test(rest)) {
    return
  }
  else {
    src = rest
  }

  // trailing `:line:column`
  let column = src.length
  while (isDigit(src.charCodeAt(column - 1))) {
    column--
  }
  if (column < src.length && src.charCodeAt(column - 1) === 58) {
    let line = column - 1
    while (isDigit(src.charCodeAt(line - 1))) {
      line--
    }
    if (line < column - 1 && line > 1 && src.charCodeAt(line - 1) === 58) {
      frame.line = +src.slice(line, column - 1)
      frame.column = +src.slice(column)
      src = src.slice(0, line - 1)
    }
  }

  if (NATIVE_SOURCE_RE.test(src)) {
    frame.isNative = true
  }

  frame.source = toFileURL(src)

  return frame
}

/**
 * Resolves an `eval` frame, such as `eval (eval at fn (file:1:2), <anonymous>:3:4)`, to the
 * innermost real source location, discarding the position within the evaluated code since
 * it cannot be resolved to a file. Returns an empty string for other frames.
 */
function parseEvalFrame(rest: string, frame: ParsedTrace): string {
  const evalAt = rest.lastIndexOf('eval at ')
  const open = evalAt < 0 ? -1 : rest.indexOf('(', evalAt)
  const close = open < 0 ? -1 : rest.indexOf(')', open)
  const source = close < 0 ? '' : rest.slice(open + 1, close)
  if (source) {
    const origin = rest.indexOf(' (eval at ')
    frame.isEval = true
    if (origin > 0) {
      frame.function = rest.slice(0, origin)
    }
  }
  return source
}

/**
 * Converts an absolute filesystem path into a `file://` URL, so that Windows paths become
 * valid URLs (`C:\x\y.js` -> `file:///C:/x/y.js`, `\\server\share\x.js` ->
 * `file://server/share/x.js`). Sources that already carry a scheme, device paths
 * (`\\.\pipe\x`) and relative paths are returned unchanged.
 */
function toFileURL(source: string): string {
  const first = source.charCodeAt(0)
  let prefix = 'file:///'
  if (first === 47 || first === 92) {
    prefix = 'file://'
    const second = source.charCodeAt(1)
    if (second === 47 || second === 92) {
      if (source.charCodeAt(2) === 46) {
        return source
      }
      source = source.slice(2)
    }
  }
  else if (!WINDOWS_DRIVE_RE.test(source)) {
    return source
  }
  return prefix + source.replaceAll('\\', '/')
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
  const holder: { stack?: string } = {}
  Error.captureStackTrace?.(holder, captureRawStackTrace)
  return holder.stack
}

export function captureStackTrace(): ParsedTrace[] {
  return parseRawStackTrace(captureRawStackTrace() ?? '')
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
    // frames are indented, unlike the `Error: message` header
    const line = rawLine.trimEnd()
    const rest = line.trimStart()
    if (rest.length === line.length || !rest.startsWith('at ')) {
      continue
    }

    const frame = parseFrame(rest.slice(3)) ?? { source: '' }
    if (frame.source === SELF_URL) {
      continue
    }

    frame.raw = line
    trace.push(frame)
  }

  return trace
}
