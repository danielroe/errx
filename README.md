# errx

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![Github Actions][github-actions-src]][github-actions-href]
[![Codecov][codecov-src]][codecov-href]

> Zero dependency library to capture and parse stack traces in Node, Bun, Deno and more.

## Usage

Install package:

```sh
# npm
npm install errx

# pnpm
pnpm install errx
```

```js
import { captureRawStackTrace, captureStackTrace, parseRawStackTrace } from 'errx'

// returns raw string stack trace
captureRawStackTrace()
// returns parsed stack trace
captureStackTrace()

console.log(captureStackTrace())
// [{
//   function: undefined,
//   source: 'file:///code/danielroe/errx/playground/index.js',
//   line: 5,
//   column: 13
// }]
```

### `ParsedTrace`

```ts
interface ParsedTrace {
  column?: number
  function?: string
  line?: number
  source: string
  isAsync?: boolean
  isConstructor?: boolean
  isEval?: boolean
  isNative?: boolean
}
```

`function` holds the bare function name; V8's `async` and `new` prefixes are surfaced as `isAsync` and `isConstructor` instead. Frames with no resolvable location (`at Array.map (<anonymous>)`, `at moduleEvaluation (native)`) are kept, with `isNative` set and no `line`/`column`. For `eval` frames (`at eval (eval at fn (file.js:1:2), <anonymous>:3:4)`), `isEval` is set and `source`/`line`/`column` point at the innermost real file location rather than the position inside the evaluated code.

The `is*` flags are only present when `true`.

## 💻 Development

- Clone this repository
- Enable [Corepack](https://github.com/nodejs/corepack) using `corepack enable`
- Install dependencies using `pnpm install`
- Run interactive tests using `pnpm dev`

## License

Made with ❤️

Published under [MIT License](./LICENCE).

<!-- Badges -->

[npm-version-src]: https://npmx.dev/api/registry/badge/version/errx
[npm-version-href]: https://npmx.dev/package/errx
[npm-downloads-src]: https://npmx.dev/api/registry/badge/downloads/errx
[npm-downloads-href]: https://npm.chart.dev/errx
[github-actions-src]: https://img.shields.io/github/actions/workflow/status/danielroe/errx/ci.yml?branch=main&style=flat-square
[github-actions-href]: https://github.com/danielroe/errx/actions?query=workflow%3Aci
[codecov-src]: https://img.shields.io/codecov/c/gh/danielroe/errx/main?style=flat-square
[codecov-href]: https://codecov.io/gh/danielroe/errx
