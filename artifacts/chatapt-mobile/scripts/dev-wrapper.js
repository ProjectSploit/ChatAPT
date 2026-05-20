#!/usr/bin/env node
/**
 * Dev wrapper for Expo Metro bundler.
 * - Starts an HTTP server on PORT (default 18433) with /status → 200
 * - Proxies all other traffic to Metro running on METRO_PORT (PORT+1)
 * - Spawns `expo start` in CI mode on METRO_PORT
 */

const http = require("http");
const net = require("net");
const { spawn } = require("child_process");

const PORT = parseInt(process.env.PORT || "18433", 10);
const METRO_PORT = PORT + 1;

// ── Env for Expo child process ──────────────────────────────────────────────
const expoEnv = {
  ...process.env,
  PORT: String(METRO_PORT),
};

// ── Start Metro bundler on METRO_PORT ───────────────────────────────────────
const args = [
  "exec",
  "expo",
  "start",
  "--web",
  "--localhost",
  "--port",
  String(METRO_PORT),
];

const expo = spawn("pnpm", args, {
  env: expoEnv,
  stdio: "inherit",
  cwd: process.cwd(),
});

expo.on("exit", (code) => {
  console.log(`[wrapper] Expo exited with code ${code}`);
  process.exit(code ?? 1);
});

// ── Minimal TCP proxy helper ────────────────────────────────────────────────
function proxyRequest(req, res) {
  const options = {
    hostname: "127.0.0.1",
    port: METRO_PORT,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `localhost:${METRO_PORT}` },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on("error", (err) => {
    if (!res.headersSent) {
      res.writeHead(502);
      res.end(`Proxy error: ${err.message}`);
    }
  });

  req.pipe(proxyReq, { end: true });
}

// ── HTTP server on PORT ─────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  if (req.url === "/status" || req.url === "/status/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }
  proxyRequest(req, res);
});

// Also handle HTTP CONNECT (WebSocket upgrade) by tunnelling the TCP socket
server.on("upgrade", (req, clientSocket, head) => {
  const target = net.connect(METRO_PORT, "127.0.0.1", () => {
    clientSocket.write(
      "HTTP/1.1 101 Switching Protocols\r\n" +
        "Upgrade: websocket\r\n" +
        "Connection: Upgrade\r\n\r\n"
    );
    target.write(head);
    target.pipe(clientSocket);
    clientSocket.pipe(target);
  });
  target.on("error", () => clientSocket.destroy());
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[wrapper] Proxy listening on :${PORT} → Metro on :${METRO_PORT}`);
});

// ── Graceful shutdown ───────────────────────────────────────────────────────
function shutdown() {
  expo.kill("SIGTERM");
  server.close();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
