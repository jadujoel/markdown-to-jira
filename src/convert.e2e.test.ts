import { describe, it, expect, beforeAll } from "bun:test"
import { convert } from "./convert.ts"

const JIRA_BASE_URL = process.env.JIRA_BASE_URL
const JIRA_EMAIL = process.env.JIRA_EMAIL
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN

const hasCredentials = JIRA_BASE_URL && JIRA_EMAIL && JIRA_API_TOKEN

/**
 * Render Jira/Confluence wiki markup to HTML via the Confluence REST API.
 * Requires a free Atlassian Cloud instance with Confluence enabled.
 */
async function renderViaJira(wikiMarkup: string): Promise<string> {
  const url = `${JIRA_BASE_URL}/wiki/rest/api/contentbody/convert/view`
  const auth = btoa(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`)

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${auth}`,
    },
    body: JSON.stringify({
      value: wikiMarkup,
      representation: "wiki",
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Jira render API returned ${response.status}: ${text}`)
  }

  const data = await response.json() as { value: string }
  return data.value
}

function skipOrDescribe() {
  if (!hasCredentials) {
    console.log(
      "Skipping E2E tests: set JIRA_BASE_URL, JIRA_EMAIL, and JIRA_API_TOKEN to enable."
    )
  }
  return hasCredentials ? describe : describe.skip
}

const e2e = skipOrDescribe()

e2e("e2e: markdown → jira → rendered HTML", () => {
  it("heading renders as <h1>", async () => {
    const jira = convert("# Heading 1")
    const html = await renderViaJira(jira)
    expect(html).toMatch(/<h1[^>]*>/)
  })

  it("bold renders as <strong> or <b>", async () => {
    const jira = convert("**bold text**")
    const html = await renderViaJira(jira)
    expect(html).toMatch(/<(strong|b)[^>]*>bold text<\/(strong|b)>/)
  })

  it("italic renders as <em> or <i>", async () => {
    const jira = convert("*italic text*")
    const html = await renderViaJira(jira)
    expect(html).toMatch(/<(em|i)[^>]*>italic text<\/(em|i)>/)
  })

  it("inline code renders as <code>", async () => {
    const jira = convert("`some code`")
    const html = await renderViaJira(jira)
    expect(html).toMatch(/<code[^>]*>/)
  })

  it("fenced code block renders as <pre>", async () => {
    const jira = convert("```javascript\nconsole.log('hello')\n```")
    const html = await renderViaJira(jira)
    expect(html).toMatch(/<pre[^>]*>/)
  })

  it("unordered list renders as <li>", async () => {
    const jira = convert("- item one\n- item two")
    const html = await renderViaJira(jira)
    expect(html).toMatch(/<li[^>]*>/)
  })

  it("ordered list renders as <ol>", async () => {
    const jira = convert("1. first\n2. second")
    const html = await renderViaJira(jira)
    expect(html).toMatch(/<ol[^>]*>/)
  })

  it("link renders as <a> with href", async () => {
    const jira = convert("[click here](https://example.com)")
    const html = await renderViaJira(jira)
    expect(html).toMatch(/<a[^>]*href="https:\/\/example\.com"[^>]*>/)
  })

  it("blockquote renders correctly", async () => {
    const jira = convert("> This is a quote")
    const html = await renderViaJira(jira)
    expect(html).toMatch(/This is a quote/)
  })

  it("horizontal rule renders as <hr>", async () => {
    const jira = convert("---")
    const html = await renderViaJira(jira)
    expect(html).toMatch(/<hr[^>]*\/?>/)
  })

  it("strikethrough renders with <del> or <s>", async () => {
    const jira = convert("~~deleted~~")
    const html = await renderViaJira(jira)
    expect(html).toMatch(/<(del|s|span[^>]*text-decoration:\s*line-through)[^>]*>/)
  })

  it("full document roundtrip produces valid HTML", async () => {
    const markdown = await Bun.file("test/text.md").text()
    const jira = convert(markdown)
    const html = await renderViaJira(jira)
    // The full doc should produce a non-trivial HTML response
    expect(html.length).toBeGreaterThan(100)
    // Should contain at least headings and list items
    expect(html).toMatch(/<h1[^>]*>/)
    expect(html).toMatch(/<li[^>]*>/)
  })
})
