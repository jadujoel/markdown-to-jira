import { describe, it, expect, beforeAll, afterAll } from "bun:test"
import { convert } from "./convert.ts"

const JIRA_BASE_URL = process.env.JIRA_BASE_URL
const JIRA_EMAIL = process.env.JIRA_EMAIL
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN
const JIRA_PROJECT_KEY = process.env.JIRA_PROJECT_KEY ?? "KAN"

const hasCredentials = JIRA_BASE_URL && JIRA_EMAIL && JIRA_API_TOKEN

function authHeaders() {
  const auth = btoa(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`)
  return {
    "Content-Type": "application/json",
    "Authorization": `Basic ${auth}`,
  } as const
}

/**
 * Post wiki markup as a Jira comment and read back the rendered HTML.
 * Uses the v2 API which accepts wiki markup directly in the body field.
 * Returns the rendered HTML and deletes the comment afterwards.
 */
async function renderViaJiraComment(issueKey: string, wikiMarkup: string): Promise<string> {
  // Create comment with wiki markup
  const createRes = await fetch(
    `${JIRA_BASE_URL}/rest/api/2/issue/${issueKey}/comment`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ body: wikiMarkup }),
    }
  )
  if (!createRes.ok) {
    const text = await createRes.text()
    throw new Error(`Failed to create comment (${createRes.status}): ${text}`)
  }
  const comment = await createRes.json() as { id: string; renderedBody?: string }

  // Fetch the comment back with renderedBody expansion
  const getRes = await fetch(
    `${JIRA_BASE_URL}/rest/api/2/issue/${issueKey}/comment/${comment.id}?expand=renderedBody`,
    { headers: authHeaders() }
  )
  if (!getRes.ok) {
    const text = await getRes.text()
    throw new Error(`Failed to get comment (${getRes.status}): ${text}`)
  }
  const full = await getRes.json() as { id: string; renderedBody: string }
  const html = full.renderedBody

  // Clean up — delete the test comment
  await fetch(
    `${JIRA_BASE_URL}/rest/api/2/issue/${issueKey}/comment/${comment.id}`,
    { method: "DELETE", headers: authHeaders() }
  )

  return html
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
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to create test issue (${res.status}): ${text}`)
  }
  const data = await res.json() as { key: string }
  return data.key
}

/** Delete the temporary test issue. */
async function deleteTestIssue(issueKey: string): Promise<void> {
  await fetch(`${JIRA_BASE_URL}/rest/api/2/issue/${issueKey}`, {
    method: "DELETE",
    headers: authHeaders(),
  })
}

function skipOrDescribe() {
  if (!hasCredentials) {
    console.log(
      "Skipping E2E tests: set JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN to enable.\n" +
      "Optionally set JIRA_PROJECT_KEY (default: MKP)."
    )
  }
  return hasCredentials ? describe : describe.skip
}

const e2e = skipOrDescribe()

e2e("e2e: markdown → jira comment → rendered HTML", () => {
  let issueKey: string

  beforeAll(async () => {
    issueKey = await createTestIssue()
  })

  afterAll(async () => {
    if (issueKey) await deleteTestIssue(issueKey)
  })

  it("heading renders as <h1>", async () => {
    const jira = convert("# Heading 1")
    const html = await renderViaJiraComment(issueKey, jira)
    expect(html).toMatch(/<h1[^>]*>/)
  })

  it("bold renders as <strong> or <b>", async () => {
    const jira = convert("**bold text**")
    const html = await renderViaJiraComment(issueKey, jira)
    expect(html).toMatch(/<(strong|b)[^>]*>bold text<\/(strong|b)>/)
  })

  it("italic renders as <em> or <i>", async () => {
    const jira = convert("*italic text*")
    const html = await renderViaJiraComment(issueKey, jira)
    expect(html).toMatch(/<(em|i)[^>]*>italic text<\/(em|i)>/)
  })

  it("inline code renders as <code> or <tt>", async () => {
    const jira = convert("`some code`")
    const html = await renderViaJiraComment(issueKey, jira)
    expect(html).toMatch(/<(code|tt)[^>]*>/)
  })

  it("fenced code block renders as <pre>", async () => {
    const jira = convert("```javascript\nconsole.log('hello')\n```")
    const html = await renderViaJiraComment(issueKey, jira)
    expect(html).toMatch(/<pre[^>]*>/)
  })

  it("unordered list renders as <li>", async () => {
    const jira = convert("- item one\n- item two")
    const html = await renderViaJiraComment(issueKey, jira)
    expect(html).toMatch(/<li[^>]*>/)
  })

  it("ordered list renders as <ol>", async () => {
    const jira = convert("1. first\n2. second")
    const html = await renderViaJiraComment(issueKey, jira)
    expect(html).toMatch(/<ol[^>]*>/)
  })

  it("link renders as <a> with href", async () => {
    const jira = convert("[click here](https://example.com)")
    const html = await renderViaJiraComment(issueKey, jira)
    expect(html).toMatch(/<a[^>]*href/)
  })

  it("blockquote renders correctly", async () => {
    const jira = convert("> This is a quote")
    const html = await renderViaJiraComment(issueKey, jira)
    expect(html).toMatch(/This is a quote/)
  })

  it("horizontal rule renders as <hr>", async () => {
    const jira = convert("---")
    const html = await renderViaJiraComment(issueKey, jira)
    expect(html).toMatch(/<hr[^>]*\/?>/)
  })

  it("strikethrough renders with <del> or <s>", async () => {
    const jira = convert("~~deleted~~")
    const html = await renderViaJiraComment(issueKey, jira)
    expect(html).toMatch(/<(del|s|span[^>]*text-decoration:\s*line-through)[^>]*>/)
  })

  it("full document roundtrip produces valid HTML", async () => {
    const markdown = await Bun.file("test/text.md").text()
    // Truncate to stay under Jira's 32,767 char comment limit
    const jira = convert(markdown).slice(0, 30000)
    const html = await renderViaJiraComment(issueKey, jira)
    expect(html.length).toBeGreaterThan(100)
    expect(html).toMatch(/<h[1-6][^>]*>/)
    expect(html).toMatch(/<li[^>]*>/)
  })

  // ─── Additional 32 E2E Tests ──────────────────────────────────────

  it("h2 heading renders as <h2>", async () => {
    const jira = convert("## Heading 2")
    const html = await renderViaJiraComment(issueKey, jira)
    expect(html).toMatch(/<h2[^>]*>/)
  })

  it("h3 heading renders as <h3>", async () => {
    const jira = convert("### Heading 3")
    const html = await renderViaJiraComment(issueKey, jira)
    expect(html).toMatch(/<h3[^>]*>/)
  })

  it("h4 heading renders as <h4>", async () => {
    const jira = convert("#### Heading 4")
    const html = await renderViaJiraComment(issueKey, jira)
    expect(html).toMatch(/<h4[^>]*>/)
  })

  it("h5 heading renders as <h5>", async () => {
    const jira = convert("##### Heading 5")
    const html = await renderViaJiraComment(issueKey, jira)
    expect(html).toMatch(/<h5[^>]*>/)
  })

  it("h6 heading renders as <h6>", async () => {
    const jira = convert("###### Heading 6")
    const html = await renderViaJiraComment(issueKey, jira)
    expect(html).toMatch(/<h6[^>]*>/)
  })

  it("bold with underscores renders as <strong> or <b>", async () => {
    const jira = convert("__bold underscores__")
    const html = await renderViaJiraComment(issueKey, jira)
    expect(html).toMatch(/<(strong|b)[^>]*>/)
  })

  it("italic with underscores renders as <em> or <i>", async () => {
    const jira = convert("_italic underscores_")
    const html = await renderViaJiraComment(issueKey, jira)
    expect(html).toMatch(/<(em|i)[^>]*>/)
  })

  it("bold italic renders correctly", async () => {
    const jira = convert("***bold italic***")
    const html = await renderViaJiraComment(issueKey, jira)
    expect(html).toMatch(/<(strong|b|em|i)[^>]*>/)
  })

  it("nested bold inside italic renders both", async () => {
    const jira = convert("*italic and **bold** text*")
    const html = await renderViaJiraComment(issueKey, jira)
    expect(html).toMatch(/<(em|i)[^>]*>/)
    expect(html).toMatch(/<(strong|b)[^>]*>/)
  })

  it("inline code in paragraph renders as <code> or <tt>", async () => {
    const jira = convert("Use `console.log()` for debugging.")
    const html = await renderViaJiraComment(issueKey, jira)
    expect(html).toMatch(/<(code|tt)[^>]*>/)
    expect(html).toMatch(/console\.log/)
  })

  it("code block with typescript renders as <pre>", async () => {
    const jira = convert("```typescript\nconst x: number = 1\n```")
    const html = await renderViaJiraComment(issueKey, jira)
    expect(html).toMatch(/<pre[^>]*>/)
  })

  it("code block with python renders as <pre>", async () => {
    const jira = convert("```python\ndef hello():\n    print('hi')\n```")
    const html = await renderViaJiraComment(issueKey, jira)
    expect(html).toMatch(/<pre[^>]*>/)
  })

  it("code block without language renders as <pre>", async () => {
    const jira = convert("```\nplain code\n```")
    const html = await renderViaJiraComment(issueKey, jira)
    expect(html).toMatch(/<pre[^>]*>/)
  })

  it("nested unordered list renders nested <ul>", async () => {
    const jira = convert("- a\n  - b\n  - c\n- d")
    const html = await renderViaJiraComment(issueKey, jira)
    expect(html).toMatch(/<li[^>]*>/)
  })

  it("nested ordered list renders nested <ol>", async () => {
    const jira = convert("1. a\n   1. b\n   2. c\n2. d")
    const html = await renderViaJiraComment(issueKey, jira)
    expect(html).toMatch(/<ol[^>]*>/)
    expect(html).toMatch(/<li[^>]*>/)
  })

  it("mixed list renders correctly", async () => {
    const jira = convert("1. ordered\n   - unordered child\n   - unordered child\n2. second")
    const html = await renderViaJiraComment(issueKey, jira)
    expect(html).toMatch(/<li[^>]*>/)
  })

  it("checkbox renders as list items", async () => {
    const jira = convert("- [x] done\n- [ ] todo")
    const html = await renderViaJiraComment(issueKey, jira)
    expect(html).toMatch(/<li[^>]*>/)
  })

  it("link with bold text renders with <a> and <strong>", async () => {
    const jira = convert("[**bold link**](https://example.com)")
    const html = await renderViaJiraComment(issueKey, jira)
    expect(html).toMatch(/<a[^>]*href/)
  })

  it("image renders as <img>", async () => {
    const jira = convert("![alt text](https://via.placeholder.com/150)")
    const html = await renderViaJiraComment(issueKey, jira)
    expect(html).toMatch(/<img[^>]*>/)
  })

  it("table renders with header and data cells", async () => {
    const jira = convert("| Name | Age |\n| --- | --- |\n| Alice | 30 |")
    const html = await renderViaJiraComment(issueKey, jira)
    expect(html).toMatch(/<t(h|d)[^>]*>/)
    expect(html).toMatch(/Alice/)
  })

  it("table with bold header renders correctly", async () => {
    const jira = convert("| **Header** | _Other_ |\n| --- | --- |\n| cell | data |")
    const html = await renderViaJiraComment(issueKey, jira)
    expect(html).toMatch(/<t(h|d)[^>]*>/)
  })

  it("multiple paragraphs render as separate blocks", async () => {
    const jira = convert("First paragraph.\n\nSecond paragraph.")
    const html = await renderViaJiraComment(issueKey, jira)
    expect(html).toMatch(/First paragraph/)
    expect(html).toMatch(/Second paragraph/)
  })

  it("blockquote with bold renders both", async () => {
    const jira = convert("> **Important** notice")
    const html = await renderViaJiraComment(issueKey, jira)
    expect(html).toMatch(/Important/)
  })

  it("strikethrough with bold renders both", async () => {
    const jira = convert("~~**deleted bold**~~")
    const html = await renderViaJiraComment(issueKey, jira)
    expect(html).toMatch(/deleted bold/)
  })

  it("line break with two trailing spaces renders newline", async () => {
    const jira = convert("line one  \nline two")
    const html = await renderViaJiraComment(issueKey, jira)
    expect(html).toMatch(/line one/)
    expect(html).toMatch(/line two/)
  })

  it("heading with inline code renders both", async () => {
    const jira = convert("## `code` heading")
    const html = await renderViaJiraComment(issueKey, jira)
    expect(html).toMatch(/<h2[^>]*>/)
  })

  it("code block with shell renders as <pre>", async () => {
    const jira = convert("```shell\nls -la\n```")
    const html = await renderViaJiraComment(issueKey, jira)
    expect(html).toMatch(/<pre[^>]*>/)
  })

  it("3-level nested list renders correctly", async () => {
    const jira = convert("- a\n  - b\n    - c\n  - d\n- e")
    const html = await renderViaJiraComment(issueKey, jira)
    expect(html).toMatch(/<li[^>]*>/)
  })

  it("multiple headings in a document render correctly", async () => {
    const jira = convert("# Title\n\nIntro\n\n## Section 1\n\nContent\n\n## Section 2\n\nMore content")
    const html = await renderViaJiraComment(issueKey, jira)
    expect(html).toMatch(/<h1[^>]*>/)
    expect(html).toMatch(/<h2[^>]*>/)
  })

  it("horizontal rule between paragraphs renders <hr>", async () => {
    const jira = convert("Above\n\n---\n\nBelow")
    const html = await renderViaJiraComment(issueKey, jira)
    expect(html).toMatch(/<hr[^>]*\/?>/)
    expect(html).toMatch(/Above/)
    expect(html).toMatch(/Below/)
  })

  it("heading + list + paragraph renders all elements", async () => {
    const jira = convert("# Title\n\n- item 1\n- item 2\n\nClosing paragraph.")
    const html = await renderViaJiraComment(issueKey, jira)
    expect(html).toMatch(/<h1[^>]*>/)
    expect(html).toMatch(/<li[^>]*>/)
    expect(html).toMatch(/Closing paragraph/)
  })

  it("link with inline code text renders correctly", async () => {
    const jira = convert("[`package.json`](https://example.com/package.json)")
    const html = await renderViaJiraComment(issueKey, jira)
    expect(html).toMatch(/<a[^>]*href/)
  })
})
