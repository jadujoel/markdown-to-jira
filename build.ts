await Bun.build({
  entrypoints: ['src/index.html'],
  minify: true,
  outdir: 'dist',
  sourcemap: 'external',
  target: 'browser',
})
