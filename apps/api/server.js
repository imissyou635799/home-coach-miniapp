import http from "node:http";
import { route } from "./lib/router.js";
import { send, ok } from "./lib/utils.js";
import { store } from "./lib/store.js";

if (process.argv.includes("--seed-only")) {
  store.reset();
  console.log("Seed data has been reset.");
  process.exit(0);
}

const port = Number(process.env.API_PORT || 3100);

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    send(res, ok());
    return;
  }
  try {
    const payload = await route(req);
    send(res, payload);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    send(res, { code: statusCode, message: error.message || "服务器错误", data: null }, statusCode);
  }
});

server.listen(port, () => {
  store.load();
  console.log(`API server running at http://localhost:${port}`);
});
