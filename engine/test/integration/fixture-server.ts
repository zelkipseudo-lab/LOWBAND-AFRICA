import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

const LARGE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">${"<rect x=\"0\" y=\"0\" width=\"10\" height=\"10\" fill=\"#1d4ed8\"/>".repeat(2500)}</svg>`;

const INDEX_HTML = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>LowBand fixture</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <h1>Fixture LowBand Africa</h1>
  <p>Page de test locale pour le moteur d'analyse.</p>
  <img src="/image.svg" alt="fixture" width="320" height="240">
  <script src="/app.js"></script>
</body>
</html>`;

const STYLE_CSS = `body { font-family: Arial, sans-serif; margin: 2rem; background: #f8fafc; color: #0f172a; }
h1 { font-size: 2rem; }
img { border: 1px solid #cbd5e1; }`;

const APP_JS = `document.body.dataset.ready = "true";`;

export interface FixtureServer {
  baseUrl: string;
  close: () => Promise<void>;
}

export async function startFixtureServer(): Promise<FixtureServer> {
  const server: Server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    if (url.pathname === "/") {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(INDEX_HTML);
      return;
    }
    if (url.pathname === "/style.css") {
      response.writeHead(200, { "content-type": "text/css; charset=utf-8" });
      response.end(STYLE_CSS);
      return;
    }
    if (url.pathname === "/app.js") {
      response.writeHead(200, { "content-type": "text/javascript; charset=utf-8" });
      response.end(APP_JS);
      return;
    }
    if (url.pathname === "/image.svg") {
      response.writeHead(200, { "content-type": "image/svg+xml" });
      response.end(LARGE_SVG);
      return;
    }
    if (url.pathname === "/missing.png") {
      response.writeHead(404, { "content-type": "text/plain" });
      response.end("missing");
      return;
    }
    if (url.pathname === "/redirect") {
      response.writeHead(302, { location: "/final" });
      response.end();
      return;
    }
    if (url.pathname === "/final") {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end("<!doctype html><html><body><h1>Final</h1></body></html>");
      return;
    }
    if (url.pathname === "/slow") {
      setTimeout(() => {
        if (!response.writableEnded) {
          response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
          response.end("<!doctype html><html><body><h1>Slow</h1></body></html>");
        }
      }, 5000);
      return;
    }
    response.writeHead(404, { "content-type": "text/plain" });
    response.end("not found");
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address() as AddressInfo;
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: async () => {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}
