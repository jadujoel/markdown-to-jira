import { copyPlugin } from "./copyPlugin"

Bun.build({
  entrypoints: ['src/index.ts'],
  minify: true,
  outdir: 'dist',
  sourcemap: 'external',
  target: 'browser',
  plugins: [
    copyPlugin('static/', 'dist')
  ],
})
