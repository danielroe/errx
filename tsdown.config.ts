import { defineConfig } from 'tsdown'

export default defineConfig({
  dts: { generator: 'oxc' },
  exports: { devExports: true },
})
