# CLAUDE.md

## Commands

- **Install**: `bun install`
- **Dev server**: `bun run serve.ts` (serves on localhost)
- **Build**: `bun build.ts` (runs `build.ts`: builds `src/index.html`, copies `src/assets/`, writes `dist/.nojekyll` for GitHub Pages)
- **Build CLI**: `bun run build:cli` (compiles standalone `md2jira` binary)
- **Test**: `bun test` (runs `src/convert.test.ts`)
- **Test single**: `bun test -t "test name"` (filter by test name pattern)
- **Setup (for teammates)**: `./setup.sh` (builds binary, installs to `~/.local/bin`, installs Claude Code skill)
- **Deploy**: automatic via `.github/workflows/deploy.yml` on push to `main`

## Architecture

This is a Bun-based TypeScript web app that converts Markdown to JIRA wiki markup.

### Key files

- `src/convert.ts` — Core conversion logic. Exports `convert()` (markdown→JIRA) and `html()` (markdown→HTML preview)
- `src/index.ts` — Browser entry point. Wires up textarea input/output and exposes `window.convert`
- `src/index.html` — Single-page UI with side-by-side markdown input and JIRA output
- `serve.ts` — Bun dev server, serves the HTML page
- `build.ts` — Production build for GitHub Pages. Builds `src/index.html`, copies assets, writes `.nojekyll`
- `src/convert.test.ts` — Tests using `bun:test`
- `cli.ts` — CLI entry point. Reads markdown from stdin, outputs JIRA markup to stdout. Used by the `/md2jira` Claude Code skill.

### How conversion works

1. `marked` library parses Markdown with `JiraRenderer` (extends `Renderer`) that overrides each token type to emit JIRA wiki markup
2. Post-processors run sequentially on the output:
   - `fixCommentedCodeBlocks` — removes `#` prefixes inside code blocks
   - `fixDoubleUnderscore` — escapes `__` outside code blocks to prevent JIRA italics
   - `postProcessHtmlConversion` — decodes HTML entities and cleans whitespace outside code blocks
   - `escapeApiEndpoints` — escapes `{variable}` patterns in API paths outside code blocks

### Key patterns

- **`processCodeBlockLines`** — Utility that splits text by lines, tracks `{code}` block boundaries, and applies different transform lambdas for code-start, code-inside, code-end, and non-code lines. Used by all post-processors.
- **`langMap`** — Maps language aliases to JIRA-supported language identifiers for code blocks
- **`convertHtmlToJira`** — Regex-based HTML→JIRA converter used by `JiraRenderer.text()` and `JiraRenderer.html()` for inline HTML content
- Inline code renders with green color: `{color:#00875a}{{code}}{color}`
- Code blocks use: `{code:language=...|borderStyle=solid|theme=RDark|linenumbers=true|collapse=...}`
- Code blocks collapse when exceeding `MAX_CODE_LINE` (20) lines
