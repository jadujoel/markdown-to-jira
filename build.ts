export async function build() {
	// Build the service worker + SVGs (content-hashed output)
	const svgBuild = await Bun.build({
		entrypoints: ["src/sw.ts", "src/icon-192.svg", "src/icon-512.svg"],
		minify: true,
		outdir: "dist",
		target: "browser",
	});

	// Map original icon name → hashed filename (relative)
	const svgMap = new Map(
		svgBuild.outputs
			.filter((o) => o.path.endsWith(".svg"))
			.map((o) => {
				const hashed = o.path.split("/").pop()!;
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
}

if (import.meta.main) {
	await build();
}
