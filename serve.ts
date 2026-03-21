import home from "./src/index.html"
import { build } from "./build";

export async function serve() {
  await build()
  const server = Bun.serve({
    routes: {
      "/": home,
      "/icon-192.svg": new Response(Bun.file("src/icon-192.svg")),
      "/icon-512.svg": new Response(Bun.file("src/icon-512.svg")),
      "/sw.js": new Response(Bun.file("dist/sw.js"), {
        headers: { "Content-Type": "application/javascript" },
      }),
    },
    fetch(request, server) {
      const url = request.url
      console.log("RUL", url)
      return new Response(null, { status: 404 });
    },
  })

  console.log(server.url.href)
}
