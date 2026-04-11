export async function build() {
	// Build the service worker + SVGs (content-hashed output for SVGs, stable name for SW)
	const svgBuild = await Bun.build({
		entrypoints: ["src/sw.ts", "src/icon-192.svg", "src/icon-512.svg"],
		minify: true,
		outdir: "dist",
		target: "browser",
	});

	// Rename the hashed SW output to a stable dist/sw.js so runtime registration works
	const swOutput = svgBuild.outputs.find((o) => o.path.endsWith(".js"));
	if (swOutput) {
		const stablePath = swOutput.path.replace(/\/[^/]+\.js$/, "/sw.js");
		if (swOutput.path !== stablePath) {
			await Bun.write(stablePath, Bun.file(swOutput.path));
		}
	}

	// Map original icon name → hashed filename (relative)
	const svgMap = new Map(
		svgBuild.outputs
			.filter((o) => o.path.endsWith(".svg"))
			.map((o) => {
				const hashed = o.path.split("/").pop();
				if (!hashed) throw new Error("Unexpected empty filename");
				const original = hashed.replace(/-[a-z0-9]+\.svg$/, ".svg");
				return [original, hashed] as const;
			}),
	);

	// Build HTML (content-hashes manifest.json, but not icon refs within it)
	await Bun.build({
		entrypoints: ["src/index.html"],
		minify: true,
		outdir: "dist",
		sourcemap: "external",
		target: "browser",
	});

	// Patch manifest to use hashed SVG filenames (kept relative for GitHub Pages)
	const glob = new Bun.Glob("manifest-*.json");
	for (const file of glob.scanSync("dist")) {
		const manifest = await Bun.file(`dist/${file}`).json();
		let changed = false;
		for (const icon of manifest.icons) {
			const hashed = svgMap.get(icon.src);
			if (hashed) {
				icon.src = hashed;
				changed = true;
			}
		}
		if (changed) {
			await Bun.write(`dist/${file}`, JSON.stringify(manifest));
		}
	}

	// Copy e2e test results into dist/tests/ so they work on GitHub Pages
	await copyTestResults();
}

function escapeHtml(s: string): string {
	return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function copyTestResults() {
	const E2E_DIR = "e2e-results";
	const OUT_DIR = "dist/tests";
	const exists = await Bun.file(`${E2E_DIR}/index.html`).exists()
	if (!exists) return;
	const htmlGlob = new Bun.Glob("*.html");
	const files: string[] = [];
	for await (const file of htmlGlob.scan(E2E_DIR)) {
		if (file !== "index.html") files.push(file);
	}
	if (files.length === 0) return;
	files.sort();

	// Copy each test result HTML
	for (const file of files) {
		await Bun.write(`${OUT_DIR}/${file}`, Bun.file(`${E2E_DIR}/${file}`));
	}

	// Generate a static index page for the tests
	const rows = files
		.map((f) => {
			const name = f.replace(/\.html$/, "").replace(/-/g, " ");
			return `<tr><td><a href="${f}">${escapeHtml(name)}</a></td></tr>`;
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
<a class="back" href="../">&larr; Back to app</a>
<h1>E2E Test Results</h1>
<p>${files.length} test pages</p>
<table><tr><th>Test</th></tr>${rows}</table>
</body></html>`;
	await Bun.write(`${OUT_DIR}/index.html`, page);
}

if (import.meta.main) {
	await build();
}
