import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { convert } from "./convert.ts";

const JIRA_BASE_URL = process.env.JIRA_BASE_URL?.replace(/\/$/, "");
const JIRA_PAT = process.env.JIRA_PAT;
const JIRA_DC_PROJECT_KEY = process.env.JIRA_DC_PROJECT_KEY ?? "KAN";

const hasCredentials = Boolean(JIRA_BASE_URL && JIRA_PAT);

function authHeaders() {
	return {
		"Content-Type": "application/json",
		Authorization: `Bearer ${JIRA_PAT}`,
	} as const;
}

async function createTestIssue(): Promise<string> {
	const response = await fetch(`${JIRA_BASE_URL}/rest/api/2/issue`, {
		method: "POST",
		headers: authHeaders(),
		body: JSON.stringify({
			fields: {
				project: { key: JIRA_DC_PROJECT_KEY },
				summary: "[E2E Test] loose list continuation validation",
				issuetype: { name: "Task" },
			},
		}),
	});
	if (!response.ok) {
		throw new Error(
			`Failed to create Jira DC issue (${response.status}): ${await response.text()}`,
		);
	}
	return ((await response.json()) as { key: string }).key;
}

async function deleteTestIssue(issueKey: string): Promise<void> {
	await fetch(`${JIRA_BASE_URL}/rest/api/2/issue/${issueKey}`, {
		method: "DELETE",
		headers: authHeaders(),
	});
}

async function renderViaJiraComment(
	issueKey: string,
	wikiMarkup: string,
): Promise<string> {
	const createResponse = await fetch(
		`${JIRA_BASE_URL}/rest/api/2/issue/${issueKey}/comment`,
		{
			method: "POST",
			headers: authHeaders(),
			body: JSON.stringify({ body: wikiMarkup }),
		},
	);
	if (!createResponse.ok) {
		throw new Error(
			`Failed to create Jira DC comment (${createResponse.status}): ${await createResponse.text()}`,
		);
	}

	const comment = (await createResponse.json()) as { id: string };
	try {
		const getResponse = await fetch(
			`${JIRA_BASE_URL}/rest/api/2/issue/${issueKey}/comment/${comment.id}?expand=renderedBody`,
			{ headers: authHeaders() },
		);
		if (!getResponse.ok) {
			throw new Error(
				`Failed to read Jira DC comment (${getResponse.status}): ${await getResponse.text()}`,
			);
		}
		return ((await getResponse.json()) as { renderedBody: string })
			.renderedBody;
	} finally {
		await fetch(
			`${JIRA_BASE_URL}/rest/api/2/issue/${issueKey}/comment/${comment.id}`,
			{ method: "DELETE", headers: authHeaders() },
		);
	}
}

if (!hasCredentials) {
	console.log(
		"Skipping Jira DC E2E tests: set JIRA_BASE_URL and JIRA_PAT to enable.\n" +
			"Optionally set JIRA_DC_PROJECT_KEY (default: KAN).",
	);
}

const dcE2e = hasCredentials ? describe : describe.skip;

dcE2e("e2e: Jira DC loose list continuation", () => {
	let issueKey: string;

	beforeAll(async () => {
		issueKey = await createTestIssue();
	});

	afterAll(async () => {
		if (issueKey) await deleteTestIssue(issueKey);
	});

	it("keeps the second ordered item in the same ordered list", async () => {
		const markdown =
			"1. Step one\n   * sub bullet\n\n   Continuation sentence.\n2. Step two";
		const html = await renderViaJiraComment(issueKey, convert(markdown));

		expect(html).toContain("Step one");
		expect(html).toContain("Continuation sentence.");
		expect(html).toContain("Step two");
		// This fixture has no nested ordered list. A second <ol> means Jira DC
		// closed and restarted the top-level list after the loose item.
		expect(html.match(/<ol\b/gi) ?? []).toHaveLength(1);
		const orderedList = html.slice(
			html.search(/<ol\b/i),
			html.toLowerCase().lastIndexOf("</ol>") + "</ol>".length,
		);
		expect(orderedList).toContain("Step one");
		expect(orderedList).toContain("Step two");
		expect(orderedList.match(/<li\b/gi) ?? []).toHaveLength(3);
	});
});
