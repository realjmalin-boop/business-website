import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const host = "127.0.0.1";
const port = Number(process.env.PORT) || 4173;

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

function sendFile(response, filePath, statusCode = 200) {
  response.writeHead(statusCode, {
    "Content-Type": mimeTypes[extname(filePath).toLowerCase()] || "application/octet-stream",
    "Cache-Control": "no-cache",
    "X-Content-Type-Options": "nosniff"
  });
  createReadStream(filePath).pipe(response);
}

const server = createServer((request, response) => {
  let pathname;

  try {
    pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host || host}`).pathname);
  } catch {
    return sendFile(response, join(root, "404.html"), 404);
  }

  const relativePath = normalize(pathname).replace(/^([/\\])+/, "");
  const requestedPath = resolve(root, relativePath);

  if (requestedPath !== resolve(root) && !requestedPath.startsWith(`${resolve(root)}${sep}`)) {
    return sendFile(response, join(root, "404.html"), 404);
  }

  let filePath = requestedPath;
  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = join(filePath, "index.html");
  }

  if (existsSync(filePath) && statSync(filePath).isFile()) {
    return sendFile(response, filePath);
  }

  return sendFile(response, join(root, "404.html"), 404);
});

server.listen(port, host, () => {
  console.log(`Northline Studio is available at http://${host}:${port}`);
});
