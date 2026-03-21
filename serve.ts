import { build } from "./build";
import home from "./src/index.html";

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
		},
		fetch(request) {
			console.log("404", new URL(request.url).pathname);
			return new Response(null, { status: 404 });
		},
	});

	console.log(server.url.href);
}

if (import.meta.main) {
	await serve();
}
