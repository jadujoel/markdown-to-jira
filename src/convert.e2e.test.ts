import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { convert, correctMarkdown } from "./convert.ts";

const JIRA_BASE_URL = process.env.JIRA_BASE_URL;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
const JIRA_PROJECT_KEY = process.env.JIRA_PROJECT_KEY ?? "KAN";

const hasCredentials = JIRA_BASE_URL && JIRA_EMAIL && JIRA_API_TOKEN;

const RESULTS_DIR = "e2e-results";

interface TestResult {
	name: string;
	markdown: string;
	jira: string;
	html: string;
}

const testResults: TestResult[] = [];

function slugify(name: string): string {
	return name
		.replace(/[^a-z0-9]+/gi, "-")
		.replace(/^-|-$/g, "")
		.toLowerCase();
}

async function saveResult(
	name: string,
	markdown: string,
	jira: string,
	html: string,
) {
	testResults.push({ name, markdown, jira, html });
	await mkdir(RESULTS_DIR, { recursive: true });
	const slug = slugify(name);
	const page = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<title>${name}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; }
  h1 { border-bottom: 2px solid #0052cc; padding-bottom: 8px; color: #172b4d; }
  .section { margin: 20px 0; padding: 16px; border: 1px solid #dfe1e6; border-radius: 4px; }
  .section h2 { margin-top: 0; font-size: 14px; color: #6b778c; text-transform: uppercase; }
  pre { background: #f4f5f7; padding: 12px; border-radius: 4px; overflow-x: auto; white-space: pre-wrap; }
  .rendered { background: #fff; }
</style>
</head><body>
<h1>${name}</h1>
<div class="section"><h2>Markdown Input</h2><pre>${escapeHtml(markdown)}</pre></div>
<div class="section"><h2>Jira Wiki Markup</h2><pre>${escapeHtml(jira)}</pre></div>
<div class="section rendered"><h2>Jira Rendered HTML</h2>${html}</div>
</body></html>`;
	await Bun.write(join(RESULTS_DIR, `${slug}.html`), page);
}

function escapeHtml(s: string): string {
	return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function saveIndex() {
	const rows = testResults
		.map((r) => {
			const slug = slugify(r.name);
			return `<tr><td><a href="${slug}.html">${escapeHtml(r.name)}</a></td></tr>`;
		})
		.join("\n");
	const page = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<title>E2E Test Results</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; }
  table { width: 100%; border-collapse: collapse; }
  td, th { padding: 8px 12px; border: 1px solid #dfe1e6; text-align: left; }
  th { background: #f4f5f7; }
  a { color: #0052cc; }
</style>
</head><body>
<h1>E2E Test Results</h1>
<p>${testResults.length} tests rendered</p>
<table><tr><th>Test</th></tr>${rows}</table>
</body></html>`;
	await Bun.write(join(RESULTS_DIR, "index.html"), page);
}

function authHeaders() {
	const auth = btoa(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`);
	return {
		"Content-Type": "application/json",
		Authorization: `Basic ${auth}`,
	} as const;
}

/**
 * Post wiki markup as a Jira comment and read back the rendered HTML.
 * Uses the v2 API which accepts wiki markup directly in the body field.
 * Returns the rendered HTML and deletes the comment afterwards.
 */
async function renderViaJiraComment(
	issueKey: string,
	wikiMarkup: string,
): Promise<string> {
	// Create comment with wiki markup
	const createRes = await fetch(
		`${JIRA_BASE_URL}/rest/api/2/issue/${issueKey}/comment`,
		{
			method: "POST",
			headers: authHeaders(),
			body: JSON.stringify({ body: wikiMarkup }),
		},
	);
	if (!createRes.ok) {
		const text = await createRes.text();
		throw new Error(`Failed to create comment (${createRes.status}): ${text}`);
	}
	const comment = (await createRes.json()) as {
		id: string;
		renderedBody?: string;
	};

	// Fetch the comment back with renderedBody expansion
	const getRes = await fetch(
		`${JIRA_BASE_URL}/rest/api/2/issue/${issueKey}/comment/${comment.id}?expand=renderedBody`,
		{ headers: authHeaders() },
	);
	if (!getRes.ok) {
		const text = await getRes.text();
		throw new Error(`Failed to get comment (${getRes.status}): ${text}`);
	}
	const full = (await getRes.json()) as { id: string; renderedBody: string };
	const html = full.renderedBody;

	// Clean up — delete the test comment
	await fetch(
		`${JIRA_BASE_URL}/rest/api/2/issue/${issueKey}/comment/${comment.id}`,
		{ method: "DELETE", headers: authHeaders() },
	);

	return html;
}

/** Create a temporary issue for E2E testing. */
async function createTestIssue(): Promise<string> {
	const res = await fetch(`${JIRA_BASE_URL}/rest/api/2/issue`, {
		method: "POST",
		headers: authHeaders(),
		body: JSON.stringify({
			fields: {
				project: { key: JIRA_PROJECT_KEY },
				summary: "[E2E Test] markdown-to-jira render validation",
				issuetype: { name: "Task" },
			},
		}),
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Failed to create test issue (${res.status}): ${text}`);
	}
	const data = (await res.json()) as { key: string };
	return data.key;
}

/** Delete the temporary test issue. */
async function deleteTestIssue(issueKey: string): Promise<void> {
	await fetch(`${JIRA_BASE_URL}/rest/api/2/issue/${issueKey}`, {
		method: "DELETE",
		headers: authHeaders(),
	});
}

function skipOrDescribe() {
	if (!hasCredentials) {
		console.log(
			"Skipping E2E tests: set JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN to enable.\n" +
				"Optionally set JIRA_PROJECT_KEY (default: MKP).",
		);
	}
	return hasCredentials ? describe : describe.skip;
}

const e2e = skipOrDescribe();

e2e("e2e: markdown → jira comment → rendered HTML", () => {
	let issueKey: string;
	let currentTestName = "";

	/** Convert markdown → jira, render via Jira API, save result, return HTML */
	async function render(markdown: string): Promise<string> {
		const jira = convert(markdown);
		const html = await renderViaJiraComment(issueKey, jira);
		await saveResult(currentTestName, markdown, jira, html);
		return html;
	}

	beforeAll(async () => {
		issueKey = await createTestIssue();
	});

	afterAll(async () => {
		if (issueKey) await deleteTestIssue(issueKey);
		if (testResults.length > 0) await saveIndex();
	});

	it("heading renders as <h1>", async () => {
		currentTestName = "heading renders as h1";
		const html = await render("# Heading 1");
		expect(html).toMatch(/<h1[^>]*>/);
	});

	it("bold renders as <strong> or <b>", async () => {
		currentTestName = "bold renders as strong or b";
		const html = await render("**bold text**");
		expect(html).toMatch(/<(strong|b)[^>]*>bold text<\/(strong|b)>/);
	});

	it("italic renders as <em> or <i>", async () => {
		currentTestName = "italic renders as em or i";
		const html = await render("*italic text*");
		expect(html).toMatch(/<(em|i)[^>]*>italic text<\/(em|i)>/);
	});

	it("inline code renders as <code> or <tt>", async () => {
		currentTestName = "inline code renders as code or tt";
		const html = await render("`some code`");
		expect(html).toMatch(/<(code|tt)[^>]*>/);
	});

	it("fenced code block renders as <pre>", async () => {
		currentTestName = "fenced code block renders as pre";
		const html = await render("```javascript\nconsole.log('hello')\n```");
		expect(html).toMatch(/<pre[^>]*>/);
	});

	it("unordered list renders as <li>", async () => {
		currentTestName = "unordered list renders as li";
		const html = await render("- item one\n- item two");
		expect(html).toMatch(/<li[^>]*>/);
	});

	it("ordered list renders as <ol>", async () => {
		currentTestName = "ordered list renders as ol";
		const html = await render("1. first\n2. second");
		expect(html).toMatch(/<ol[^>]*>/);
	});

	it("link renders as <a> with href", async () => {
		currentTestName = "link renders as a with href";
		const html = await render("[click here](https://example.com)");
		expect(html).toMatch(/<a[^>]*href/);
	});

	it("blockquote renders correctly", async () => {
		currentTestName = "blockquote renders correctly";
		const html = await render("> This is a quote");
		expect(html).toMatch(/This is a quote/);
	});

	it("horizontal rule renders as <hr>", async () => {
		currentTestName = "horizontal rule renders as hr";
		const html = await render("---");
		expect(html).toMatch(/<hr[^>]*\/?>/);
	});

	it("strikethrough renders with <del> or <s>", async () => {
		currentTestName = "strikethrough renders with del or s";
		const html = await render("~~deleted~~");
		expect(html).toMatch(
			/<(del|s|span[^>]*text-decoration:\s*line-through)[^>]*>/,
		);
	});

	it("full document roundtrip produces valid HTML", async () => {
		currentTestName = "full document roundtrip";
		const markdown = [
			"# Project Overview",
			"",
			"This is a **full document** test with _multiple_ elements.",
			"",
			"## Features",
			"",
			"- First item with `inline code`",
			"- Second item with **bold text**",
			"  - Nested item",
			"  - Another nested item",
			"- Third item",
			"",
			"### Code Example",
			"",
			"```typescript",
			"function hello(name: string): string {",
			"  return `Hello, $\\{name}!`;",
			"}",
			"```",
			"",
			"| Column A | Column B |",
			"| --- | --- |",
			"| Cell 1 | Cell 2 |",
			"| Cell 3 | Cell 4 |",
			"",
			"> A blockquote with **important** info.",
			"",
			"---",
			"",
			"1. Ordered item one",
			"2. Ordered item two",
			"   1. Sub-item",
			"",
			"Final paragraph with [a link](https://example.com) and ~~strikethrough~~.",
		].join("\n");
		const html = await render(markdown);
		expect(html.length).toBeGreaterThan(100);
		expect(html).toMatch(/<h[1-6][^>]*>/);
		expect(html).toMatch(/<li[^>]*>/);
	});

	// ─── Additional E2E Tests ───────────────────────────────────────

	it("h2 heading renders as <h2>", async () => {
		currentTestName = "h2 heading";
		const html = await render("## Heading 2");
		expect(html).toMatch(/<h2[^>]*>/);
	});

	it("h3 heading renders as <h3>", async () => {
		currentTestName = "h3 heading";
		const html = await render("### Heading 3");
		expect(html).toMatch(/<h3[^>]*>/);
	});

	it("h4 heading renders as <h4>", async () => {
		currentTestName = "h4 heading";
		const html = await render("#### Heading 4");
		expect(html).toMatch(/<h4[^>]*>/);
	});

	it("h5 heading renders as <h5>", async () => {
		currentTestName = "h5 heading";
		const html = await render("##### Heading 5");
		expect(html).toMatch(/<h5[^>]*>/);
	});

	it("h6 heading renders as <h6>", async () => {
		currentTestName = "h6 heading";
		const html = await render("###### Heading 6");
		expect(html).toMatch(/<h6[^>]*>/);
	});

	it("bold with underscores renders as <strong> or <b>", async () => {
		currentTestName = "bold with underscores";
		const html = await render("__bold underscores__");
		expect(html).toMatch(/<(strong|b)[^>]*>/);
	});

	it("italic with underscores renders as <em> or <i>", async () => {
		currentTestName = "italic with underscores";
		const html = await render("_italic underscores_");
		expect(html).toMatch(/<(em|i)[^>]*>/);
	});

	it("bold italic renders correctly", async () => {
		currentTestName = "bold italic";
		const html = await render("***bold italic***");
		expect(html).toMatch(/<(strong|b|em|i)[^>]*>/);
	});

	it("nested bold inside italic renders both", async () => {
		currentTestName = "nested bold inside italic";
		const html = await render("*italic and **bold** text*");
		expect(html).toMatch(/<(em|i)[^>]*>/);
		expect(html).toMatch(/<(strong|b)[^>]*>/);
	});

	it("inline code in paragraph renders as <code> or <tt>", async () => {
		currentTestName = "inline code in paragraph";
		const html = await render("Use `console.log()` for debugging.");
		expect(html).toMatch(/<(code|tt)[^>]*>/);
		expect(html).toMatch(/console\.log/);
	});

	it("code block with typescript renders as <pre>", async () => {
		currentTestName = "code block typescript";
		const html = await render("```typescript\nconst x: number = 1\n```");
		expect(html).toMatch(/<pre[^>]*>/);
	});

	it("code block with python renders as <pre>", async () => {
		currentTestName = "code block python";
		const html = await render("```python\ndef hello():\n    print('hi')\n```");
		expect(html).toMatch(/<pre[^>]*>/);
	});

	it("code block without language renders as <pre>", async () => {
		currentTestName = "code block no language";
		const html = await render("```\nplain code\n```");
		expect(html).toMatch(/<pre[^>]*>/);
	});

	it("nested unordered list renders nested <ul>", async () => {
		currentTestName = "nested unordered list";
		const html = await render("- a\n  - b\n  - c\n- d");
		expect(html).toMatch(/<li[^>]*>/);
	});

	it("nested ordered list renders nested <ol>", async () => {
		currentTestName = "nested ordered list";
		const html = await render("1. a\n   1. b\n   2. c\n2. d");
		expect(html).toMatch(/<ol[^>]*>/);
		expect(html).toMatch(/<li[^>]*>/);
	});

	it("mixed list renders correctly", async () => {
		currentTestName = "mixed list";
		const html = await render(
			"1. ordered\n   - unordered child\n   - unordered child\n2. second",
		);
		expect(html).toMatch(/<li[^>]*>/);
	});

	it("checkbox renders as list items", async () => {
		currentTestName = "checkbox list";
		const html = await render("- [x] done\n- [ ] todo");
		expect(html).toMatch(/<li[^>]*>/);
	});

	it("link with bold text renders with <a> and <strong>", async () => {
		currentTestName = "link with bold text";
		const html = await render("[**bold link**](https://example.com)");
		expect(html).toMatch(/<a[^>]*href/);
	});

	it("image renders as <img>", async () => {
		currentTestName = "image renders as img";
		const html = await render("![alt text](https://via.placeholder.com/150)");
		expect(html).toMatch(/<img[^>]*>/);
	});

	it("table renders with header and data cells", async () => {
		currentTestName = "table with header and data";
		const html = await render("| Name | Age |\n| --- | --- |\n| Alice | 30 |");
		expect(html).toMatch(/<t(h|d)[^>]*>/);
		expect(html).toMatch(/Alice/);
	});

	it("table with bold header renders correctly", async () => {
		currentTestName = "table with bold header";
		const html = await render(
			"| **Header** | _Other_ |\n| --- | --- |\n| cell | data |",
		);
		expect(html).toMatch(/<t(h|d)[^>]*>/);
	});

	it("multiple paragraphs render as separate blocks", async () => {
		currentTestName = "multiple paragraphs";
		const html = await render("First paragraph.\n\nSecond paragraph.");
		expect(html).toMatch(/First paragraph/);
		expect(html).toMatch(/Second paragraph/);
	});

	it("blockquote with bold renders both", async () => {
		currentTestName = "blockquote with bold";
		const html = await render("> **Important** notice");
		expect(html).toMatch(/Important/);
	});

	it("strikethrough with bold renders both", async () => {
		currentTestName = "strikethrough with bold";
		const html = await render("~~**deleted bold**~~");
		expect(html).toMatch(/deleted bold/);
	});

	it("line break with two trailing spaces renders newline", async () => {
		currentTestName = "line break trailing spaces";
		const html = await render("line one  \nline two");
		expect(html).toMatch(/line one/);
		expect(html).toMatch(/line two/);
	});

	it("heading with inline code renders both", async () => {
		currentTestName = "heading with inline code";
		const html = await render("## `code` heading");
		expect(html).toMatch(/<h2[^>]*>/);
	});

	it("code block with shell renders as <pre>", async () => {
		currentTestName = "code block shell";
		const html = await render("```shell\nls -la\n```");
		expect(html).toMatch(/<pre[^>]*>/);
	});

	it("3-level nested list renders correctly", async () => {
		currentTestName = "3-level nested list";
		const html = await render("- a\n  - b\n    - c\n  - d\n- e");
		expect(html).toMatch(/<li[^>]*>/);
	});

	it("multiple headings in a document render correctly", async () => {
		currentTestName = "multiple headings";
		const html = await render(
			"# Title\n\nIntro\n\n## Section 1\n\nContent\n\n## Section 2\n\nMore content",
		);
		expect(html).toMatch(/<h1[^>]*>/);
		expect(html).toMatch(/<h2[^>]*>/);
	});

	it("horizontal rule between paragraphs renders <hr>", async () => {
		currentTestName = "hr between paragraphs";
		const html = await render("Above\n\n---\n\nBelow");
		expect(html).toMatch(/<hr[^>]*\/?>/);
		expect(html).toMatch(/Above/);
		expect(html).toMatch(/Below/);
	});

	it("heading + list + paragraph renders all elements", async () => {
		currentTestName = "heading list paragraph combo";
		const html = await render(
			"# Title\n\n- item 1\n- item 2\n\nClosing paragraph.",
		);
		expect(html).toMatch(/<h1[^>]*>/);
		expect(html).toMatch(/<li[^>]*>/);
		expect(html).toMatch(/Closing paragraph/);
	});

	it("link with inline code text renders correctly", async () => {
		currentTestName = "link with inline code";
		const html = await render(
			"[`package.json`](https://example.com/package.json)",
		);
		expect(html).toMatch(/<a[^>]*href/);
	});

	// ─── Complex Markdown E2E Tests ─────────────────────────────────

	it("bash comments in code blocks are preserved", async () => {
		currentTestName = "bash comments in code blocks";
		const md =
			"```bash\n# Install dependencies\nbun install\n# Start the server\nbun serve\n```";
		const html = await render(md);
		expect(html).toMatch(/<pre[^>]*>/);
		expect(html).toMatch(/Install dependencies/);
		expect(html).toMatch(/Start the server/);
		expect(html).toMatch(/bun install/);
	});

	it("ordered list with embedded code block renders list markers and code", async () => {
		currentTestName = "ordered list with code block";
		const md = [
			"1. First step",
			"2. Run this:",
			"   ```bash",
			"   bun test",
			"   ```",
			"3. Final step",
		].join("\n");
		const html = await render(md);
		expect(html).toMatch(/<ol[^>]*>/);
		expect(html).toMatch(/<li[^>]*>/);
		expect(html).toMatch(/First step/);
		expect(html).toMatch(/Final step/);
		expect(html).toMatch(/<pre[^>]*>/);
	});

	it("multiple code blocks with different languages render", async () => {
		currentTestName = "multiple code blocks different langs";
		const md = [
			"## TypeScript",
			"",
			"```typescript",
			"const x: number = 1;",
			"```",
			"",
			"## Python",
			"",
			"```python",
			"x = 1",
			"```",
		].join("\n");
		const html = await render(md);
		expect(html).toMatch(/<h2[^>]*>/);
		expect(html).toMatch(/<pre[^>]*>/);
	});

	it("table with inline code in cells renders correctly", async () => {
		currentTestName = "table with inline code cells";
		const md = [
			"| Export | Description |",
			"| --- | --- |",
			"| `convert(md)` | Converts markdown |",
			"| `html(md)` | Converts to HTML |",
		].join("\n");
		const html = await render(md);
		expect(html).toMatch(/<t(h|d)[^>]*>/);
		expect(html).toMatch(/convert/);
		expect(html).toMatch(/Description/);
	});

	it("blockquote with bold and italic renders all formatting", async () => {
		currentTestName = "blockquote bold italic";
		const md = "> **Important**: This is a _critical_ note with `code`.";
		const html = await render(md);
		expect(html).toMatch(/Important/);
		expect(html).toMatch(/critical/);
	});

	it("nested lists with formatting render correctly", async () => {
		currentTestName = "nested list with formatting";
		const md = [
			"- **Bold item** with `code`",
			"  - _Italic child_",
			"  - [Link child](https://example.com)",
			"- ~~Deleted item~~",
		].join("\n");
		const html = await render(md);
		expect(html).toMatch(/<li[^>]*>/);
		expect(html).toMatch(/<(strong|b)[^>]*>/);
	});

	it("complex README-like document renders all structural elements", async () => {
		currentTestName = "complex README document";
		const md = [
			"# My Project",
			"",
			"A **bold** description with `inline code` and a [link](https://example.com).",
			"",
			"## Getting Started",
			"",
			"```bash",
			"# Install dependencies",
			"npm install",
			"",
			"# Start the dev server",
			"npm run dev",
			"```",
			"",
			"## Features",
			"",
			"- **Feature one** with `code`",
			"- _Feature two_ with [docs](https://example.com)",
			"  - Nested detail",
			"- ~~Deprecated feature~~",
			"",
			"| Feature | Status |",
			"| --- | --- |",
			"| Auth | Done |",
			"| API | WIP |",
			"",
			"> **Note:** This is an important notice.",
			"",
			"---",
			"",
			"1. Clone the repo",
			"2. Install deps:",
			"   ```bash",
			"   npm install",
			"   ```",
			"3. Open a PR",
			"",
			"### API Reference",
			"",
			"```typescript",
			"function convert(md: string): string {",
			"  return transformed;",
			"}",
			"```",
			"",
			"Final paragraph with **bold**, *italic*, ~~strike~~, and `code`.",
		].join("\n");
		const html = await render(md);
		// Structural elements
		expect(html).toMatch(/<h1[^>]*>/);
		expect(html).toMatch(/<h2[^>]*>/);
		expect(html).toMatch(/<h3[^>]*>/);
		expect(html).toMatch(/<pre[^>]*>/);
		expect(html).toMatch(/<li[^>]*>/);
		expect(html).toMatch(/<t(h|d)[^>]*>/);
		expect(html).toMatch(/<hr[^>]*\/?>/);
		expect(html).toMatch(/<a[^>]*href/);
		// Content
		expect(html).toMatch(/My Project/);
		expect(html).toMatch(/Install dependencies/);
		expect(html).toMatch(/Feature one/);
		expect(html).toMatch(/Auth/);
		expect(html).toMatch(/important notice/);
		expect(html).toMatch(/Clone the repo/);
		expect(html).toMatch(/Open a PR/);
		expect(html).toMatch(/convert/);
	});

	it("heading with all inline formatting types", async () => {
		currentTestName = "heading with mixed formatting";
		const html = await render("## **Bold** and _italic_ and `code` heading");
		expect(html).toMatch(/<h2[^>]*>/);
		expect(html).toMatch(/Bold/);
		expect(html).toMatch(/italic/);
	});

	it("deeply nested ordered and unordered lists", async () => {
		currentTestName = "deeply nested mixed lists";
		const md = [
			"1. Top level",
			"   - Bullet child",
			"     - Deep bullet",
			"   - Another bullet",
			"2. Second ordered",
			"   1. Nested ordered",
			"   2. Another nested",
		].join("\n");
		const html = await render(md);
		expect(html).toMatch(/<li[^>]*>/);
		expect(html).toMatch(/Top level/);
		expect(html).toMatch(/Deep bullet/);
		expect(html).toMatch(/Second ordered/);
	});

	it("code block with long content collapses", async () => {
		currentTestName = "long code block collapses";
		const lines = Array.from({ length: 25 }, (_, i) => `line ${i + 1}`);
		const md = "```\n" + lines.join("\n") + "\n```";
		const html = await render(md);
		expect(html).toMatch(/<pre[^>]*>/);
		expect(html).toMatch(/line 1/);
	});

	it("paragraph with all inline styles renders correctly", async () => {
		currentTestName = "paragraph all inline styles";
		const md =
			"This has **bold**, *italic*, ~~strike~~, `code`, and [link](https://example.com).";
		const html = await render(md);
		expect(html).toMatch(/<(strong|b)[^>]*>/);
		expect(html).toMatch(/<(em|i)[^>]*>/);
		expect(html).toMatch(
			/<(del|s|span[^>]*text-decoration:\s*line-through)[^>]*>/,
		);
		expect(html).toMatch(/<(code|tt)[^>]*>/);
		expect(html).toMatch(/<a[^>]*href/);
	});

	// ─── Complex Fixture E2E Tests ──────────────────────────────────

	it("complex-document.md converts and renders all structural elements", async () => {
		currentTestName = "complex document fixture";
		const md = await readFile("test/complex-document.md", "utf8");
		const html = await render(md);
		expect(html.length).toBeGreaterThan(500);
		expect(html).toMatch(/<h1[^>]*>/);
		expect(html).toMatch(/<h2[^>]*>/);
		expect(html).toMatch(/<h3[^>]*>/);
		expect(html).toMatch(/<pre[^>]*>/);
		expect(html).toMatch(/<li[^>]*>/);
		expect(html).toMatch(/<t(h|d)[^>]*>/);
		expect(html).toMatch(/<hr[^>]*\/?>/);
		expect(html).toMatch(/<a[^>]*href/);
	});

	it("complex-release-notes.md converts and renders all structural elements", async () => {
		currentTestName = "complex release notes fixture";
		const md = await readFile("test/complex-release-notes.md", "utf8");
		const html = await render(md);
		expect(html.length).toBeGreaterThan(500);
		expect(html).toMatch(/<h1[^>]*>/);
		expect(html).toMatch(/<h2[^>]*>/);
		expect(html).toMatch(/<h3[^>]*>/);
		expect(html).toMatch(/<pre[^>]*>/);
		expect(html).toMatch(/<li[^>]*>/);
		expect(html).toMatch(/<t(h|d)[^>]*>/);
	});

	it("error-laden.md converts without crashing", async () => {
		currentTestName = "error-laden fixture raw";
		const md = await readFile("test/error-laden.md", "utf8");
		const html = await render(md);
		expect(html.length).toBeGreaterThan(100);
	});

	it("error-laden.md with correction converts and produces better output", async () => {
		currentTestName = "error-laden fixture corrected";
		const md = await readFile("test/error-laden.md", "utf8");
		const corrected = correctMarkdown(md);
		const jira = convert(corrected);
		const html = await renderViaJiraComment(issueKey, jira);
		await saveResult(currentTestName, corrected, jira, html);
		expect(html.length).toBeGreaterThan(100);
		// Corrected version should produce headings
		expect(html).toMatch(/<h[1-6][^>]*>/);
	});

	it("missing-newlines.md converts without crashing", async () => {
		currentTestName = "missing-newlines fixture raw";
		const md = await readFile("test/missing-newlines.md", "utf8");
		const html = await render(md);
		expect(html.length).toBeGreaterThan(50);
	});

	it("missing-newlines.md with correction produces improved output", async () => {
		currentTestName = "missing-newlines fixture corrected";
		const md = await readFile("test/missing-newlines.md", "utf8");
		const corrected = correctMarkdown(md);
		const jira = convert(corrected);
		const html = await renderViaJiraComment(issueKey, jira);
		await saveResult(currentTestName, corrected, jira, html);
		expect(html.length).toBeGreaterThan(50);
		expect(html).toMatch(/<h[1-6][^>]*>/);
	});

	it("project README.md converts and renders all structural elements", async () => {
		currentTestName = "project README";
		const md = await readFile("README.md", "utf8");
		const html = await render(md);
		expect(html.length).toBeGreaterThan(500);
		expect(html).toMatch(/<h1[^>]*>/);
		expect(html).toMatch(/<h2[^>]*>/);
		expect(html).toMatch(/<h3[^>]*>/);
		expect(html).toMatch(/<pre[^>]*>/);
		expect(html).toMatch(/<li[^>]*>/);
		expect(html).toMatch(/<t(h|d)[^>]*>/);
		expect(html).toMatch(/<a[^>]*href/);
	});
});
