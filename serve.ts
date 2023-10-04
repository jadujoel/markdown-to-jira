const BASE_PATH = "./dist";
Bun.serve({
  port: 3002,
  async fetch(req) {
    let filePath = BASE_PATH + new URL(req.url).pathname;
    // also resolve for example localhost:3002 to localhost:3002/index.html
    if (filePath.endsWith("/")) {
      filePath += "index.html";
    }
    const file = Bun.file(filePath);
    return new Response(file);
  },
  error() {
    return new Response(null, { status: 404 });
  },
});
console.log("Server started at http://localhost:3002")
