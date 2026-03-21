import { describe, it, expect, beforeAll, afterAll } from "bun:test"
import { convert } from "./convert.ts"

const JIRA_BASE_URL = process.env.JIRA_BASE_URL
const JIRA_EMAIL = process.env.JIRA_EMAIL
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN
const JIRA_PROJECT_KEY = process.env.JIRA_PROJECT_KEY ?? "MKP"

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

  it("inline code renders as <code>", async () => {
    const jira = convert("`some code`")
    const html = await renderViaJiraComment(issueKey, jira)
    expect(html).toMatch(/<code[^>]*>/)
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
    const jira = convert(markdown)
    const html = await renderViaJiraComment(issueKey, jira)
    expect(html.length).toBeGreaterThan(100)
    expect(html).toMatch(/<h1[^>]*>/)
    expect(html).toMatch(/<li[^>]*>/)
  })
})
