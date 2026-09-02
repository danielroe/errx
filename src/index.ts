const IS_ABSOLUTE_RE = /^[/\\](?![/\\])|^[/\\]{2}(?!\.)|^[a-z]:[/\\]/i
const SOURCE_RE = /^(?<source>.+):(?<line>\d+):(?<column>\d+)$/u

/**
 * Extracts the function/source parts of a `    at fn (source)` (or `    at source`) stack
 * frame using string scanning rather than a regular expression, since the equivalent pattern
 * requires backtracking and is vulnerable to polynomial-time matching on hostile input.
 */
function parseTraceLine(line: string): ParsedFrame | undefined {
  let start = 0
  while (start < line.length && (line[start] === ' ' || line[start] === '\t')) {
    start++
  }
  if (start === 0 || !line.startsWith('at ', start)) {
    return
  }

  let rest = line.slice(start + 3)
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
  /** Set when the frame has no resolvable source, i.e. `<anonymous>` or `native`. */
  isNative?: boolean
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

export function parseRawStackTrace(stacktrace: string): ParsedTrace[] {
  const trace: ParsedTrace[] = []
  for (const line of stacktrace.split('\n')) {
    const match = parseTraceLine(line)
    if (!match?.source) {
      continue
    }
    const parsed: ParsedFrame = {
      function: undefined,
      ...match,
    }

    const parsedSource = SOURCE_RE.exec(parsed.source)?.groups
    if (parsedSource) {
      parsed.source = parsedSource.source!
      parsed.line = Number(parsedSource.line)
      parsed.column = Number(parsedSource.column)
    }
    else if (parsed.source === '<anonymous>' || parsed.source === 'native') {
      parsed.isNative = true
    }

    if (IS_ABSOLUTE_RE.test(parsed.source)) {
      parsed.source = `file://${parsed.source}`
    }

    if (parsed.source === import.meta.url) {
      continue
    }

    trace.push(parsed as ParsedTrace)
  }

  return trace
}
