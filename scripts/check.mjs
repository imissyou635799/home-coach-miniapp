import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function walk(dir, files = []) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".git", "data"].includes(item.name)) continue;
    const full = path.join(dir, item.name);
    if (item.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

function checkJson(file) {
  JSON.parse(fs.readFileSync(file, "utf8"));
}

function checkHtml(file) {
  const html = fs.readFileSync(file, "utf8");
  const voids = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
  const stack = [];
  const re = /<\/?([a-zA-Z][\w:-]*)(?:\s[^<>]*)?>/g;
  let match;
  while ((match = re.exec(html))) {
    const raw = match[0];
    const tag = match[1].toLowerCase();
    if (raw.startsWith("<!") || voids.has(tag)) continue;
    if (raw.startsWith("</")) {
      const last = stack.pop();
      if (last !== tag) throw new Error(`${file}: expected </${last}> but found ${raw}`);
    } else if (!raw.endsWith("/>")) {
      stack.push(tag);
    }
  }
  if (stack.length) throw new Error(`${file}: unclosed ${stack.join(",")}`);
}

function nodeCheck(file) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--check", file], { cwd: root, stdio: "pipe" });
    let err = "";
    child.stderr.on("data", (chunk) => {
      err += chunk;
    });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(err || `${file} syntax check failed`));
    });
  });
}

const smokePort = 3199;

function request(pathname, options = {}) {
  const body = options.body ? JSON.stringify(options.body) : "";
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "localhost",
        port: smokePort,
        path: pathname,
        method: options.method || "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: options.token ? `Bearer ${options.token}` : "",
          "Content-Length": Buffer.byteLength(body)
        }
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => {
          raw += chunk;
        });
        res.on("end", () => {
          const payload = JSON.parse(raw || "{}");
          if (res.statusCode >= 200 && res.statusCode < 300 && payload.code === 0) resolve(payload.data);
          else reject(new Error(payload.message || `HTTP ${res.statusCode}`));
        });
      }
    );
    req.on("error", reject);
    req.end(body);
  });
}

async function smoke() {
  const server = spawn(process.execPath, ["apps/api/server.js"], {
    cwd: root,
    env: { ...process.env, API_PORT: String(smokePort), DATA_FILE: "./data/check.runtime.json" },
    stdio: "pipe"
  });
  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("API server start timeout")), 5000);
      server.stdout.on("data", (chunk) => {
        if (chunk.toString().includes("API server running")) {
          clearTimeout(timeout);
          resolve();
        }
      });
      server.stderr.on("data", (chunk) => reject(new Error(chunk.toString())));
    });
    await request("/api/health");
    const coachLogin = await request("/api/auth/login", {
      method: "POST",
      body: { role: "coach", phone: "13800000001", nickname: "张教练" }
    });
    await request("/api/coach/dashboard", { token: coachLogin.token });
    await request("/api/membership/orders", { method: "POST", token: coachLogin.token });
    const parentLogin = await request("/api/auth/login", {
      method: "POST",
      body: { role: "parent", phone: "13800000002", nickname: "李明轩妈妈" }
    });
    await request("/api/parent/home", { token: parentLogin.token });
    await request("/api/parent/courses", { token: parentLogin.token });
    const adminLogin = await request("/api/auth/login", {
      method: "POST",
      body: { role: "admin", username: "admin", password: "admin123" }
    });
    await request("/api/admin/stats", { token: adminLogin.token });
  } finally {
    server.kill();
  }
}

const files = walk(root);
for (const file of files.filter((item) => item.endsWith(".json"))) {
  checkJson(file);
}
for (const file of files.filter((item) => item.endsWith(".html"))) {
  checkHtml(file);
}
for (const file of files.filter((item) => item.endsWith(".js") || item.endsWith(".mjs"))) {
  await nodeCheck(file);
}
await smoke();
console.log("CHECK_OK");
