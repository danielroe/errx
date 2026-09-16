const SELF_URL = import.meta.url
/** Sources with no file information, including JSC's `native`, `(1:11)` and `(:0)` frames. */
const NATIVE_SOURCE_RE = /^(?:<anonymous>|native|unknown|:?\d+(?::\d+)?)$/u

function isSlash(code: number): boolean {
  return code === 47 || code === 92
}

function indexOrEnd(text: string, search: string, from: number): number {
  const index = text.indexOf(search, from)
  return index < 0 ? text.length : index
}

function isDigit(code: number): boolean {
  return code > 47 && code < 58
}

/** Matches the characters removed by `String.prototype.trim`. */
function isSpace(code: number): boolean {
  if (code < 128) {
    return code === 32 || (code > 8 && code < 14)
  }
  return !String.fromCharCode(code).trim()
}

/**
 * Parses the `fn (source)` (or `source`) frame found in `text[from, to)`, using string scanning rather
 * than a regular expression, since the equivalent pattern requires backtracking and is
 * vulnerable to polynomial-time matching on hostile input.
 */
/**
 * Positions of the next ` (` and space found in the stack trace, so that searches that run
 * past the current frame are not repeated for every following frame.
 */
interface Cursor {
  paren: number
  space: number
}

function parseFrame(text: string, from: number, to: number, cursor: Cursor): ParsedTrace | undefined {
  const frame: ParsedTrace = { function: undefined, source: '' }

  if (text.startsWith('async ', from)) {
    frame.isAsync = true
    from += 6
  }
  if (text.startsWith('new ', from)) {
    frame.isConstructor = true
    from += 4
  }

  let start = from
  let end = to
  if (text.charCodeAt(end - 1) === 41) {
    end--
    // forward search, since function names are short and sources long; when the candidate
    // source contains a space the last ` (` is found by scanning backwards instead
    if (cursor.paren < from) {
      cursor.paren = indexOrEnd(text, ' (', from)
    }
    let open = cursor.paren
    if (open < end) {
      if (cursor.space < open + 2) {
        cursor.space = indexOrEnd(text, ' ', open + 2)
      }
      if (cursor.space < end) {
        open = text.lastIndexOf(' (', end - 1)
      }
    }
    if (open > from && open + 2 < end && text.indexOf(')', open) === end) {
      frame.function = text.slice(from, open)
      start = open + 2
    }
    else {
      text = text.slice(from, to)
      start = parseEvalFrame(text, frame)
      if (start < 0) {
        return
      }
      end = text.indexOf(')', start)
    }
  }
  else if (from >= to || /\s/u.test(text.slice(from, to))) {
    return
  }

  // trailing `:line:column`
  let column = end
  let columnValue = 0
  let scale = 1
  let code = text.charCodeAt(column - 1)
  while (isDigit(code)) {
    columnValue += (code - 48) * scale
    scale *= 10
    code = text.charCodeAt(--column - 1)
  }
  if (column < end && code === 58) {
    let line = column - 1
    let lineValue = 0
    scale = 1
    code = text.charCodeAt(line - 1)
    while (isDigit(code)) {
      lineValue += (code - 48) * scale
      scale *= 10
      code = text.charCodeAt(--line - 1)
    }
    if (line < column - 1 && line > start + 1 && code === 58) {
      frame.line = lineValue
      frame.column = columnValue
      end = line - 1
    }
  }

  const src = text.slice(start, end)
  if (src.length < 20 && NATIVE_SOURCE_RE.test(src)) {
    frame.isNative = true
  }

  frame.source = toFileURL(src)

  return frame
}

/**
 * Resolves an `eval` frame, such as `eval (eval at fn (file:1:2), <anonymous>:3:4)`, to the
 * innermost real source location, discarding the position within the evaluated code since
 * it cannot be resolved to a file. Returns the index at which the source starts, or -1 for
 * other frames.
 */
function parseEvalFrame(rest: string, frame: ParsedTrace): number {
  const evalAt = rest.lastIndexOf('eval at ')
  const open = evalAt < 0 ? -1 : rest.indexOf('(', evalAt)
  const close = open < 0 ? -1 : rest.indexOf(')', open)
  if (close - open < 2) {
    return -1
  }
  const origin = rest.indexOf(' (eval at ')
  frame.isEval = true
  if (origin > 0) {
    frame.function = rest.slice(0, origin)
  }
  return open + 1
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
  if (isSlash(first)) {
    prefix = 'file://'
    const second = source.charCodeAt(1)
    if (isSlash(second)) {
      if (source.charCodeAt(2) === 46) {
        return source
      }
      source = source.slice(2)
    }
  }
  else if (((first | 32) < 97 || (first | 32) > 122) || source.charCodeAt(1) !== 58 || !isSlash(source.charCodeAt(2))) {
    return source
  }
  return prefix + (source.includes('\\') ? source.replaceAll('\\', '/') : source)
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
  const length = stacktrace.length
  const cursor: Cursor = { paren: -1, space: -1 }
  for (let start = 0, next = 0; start < length; start = next) {
    let end = stacktrace.indexOf('\n', start)
    if (end < 0) {
      end = length
    }
    next = end + 1
    // frames are indented, unlike the `Error: message` header
    let at = start
    while (at < end && isSpace(stacktrace.charCodeAt(at))) {
      at++
    }
    while (end > at && isSpace(stacktrace.charCodeAt(end - 1))) {
      end--
    }
    if (at === start || end - at < 3 || !stacktrace.startsWith('at ', at)) {
      continue
    }

    const frame = parseFrame(stacktrace, at + 3, end, cursor) ?? { source: '' }
    if (frame.source === SELF_URL) {
      continue
    }

    frame.raw = stacktrace.slice(start, end)
    trace.push(frame)
  }

  return trace
}
