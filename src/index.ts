const IS_ABSOLUTE_RE = /^[/\\](?![/\\])|^[/\\]{2}(?!\.)|^[a-z]:[/\\]/i
const SOURCE_RE = /^(?<source>.+):(?<line>\d+):(?<column>\d+)$/u

/**
 * Extracts the function/source parts of a `    at fn (source)` (or `    at source`) stack
 * frame using string scanning rather than a regular expression, since the equivalent pattern
 * requires backtracking and is vulnerable to polynomial-time matching on hostile input.
 */
function parseTraceLine(line: string): { function?: string, source: string } | undefined {
  let start = 0
  while (start < line.length && (line[start] === ' ' || line[start] === '\t')) {
    start++
  }
  if (start === 0 || !line.startsWith('at ', start)) {
    return
  }

  const rest = line.slice(start + 3)
  if (rest.endsWith(')')) {
    const open = rest.lastIndexOf(' (')
    if (open > 0) {
      const source = rest.slice(open + 2, -1)
      if (source.length > 0 && !source.includes(')')) {
        return { function: rest.slice(0, open), source }
      }
    }
    return
  }

  if (rest.length === 0 || /\s/u.test(rest)) {
    return
  }
  return { source: rest }
}

export interface ParsedTrace {
  column?: number
  function?: string
  line?: number
  source: string
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

export function parseRawStackTrace(stacktrace: string): ParsedTrace[] {
  const trace: ParsedTrace[] = []
  for (const line of stacktrace.split('\n')) {
    const match = parseTraceLine(line)
    if (!match?.source) {
      continue
    }
    const parsed: Partial<Record<keyof ParsedTrace, string>> & { source: string } = {
      function: undefined,
      ...match,
    }

    const parsedSource = SOURCE_RE.exec(parsed.source)?.groups
    if (parsedSource) {
      Object.assign(parsed, parsedSource)
    }

    if (IS_ABSOLUTE_RE.test(parsed.source)) {
      parsed.source = `file://${parsed.source}`
    }

    if (parsed.source === import.meta.url) {
      continue
    }

    for (const key of ['line', 'column'] as const) {
      if (parsed[key]) {
        // @ts-expect-error assigning number to string
        parsed[key] = Number(parsed[key])
      }
    }

    trace.push(parsed as ParsedTrace)
  }

  return trace
}
