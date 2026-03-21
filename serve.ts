import { build } from "./build";
import home from "./src/index.html";

const E2E_DIR = "e2e-results";

async function buildTestsIndex(): Promise<Response> {
	const glob = new Bun.Glob("*.html");
	const files: string[] = [];
	for await (const file of glob.scan(E2E_DIR)) {
		files.push(file);
	}
	files.sort();
	const rows = files
		.map((f) => {
			const name = f.replace(/\.html$/, "").replace(/-/g, " ");
			return `<tr><td><a href="/tests/${f}">${escapeHtml(name)}</a></td></tr>`;
		})
		.join("\n");
	const page = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<title>E2E Test Results</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; background: #171717; color: #e0e0e0; }
  h1 { border-bottom: 2px solid #0052cc; padding-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; }
  td, th { padding: 8px 12px; border: 1px solid #333; text-align: left; }
  th { background: #222; }
  a { color: #4c9aff; }
  .back { display: inline-block; margin-bottom: 16px; color: #4c9aff; text-decoration: none; }
  .back:hover { text-decoration: underline; }
</style>
</head><body>
<a class="back" href="/">&larr; Back to app</a>
<h1>E2E Test Results</h1>
<p>${files.length} test pages</p>
<table><tr><th>Test</th></tr>${rows}</table>
</body></html>`;
	return new Response(page, {
		headers: { "Content-Type": "text/html; charset=utf-8" },
	});
}

function escapeHtml(s: string): string {
	return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function serve() {
	await build();
	const server = Bun.serve({
		development: true,
		routes: {
			"/": home,
			"/icon-192.svg": new Response(Bun.file("src/icon-192.svg")),
			"/icon-512.svg": new Response(Bun.file("src/icon-512.svg")),
			"/_bun/asset/icon-192.svg": new Response(Bun.file("src/icon-192.svg"), {
				headers: { "Content-Type": "image/svg+xml" },
			}),
			"/_bun/asset/icon-512.svg": new Response(Bun.file("src/icon-512.svg"), {
				headers: { "Content-Type": "image/svg+xml" },
			}),
			"/sw.js": new Response(Bun.file("dist/sw.js"), {
				headers: { "Content-Type": "application/javascript" },
			}),
			"/tests": async () => buildTestsIndex(),
		},
		async fetch(request) {
			const pathname = new URL(request.url).pathname;
			// Serve individual e2e-results files at /tests/<filename>
			if (pathname.startsWith("/tests/")) {
				const file = pathname.slice("/tests/".length);
				// Sanitize: only allow simple filenames (no path traversal)
				if (/^[a-z0-9_-]+\.html$/i.test(file)) {
					const path = `${E2E_DIR}/${file}`;
					const f = Bun.file(path);
					if (await f.exists()) {
						return new Response(f, {
							headers: { "Content-Type": "text/html; charset=utf-8" },
						});
					}
				}
			}
			console.log("404", pathname);
			return new Response(null, { status: 404 });
		},
	});

	console.log(server.url.href);
}

if (import.meta.main) {
	await serve();
}
