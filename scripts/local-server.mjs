import http from "node:http";
import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const publicRoot = path.resolve(fileURLToPath(new URL("../public/", import.meta.url)));
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml", ".png": "image/png" };

export function createLocalServer() {
  return http.createServer(async (request, response) => {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    if (!["GET", "HEAD"].includes(request.method)) {
      response.writeHead(405, { Allow: "GET, HEAD" });
      response.end("Method not allowed");
      return;
    }
    try {
      const pathname = decodeURIComponent((request.url || "/").split("?")[0]);
      if (pathname.includes("\\") || pathname.split("/").some(part => part === ".." || part.startsWith("."))) {
        response.writeHead(403); response.end("Forbidden"); return;
      }
      const target = pathname === "/" ? "/planner/index.html" : pathname === "/favicon.ico" ? "/planner/favicon.svg" : pathname;
      const filename = path.resolve(publicRoot, "." + target);
      if (!filename.startsWith(publicRoot + path.sep)) {
        response.writeHead(403); response.end("Forbidden"); return;
      }
      const resolved = await realpath(filename);
      if (!resolved.startsWith(publicRoot + path.sep) || !(await stat(resolved)).isFile()) {
        response.writeHead(404); response.end("Not found"); return;
      }
      const data = await readFile(resolved);
      response.writeHead(200, { "Content-Type": types[path.extname(resolved)] || "application/octet-stream", "Content-Length": data.length });
      response.end(request.method === "HEAD" ? undefined : data);
    } catch (error) {
      response.writeHead(error instanceof URIError ? 400 : error.code === "ENOENT" || error.code === "ENOTDIR" ? 404 : 500);
      response.end("Unable to serve this file");
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const port = args.length === 0 ? 4173 : args.length === 2 && args[0] === "--port" ? Number(args[1]) : NaN;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error("Usage: node scripts/local-server.mjs [--port 4173]");
    process.exitCode = 1;
  } else {
    const server = createLocalServer();
    server.on("error", error => {
      console.error(error.code === "EADDRINUSE"
        ? "Port " + port + " is in use. Close the other server, or run: npm start -- --port 4174"
        : error.message);
      process.exitCode = 1;
    });
    server.listen(port, "127.0.0.1", () => {
      console.log("\nToDo1: http://127.0.0.1:" + port + "\nKeep this terminal open. Press Ctrl+C to stop.\nData stays in this browser; export backups regularly.\n");
    });
  }
}
