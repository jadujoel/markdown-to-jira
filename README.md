# Markdown to Jira

Convert Markdown to Jira wiki markup. Paste your Markdown into a browser-based editor and get correctly formatted Jira text you can copy straight into issue comments.

**Live site:** <https://jadujoel.github.io/markdown-to-jira/>

## Features

- Headings (`# H1` → `h1. H1`)
- **Bold**, *italic*, ~~strikethrough~~
- Inline code and fenced code blocks (with language and theme support)
- Ordered and unordered lists
- Links, images, blockquotes, horizontal rules, tables
- Live HTML preview with syntax highlighting (highlight.js)
- Code blocks longer than 20 lines are automatically collapsed
- Hide / show each panel — layout preference persisted in localStorage
- Installable as a PWA (Add to Home Screen / desktop app)
- Offline support via service worker

## Supported Code Languages

`actionscript3`, `applescript`, `bash`, `c`, `coldfusion`, `cpp`, `csharp`, `css`, `delphi`, `diff`, `erlang`, `groovy`, `html/xml`, `java`, `javafx`, `javascript`, `json`, `kotlin`, `lua`, `none`, `nyan`, `objc`, `pascal`, `perl`, `php`, `plaintext`, `powershell`, `python`, `r`, `ruby`, `rust`, `sass`, `scala`, `sql`, `swift`, `typescript`, `vb`, `xml`, `yaml`

**Aliases:** `sh`/`shell`/`zsh` → bash, `js`/`jsx`/`mjs` → javascript, `ts`/`tsx` → typescript, `py` → python, `rb` → ruby, `rs` → rust, `cs`/`c#` → csharp, `c++` → cpp, `objective-c`/`objectivec` → objc, `yml` → yaml, `html`/`htm`/`xhtml` → html/xml, `kt` → kotlin, `ps1` → powershell, `pl` → perl, `scss` → sass, `vbnet` → vb, `patch` → diff, `text`/`txt` → plaintext

## Project Structure

```
markdown-to-jira/
├── src/
│   ├── convert.ts            # Core converter: JiraRenderer + HTML renderer
│   ├── convert.test.ts       # Unit tests (bun:test)
│   ├── convert.e2e.test.ts   # End-to-end tests against live Jira Cloud
│   ├── index.ts              # Browser entry point (wires up textarea I/O)
│   ├── index.html            # Single-page app shell
│   ├── style.css             # Dark-theme three-column layout
│   ├── sw.ts                 # Service worker for offline support
│   ├── manifest.json         # PWA web app manifest
│   ├── icon-192.svg          # PWA icon (192×192)
│   └── icon-512.svg          # PWA icon (512×512)
├── build.ts                  # Production build script (Bun.build → dist/)
├── serve.ts                  # Local dev server
├── test/                     # Test fixtures and test helpers
│   └── complex-*.md          # Markdown fixtures used by unit and E2E tests
├── tsconfig.json
└── package.json
```

## Prerequisites

- [Bun](https://bun.sh/) v1.2 or later

## Getting Started

```bash
# Install dependencies
bun install

# Start the local dev server
bun serve.ts
```

Open the URL printed in the terminal (default `http://localhost:3000`). The app shows three columns: Markdown input, HTML preview, and Jira markup output.

## Building for Production

```bash
bun build.ts
```

Outputs minified HTML + JS with source maps to `dist/`. The build also compiles the service worker and copies PWA assets (manifest, icons).

## API

The converter can be used programmatically:

```ts
import { convert } from "./src/convert.ts"

const jira = convert("**bold** and _italic_")
// → "*bold* and _italic_"
```

### Exports

| Export | Description |
|---|---|
| `convert(markdown: string): string` | Convert Markdown to Jira wiki markup |
| `html(markdown: string): string` | Convert Markdown to syntax-highlighted HTML |
| `JiraRenderer` | Custom `marked` renderer that emits Jira markup |
| `verbose()` | Enable debug logging for the renderer |
| `LANGS` | Map of recognized code-block languages |
| `MAX_CODE_LINE` | Threshold (20) above which code blocks collapse |

## Testing

### Unit Tests

```bash
bun test
# or explicitly:
bun test src/convert.test.ts
```

Unit tests validate individual conversion rules (bold, double underscores, escapes, etc.) using `bun:test`. They run entirely offline with no external dependencies.

### End-to-End Tests

The E2E suite posts converted Jira markup as real comments to a Jira Cloud instance, reads back the rendered HTML, asserts the output contains the expected HTML elements, and then deletes the comment. This validates that the converter's output is actually understood by Jira's renderer — not just syntactically correct in isolation.

**How it works:**

```
Markdown input
    │  convert()
    ▼
Jira wiki markup
    │  POST /rest/api/2/issue/{key}/comment
    ▼
Jira Cloud
    │  GET  …/comment/{id}?expand=renderedBody
    ▼
Rendered HTML
    │  assertion
    ▼
Pass / Fail
    │  DELETE …/comment/{id}
    ▼
Cleanup
```

A temporary Jira issue is created in `beforeAll` and deleted in `afterAll`, so no test artifacts are left behind.

**Required environment variables:**

| Variable | Description | Example |
|---|---|---|
| `JIRA_BASE_URL` | Jira Cloud instance URL | `https://yourname.atlassian.net` |
| `JIRA_EMAIL` | Atlassian account email | `you@example.com` |
| `JIRA_API_TOKEN` | API token ([generate here](https://id.atlassian.com/manage-profile/security/api-tokens)) | `ATATT3x…` |
| `JIRA_PROJECT_KEY` | Project key (optional, default `KAN`) | `MKP` |

**Running E2E tests:**

```bash
JIRA_BASE_URL=https://yourname.atlassian.net \
JIRA_EMAIL=you@example.com \
JIRA_API_TOKEN=your-token \
bun test:e2e
```

If the environment variables are not set, the E2E suite is skipped automatically — unit tests still run normally.

**Covered scenarios:**

| Markdown | Assertion |
|---|---|
| `# Heading 1` | Rendered HTML contains `<h1>` |
| `**bold text**` | `<strong>` or `<b>` |
| Fenced code block | `<pre>` |
| Unordered list | `<li>` |
| Ordered list | `<ol>` |
| Link | `<a>` with `href` |
| Blockquote | Quote text present |
| `---` | `<hr>` |
| `~~deleted~~` | `<del>` or `<s>` |
| Full document (`test/text.md`) | Multiple structural tags |


## Contributing

1. Fork the repository and create a feature branch from `main`.
2. Install dependencies with `bun install`.
3. Make your changes in `src/`.
4. Add or update tests in `src/convert.test.ts` (unit) or `src/convert.e2e.test.ts` (E2E).
5. Run unit tests to make sure nothing is broken:
   ```bash
   bun test
   ```
6. If you have Jira credentials, run E2E tests too:
   ```bash
   bun test:e2e
   ```
7. Open a pull request with a clear description of the change.



## Tech Stack

- **Runtime / Toolchain:** [Bun](https://bun.sh/)
- **Markdown Parser:** [marked](https://github.com/markedjs/marked) v17.0.5
- **Syntax Highlighting:** [highlight.js](https://highlightjs.org/) v11
- **Language:** TypeScript (strict mode)

## License

[MIT](LICENSE) — Joel Löf
