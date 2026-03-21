export async function build() {
	// Build the service worker separately (not bundled into the HTML)
	const result = await Bun.build({
		entrypoints: ["src/sw.ts", "src/icon-192.svg", "src/icon-512.svg"],
		minify: true,
		outdir: "dist",
		target: "browser",
	});


	const svgs = result.outputs.slice(3).map((art) => art.path.split("/").at(-1));
  console.log(svgs)

	await Bun.build({
		entrypoints: ["src/index.html"],
		minify: true,
		outdir: "dist",
		sourcemap: "external",
		target: "browser",
	});



	// Copy static PWA assets
	// await Bun.file('dist/icon-192.svg').write(Bun.file('src/icon-192.svg'))
	// await Bun.file('dist/icon-512.svg').write(Bun.file('src/icon-512.svg'))
}

if (import.meta.main) {
	await build();
}
