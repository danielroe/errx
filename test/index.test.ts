import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { captureStackTrace, parseError, parseRawStackTrace } from '../src'

describe('errx', () => {
  it('works', () => {
    const trace = captureStackTrace().map(t => ({
      ...t,
      column: typeof t.column === 'number' ? '<number>' : undefined,
      line: typeof t.line === 'number' ? '<number>' : undefined,
      raw: typeof t.raw === 'string' ? '<string>' : undefined,
      source: t.source.replace(/^(.*node_modules\/)+/, ''),
    }))
    expect(trace).toMatchInlineSnapshot(`
      [
        {
          "column": "<number>",
          "function": undefined,
          "line": "<number>",
          "raw": "<string>",
          "source": "${import.meta.url}",
        },
        {
          "column": "<number>",
          "function": undefined,
          "line": "<number>",
          "raw": "<string>",
          "source": "@vitest/runner/dist/chunk-artifact.js",
        },
        {
          "column": "<number>",
          "function": undefined,
          "line": "<number>",
          "raw": "<string>",
          "source": "@vitest/runner/dist/chunk-artifact.js",
        },
        {
          "column": "<number>",
          "function": undefined,
          "line": "<number>",
          "raw": "<string>",
          "source": "@vitest/runner/dist/chunk-artifact.js",
        },
        {
          "column": undefined,
          "function": "Promise",
          "isConstructor": true,
          "isNative": true,
          "line": undefined,
          "raw": "<string>",
          "source": "<anonymous>",
        },
        {
          "column": "<number>",
          "function": "runWithCancel",
          "line": "<number>",
          "raw": "<string>",
          "source": "@vitest/runner/dist/chunk-artifact.js",
        },
        {
          "column": "<number>",
          "function": undefined,
          "line": "<number>",
          "raw": "<string>",
          "source": "@vitest/runner/dist/chunk-artifact.js",
        },
        {
          "column": undefined,
          "function": "Promise",
          "isConstructor": true,
          "isNative": true,
          "line": undefined,
          "raw": "<string>",
          "source": "<anonymous>",
        },
      ]
    `)
  })
})

const sourcePath = fileURLToPath(new URL('../src/index.ts', import.meta.url))

const vitestTrace = `
Error:
    at Module.getTrace (${sourcePath}:10:9)
    at /Users/daniel/code/danielroe/errx/test/index.test.ts:6:12
    at file:///Users/daniel/code/danielroe/errx/node_modules/.pnpm/@vitest+runner@1.6.0/node_modules/@vitest/runner/dist/index.js:135:14
    at file:///Users/daniel/code/danielroe/errx/node_modules/.pnpm/@vitest+runner@1.6.0/node_modules/@vitest/runner/dist/index.js:60:26
    at runTest (file:///Users/daniel/code/danielroe/errx/node_modules/.pnpm/@vitest+runner@1.6.0/node_modules/@vitest/runner/dist/index.js:781:17)
    at runSuite (file:///Users/daniel/code/danielroe/errx/node_modules/.pnpm/@vitest+runner@1.6.0/node_modules/@vitest/runner/dist/index.js:909:15)
    at runSuite (file:///Users/daniel/code/danielroe/errx/node_modules/.pnpm/@vitest+runner@1.6.0/node_modules/@vitest/runner/dist/index.js:909:15)
    at runFiles (file:///Users/daniel/code/danielroe/errx/node_modules/.pnpm/@vitest+runner@1.6.0/node_modules/@vitest/runner/dist/index.js:958:5)
    at startTests (file:///Users/daniel/code/danielroe/errx/node_modules/.pnpm/@vitest+runner@1.6.0/node_modules/@vitest/runner/dist/index.js:967:3)
    at file:///Users/daniel/code/danielroe/errx/node_modules/.pnpm/vitest@1.6.0_@types+node@20.14.9/node_modules/vitest/dist/chunks/runtime-runBaseTests.oAvMKtQC.js:116:7`

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

const bunLegacyTrace = `
Error:
    at getTrace (${sourcePath}:38:8)
    at module code (${sourcePath}:19:14)
    at moduleEvaluation (native)
    at moduleEvaluation (native)
    at <anonymous> (native)
    at asyncFunctionResume (native)
    at promiseReactionJobWithoutPromiseUnwrapAsyncContext (native)
    at promiseReactionJob (native)`

// captured from node 24.19.0
const nodeEsmTrace = `Error: trace
    at getTrace (file:///tmp/repros/rt/gen.mjs:1:30)
    at file:///tmp/repros/rt/gen.mjs:4:33
    at ModuleJob.run (node:internal/modules/esm/module_job:439:25)
    at async node:internal/modules/esm/loader:643:26
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:101:5)`

// captured from node 24.19.0
const nodeCjsTrace = `Error: trace
    at getTrace (/tmp/repros/rt/gen.cjs:1:30)
    at Object.<anonymous> (/tmp/repros/rt/gen.cjs:2:31)
    at Module._compile (node:internal/modules/cjs/loader:1872:14)
    at Object..js (node:internal/modules/cjs/loader:2003:10)
    at Module.load (node:internal/modules/cjs/loader:1594:32)
    at Module._load (node:internal/modules/cjs/loader:1396:12)
    at wrapModuleLoad (node:internal/modules/cjs/loader:255:19)
    at Module.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:154:5)
    at node:internal/main/run_main_module:33:47`

// captured from node 22.22.2, which reports async frames via processTicksAndRejections
const node22EsmTrace = `Error: trace
    at getTrace (file:///tmp/repros/rt/gen.mjs:1:30)
    at file:///tmp/repros/rt/gen.mjs:4:33
    at ModuleJob.run (node:internal/modules/esm/module_job:343:25)
    at process.processTicksAndRejections (node:internal/process/task_queues:103:5)
    at async onImport.tracePromise.__proto__ (node:internal/modules/esm/loader:665:26)
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:117:5)`

// captured from bun 1.3.14
const bunTrace = `Error: m
    at <anonymous> (/tmp/repros/rt/gen.mjs:7:49)
    at map (native:1:11)
    at new Promise (1:11)
    at parse (unknown)
    at <parse> (:0)
    at eval (unknown)
    at anonymous (file:///tmp/repros/rt/gen2.mjs:3:17)
    at /tmp/repros/rt/gen.mjs:7:35`

const denoTrace = `
Error
    at captureStackTrace (file:///some/path:19:9)
    at file://${sourcePath}:59:13`

// captured from deno 2.9.6
const denoApiTrace = `NotFound: No such file or directory (os error 2): readfile 'nope'
    at Object.readTextFileSync (ext:deno_fs/30_fs.js:1:9859)
    at getSerialization (ext:deno_web/00_url.js:1:1270)
    at new URL (ext:deno_web/00_url.js:2:3156)
    at file:///tmp/repros/rt/gend.mjs:1:12`

const asyncTrace = `Error: x
    at asyncFn (${import.meta.url}:1:46)
    at async outer (${import.meta.url}:2:26)
    at async node:internal/modules/esm/loader:643:26
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:101:5)`

const constructorTrace = `Error: ctor
    at new Foo (${import.meta.url}:5:35)
    at ${import.meta.url}:6:7`

const nativeTrace = `Error: m
    at ${import.meta.url}:8:29
    at Array.map (<anonymous>)
    at JSON.parse (<anonymous>)
    at new Promise (<anonymous>)
    at <anonymous>`

const evalTrace = `Error: ev
    at eval (eval at evalHost (${import.meta.url}:10:30), <anonymous>:1:20)
    at eval (eval at inner (eval at outer (${import.meta.url}:11:3), <anonymous>:2:9), <anonymous>:1:1)
    at evalHost (${import.meta.url}:10:30)`

const schemeTrace = `Error
    at f (file:///x/y.js?v=abc:1:2)
    at g (webpack://src/x.js:1:2)
    at h (virtual:mod:1:2)
    at Object.<anonymous> (/x/y.js:16:1)
    at Module._compile (node:internal/modules/cjs/loader:1376:14)
    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:135:12)
    at internal/main/run_main_module:28:49`

describe('frame metadata', () => {
  it('should unwrap async frames', () => {
    expect(parseRawStackTrace(asyncTrace)).toMatchInlineSnapshot(`
      [
        {
          "column": 46,
          "function": "asyncFn",
          "line": 1,
          "raw": "    at asyncFn (${import.meta.url}:1:46)",
          "source": "${import.meta.url}",
        },
        {
          "column": 26,
          "function": "outer",
          "isAsync": true,
          "line": 2,
          "raw": "    at async outer (${import.meta.url}:2:26)",
          "source": "${import.meta.url}",
        },
        {
          "column": 26,
          "function": undefined,
          "isAsync": true,
          "line": 643,
          "raw": "    at async node:internal/modules/esm/loader:643:26",
          "source": "node:internal/modules/esm/loader",
        },
        {
          "column": 5,
          "function": "asyncRunEntryPointWithESMLoader",
          "isAsync": true,
          "line": 101,
          "raw": "    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:101:5)",
          "source": "node:internal/modules/run_main",
        },
      ]
    `)
  })

  it('should unwrap constructor frames', () => {
    expect(parseRawStackTrace(constructorTrace)).toMatchInlineSnapshot(`
      [
        {
          "column": 35,
          "function": "Foo",
          "isConstructor": true,
          "line": 5,
          "raw": "    at new Foo (${import.meta.url}:5:35)",
          "source": "${import.meta.url}",
        },
        {
          "column": 7,
          "function": undefined,
          "line": 6,
          "raw": "    at ${import.meta.url}:6:7",
          "source": "${import.meta.url}",
        },
      ]
    `)
  })

  it('should preserve frames without a resolvable source', () => {
    expect(parseRawStackTrace(nativeTrace)).toMatchInlineSnapshot(`
      [
        {
          "column": 29,
          "function": undefined,
          "line": 8,
          "raw": "    at ${import.meta.url}:8:29",
          "source": "${import.meta.url}",
        },
        {
          "function": "Array.map",
          "isNative": true,
          "raw": "    at Array.map (<anonymous>)",
          "source": "<anonymous>",
        },
        {
          "function": "JSON.parse",
          "isNative": true,
          "raw": "    at JSON.parse (<anonymous>)",
          "source": "<anonymous>",
        },
        {
          "function": "Promise",
          "isConstructor": true,
          "isNative": true,
          "raw": "    at new Promise (<anonymous>)",
          "source": "<anonymous>",
        },
        {
          "function": undefined,
          "isNative": true,
          "raw": "    at <anonymous>",
          "source": "<anonymous>",
        },
      ]
    `)
  })

  it('should preserve eval frames, using the innermost real source', () => {
    expect(parseRawStackTrace(evalTrace)).toMatchInlineSnapshot(`
      [
        {
          "column": 30,
          "function": "eval",
          "isEval": true,
          "line": 10,
          "raw": "    at eval (eval at evalHost (${import.meta.url}:10:30), <anonymous>:1:20)",
          "source": "${import.meta.url}",
        },
        {
          "column": 3,
          "function": "eval",
          "isEval": true,
          "line": 11,
          "raw": "    at eval (eval at inner (eval at outer (${import.meta.url}:11:3), <anonymous>:2:9), <anonymous>:1:1)",
          "source": "${import.meta.url}",
        },
        {
          "column": 30,
          "function": "evalHost",
          "line": 10,
          "raw": "    at evalHost (${import.meta.url}:10:30)",
          "source": "${import.meta.url}",
        },
      ]
    `)
  })

  it('should round-trip sources with query strings and non-file schemes', () => {
    expect(parseRawStackTrace(schemeTrace)).toMatchInlineSnapshot(`
      [
        {
          "column": 2,
          "function": "f",
          "line": 1,
          "raw": "    at f (file:///x/y.js?v=abc:1:2)",
          "source": "file:///x/y.js?v=abc",
        },
        {
          "column": 2,
          "function": "g",
          "line": 1,
          "raw": "    at g (webpack://src/x.js:1:2)",
          "source": "webpack://src/x.js",
        },
        {
          "column": 2,
          "function": "h",
          "line": 1,
          "raw": "    at h (virtual:mod:1:2)",
          "source": "virtual:mod",
        },
        {
          "column": 1,
          "function": "Object.<anonymous>",
          "line": 16,
          "raw": "    at Object.<anonymous> (/x/y.js:16:1)",
          "source": "file:///x/y.js",
        },
        {
          "column": 14,
          "function": "Module._compile",
          "line": 1376,
          "raw": "    at Module._compile (node:internal/modules/cjs/loader:1376:14)",
          "source": "node:internal/modules/cjs/loader",
        },
        {
          "column": 12,
          "function": "Function.executeUserEntryPoint [as runMain]",
          "line": 135,
          "raw": "    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:135:12)",
          "source": "node:internal/modules/run_main",
        },
        {
          "column": 49,
          "function": undefined,
          "line": 28,
          "raw": "    at internal/main/run_main_module:28:49",
          "source": "internal/main/run_main_module",
        },
      ]
    `)
  })
})

describe('absolute paths', () => {
  const windowsTrace = String.raw`Error
    at foo (C:\x\y.js:1:2)
    at foo (C:/x/y.js:3:4)
    at c:\x\y.js:5:6
    at foo (C:\Users\My Folder\y.js:7:8)
    at foo (\\server\share\x.js:9:10)
    at foo (\\.\pipe\x:11:12)
    at foo (\x\y.js:13:14)`

  const otherSourcesTrace = `Error
    at /x/y.js:1:2
    at file:///x/y.js?v=abc:3:4
    at node:internal/modules/cjs/loader:5:6
    at webpack://src/x.js:7:8
    at virtual:mod:9:10
    at http://localhost:3000/x.js:11:12
    at foo (relative/x.js:13:14)`

  it('should convert windows paths to valid file urls', () => {
    expect(parseRawStackTrace(windowsTrace).map(f => f.source)).toMatchInlineSnapshot(`
      [
        "file:///C:/x/y.js",
        "file:///C:/x/y.js",
        "file:///c:/x/y.js",
        "file:///C:/Users/My Folder/y.js",
        "file://server/share/x.js",
        "\\\\.\\pipe\\x",
        "file:///x/y.js",
      ]
    `)
  })

  it('should keep line and column despite the drive letter colon', () => {
    expect(parseRawStackTrace(windowsTrace).map(f => [f.line, f.column])).toEqual([
      [1, 2],
      [3, 4],
      [5, 6],
      [7, 8],
      [9, 10],
      [11, 12],
      [13, 14],
    ])
  })

  it('should produce parseable urls', () => {
    for (const { source } of parseRawStackTrace(windowsTrace)) {
      if (source.startsWith('file://')) {
        expect(() => new URL(source)).not.toThrow()
      }
    }
  })

  it('should leave posix paths, schemes and relative paths alone', () => {
    expect(parseRawStackTrace(otherSourcesTrace).map(f => f.source)).toMatchInlineSnapshot(`
      [
        "file:///x/y.js",
        "file:///x/y.js?v=abc",
        "node:internal/modules/cjs/loader",
        "webpack://src/x.js",
        "virtual:mod",
        "http://localhost:3000/x.js",
        "relative/x.js",
      ]
    `)
  })
})

describe('parseError', () => {
  it('should parse the stack of an existing error', () => {
    const trace = parseError(new Error('boom'))
    expect(trace.length).toBeGreaterThan(0)
    expect(trace[0]!.source).toBe(import.meta.url)
  })

  it('should return an empty trace for values without a string stack', () => {
    expect(parseError(undefined)).toEqual([])
    expect(parseError(null)).toEqual([])
    expect(parseError({})).toEqual([])
    expect(parseError({ stack: { toString: () => 'nope' } })).toEqual([])
  })
})

describe('unparseable frames', () => {
  it('should preserve the raw line when the frame shape is unknown', () => {
    expect(parseRawStackTrace(`Error: x
    at fn (file:///a.js:1:2)
    at fn (weird (shape))
not a frame at all
    at multiple words here`)).toMatchInlineSnapshot(`
      [
        {
          "column": 2,
          "function": "fn",
          "line": 1,
          "raw": "    at fn (file:///a.js:1:2)",
          "source": "file:///a.js",
        },
        {
          "raw": "    at fn (weird (shape))",
          "source": "",
        },
        {
          "raw": "    at multiple words here",
          "source": "",
        },
      ]
    `)
  })

  it('should parse stacks with carriage returns', () => {
    expect(parseRawStackTrace('Error: x\r\n    at fn (file:///a.js:1:2)\r\n    at file:///b.js:3:4\r\n')).toMatchInlineSnapshot(`
      [
        {
          "column": 2,
          "function": "fn",
          "line": 1,
          "raw": "    at fn (file:///a.js:1:2)",
          "source": "file:///a.js",
        },
        {
          "column": 4,
          "function": undefined,
          "line": 3,
          "raw": "    at file:///b.js:3:4",
          "source": "file:///b.js",
        },
      ]
    `)
  })
})

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
  it('parses older bun', () => {
    expect(parseRawStackTrace(bunLegacyTrace)).toMatchFileSnapshot('__snapshots__/bun-legacy.json5')
  })
  it('parses node esm', () => {
    expect(parseRawStackTrace(nodeEsmTrace)).toMatchFileSnapshot('__snapshots__/node-esm.json5')
  })
  it('parses node cjs', () => {
    expect(parseRawStackTrace(nodeCjsTrace)).toMatchFileSnapshot('__snapshots__/node-cjs.json5')
  })
  it('parses node 22 esm', () => {
    expect(parseRawStackTrace(node22EsmTrace)).toMatchFileSnapshot('__snapshots__/node-22-esm.json5')
  })
  it('parses deno', () => {
    expect(parseRawStackTrace(denoTrace)).toMatchFileSnapshot('__snapshots__/deno.json5')
  })
  it('parses deno internals', () => {
    expect(parseRawStackTrace(denoApiTrace)).toMatchFileSnapshot('__snapshots__/deno-api.json5')
  })
})
