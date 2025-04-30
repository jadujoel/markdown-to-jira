import home from "./src/index.html"

const server = Bun.serve({
  routes: {
    "/": home
  }
})

console.log(server.url.href)
