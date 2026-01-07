import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { captureStackTrace, parseRawStackTrace } from '../src'

describe('errx', () => {
  it('works', () => {
    const trace = captureStackTrace().map(t => ({
      ...t,
      column: typeof t.column === 'number' ? '<number>' : undefined,
      line: typeof t.line === 'number' ? '<number>' : undefined,
      source: t.source.replace(/^(.*node_modules\/)+/, ''),
    }))
    expect(trace).toMatchInlineSnapshot(`
      [
        {
          "column": "<number>",
          "function": undefined,
          "line": "<number>",
          "source": "${import.meta.url}",
        },
        {
          "column": "<number>",
          "function": undefined,
          "line": "<number>",
          "source": "@vitest/runner/dist/index.js",
        },
        {
          "column": "<number>",
          "function": undefined,
          "line": "<number>",
          "source": "@vitest/runner/dist/index.js",
        },
        {
          "column": "<number>",
          "function": undefined,
          "line": "<number>",
          "source": "@vitest/runner/dist/index.js",
        },
        {
          "column": undefined,
          "function": "new Promise",
          "line": undefined,
          "source": "<anonymous>",
        },
        {
          "column": "<number>",
          "function": "runWithTimeout",
          "line": "<number>",
          "source": "@vitest/runner/dist/index.js",
        },
        {
          "column": "<number>",
          "function": undefined,
          "line": "<number>",
          "source": "@vitest/runner/dist/index.js",
        },
        {
          "column": "<number>",
          "function": "Traces.$",
          "line": "<number>",
          "source": "vitest/dist/chunks/traces.U4xDYhzZ.js",
        },
      ]
    `)
  })
})

const sourcePath = fileURLToPath(new URL('../src/index.ts', import.meta.url))

const vitestTrace = `
Error:
    at Module.getTrace (${sourcePath}:10:9)
    at /Users/daniel/code/unjs/errx/test/index.test.ts:6:12
    at file:///Users/daniel/code/unjs/errx/node_modules/.pnpm/@vitest+runner@1.6.0/node_modules/@vitest/runner/dist/index.js:135:14
    at file:///Users/daniel/code/unjs/errx/node_modules/.pnpm/@vitest+runner@1.6.0/node_modules/@vitest/runner/dist/index.js:60:26
    at runTest (file:///Users/daniel/code/unjs/errx/node_modules/.pnpm/@vitest+runner@1.6.0/node_modules/@vitest/runner/dist/index.js:781:17)
    at runSuite (file:///Users/daniel/code/unjs/errx/node_modules/.pnpm/@vitest+runner@1.6.0/node_modules/@vitest/runner/dist/index.js:909:15)
    at runSuite (file:///Users/daniel/code/unjs/errx/node_modules/.pnpm/@vitest+runner@1.6.0/node_modules/@vitest/runner/dist/index.js:909:15)
    at runFiles (file:///Users/daniel/code/unjs/errx/node_modules/.pnpm/@vitest+runner@1.6.0/node_modules/@vitest/runner/dist/index.js:958:5)
    at startTests (file:///Users/daniel/code/unjs/errx/node_modules/.pnpm/@vitest+runner@1.6.0/node_modules/@vitest/runner/dist/index.js:967:3)
    at file:///Users/daniel/code/unjs/errx/node_modules/.pnpm/vitest@1.6.0_@types+node@20.14.9/node_modules/vitest/dist/chunks/runtime-runBaseTests.oAvMKtQC.js:116:7`

const jitiTrace = `
Error
    at getTrace (${sourcePath}:20:9)
    at ${sourcePath}:39:13
    at evalModule (/Users/daniel/.npm/_npx/d5f9a72d28c5edfe/node_modules/jiti/dist/jiti.js:1:247313)
    at jiti (/Users/daniel/.npm/_npx/d5f9a72d28c5edfe/node_modules/jiti/dist/jiti.js:1:245241)
    at Object.<anonymous> (/Users/daniel/.npm/_npx/d5f9a72d28c5edfe/node_modules/jiti/bin/jiti.js:16:1)
    at Module._compile (node:internal/modules/cjs/loader:1376:14)
    at Module._extensions..js (node:internal/modules/cjs/loader:1435:10)
    at Module.load (node:internal/modules/cjs/loader:1207:32)
    at Module._load (node:internal/modules/cjs/loader:1023:12)
    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:135:12)
    at node:internal/main/run_main_module:28:49`

const bunTrace = `
Error:
    at getTrace (${sourcePath}:38:8)
    at module code (${sourcePath}:19:14)
    at moduleEvaluation (native)
    at moduleEvaluation (native)
    at <anonymous> (native)
    at asyncFunctionResume (native)
    at promiseReactionJobWithoutPromiseUnwrapAsyncContext (native)
    at promiseReactionJob (native)`

const denoTrace = `
Error
    at captureStackTrace (file:///some/path:19:9)
    at file://${sourcePath}:59:13`

describe('parseStackTrace', () => {
  it('parses vitest', () => {
    expect(parseRawStackTrace(vitestTrace)).toMatchFileSnapshot('__snapshots__/vitest.json5')
  })
  it('parses jiti', () => {
    expect(parseRawStackTrace(jitiTrace)).toMatchFileSnapshot('__snapshots__/jiti.json5')
  })
  it('parses bun', () => {
    expect(parseRawStackTrace(bunTrace)).toMatchFileSnapshot('__snapshots__/bun.json5')
  })
  it('parses deno', () => {
    expect(parseRawStackTrace(denoTrace)).toMatchFileSnapshot('__snapshots__/deno.json5')
  })
})
