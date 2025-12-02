import { cp, writeFile } from 'fs/promises'

await Bun.build({
  entrypoints: ['src/index.html'],
  minify: true,
  outdir: 'dist',
  sourcemap: 'external',
  target: 'browser',
})

// Copy assets folder to dist
await cp('src/assets', 'dist/assets', { recursive: true })

// Create .nojekyll file for GitHub Pages
await writeFile('dist/.nojekyll', '')
