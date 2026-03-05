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
//   source: 'file:///code/unjs/errx/playground/index.js',
//   line: '5',
//   column: '13'
// }]
```

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
[github-actions-src]: https://img.shields.io/github/actions/workflow/status/unjs/errx/ci.yml?branch=main&style=flat-square
[github-actions-href]: https://github.com/unjs/errx/actions?query=workflow%3Aci
[codecov-src]: https://img.shields.io/codecov/c/gh/unjs/errx/main?style=flat-square
[codecov-href]: https://codecov.io/gh/unjs/errx
