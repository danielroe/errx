const IS_ABSOLUTE_RE = /^[/\\](?![/\\])|^[/\\]{2}(?!\.)|^[a-z]:[/\\]/i
const LINE_WITH_FUNCTION_RE = /^\s+at (?<function>.+) \((?<source>[^)]+)\)$/u
const LINE_WITHOUT_FUNCTION_RE = /^\s+at (?<source>\S+)$/u
const SOURCE_RE = /^(?<source>.+):(?<line>\d+):(?<column>\d+)$/u

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
    const match = LINE_WITH_FUNCTION_RE.exec(line) || LINE_WITHOUT_FUNCTION_RE.exec(line)
    if (!match?.groups?.source) {
      continue
    }
    const parsed: Partial<Record<keyof ParsedTrace, string>> & { source: string } = {
      function: undefined,
      ...match.groups,
      source: match.groups.source,
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
