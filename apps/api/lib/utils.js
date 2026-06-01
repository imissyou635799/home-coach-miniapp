import { randomUUID } from "node:crypto";

export function id(prefix) {
  return `${prefix}_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
}

export function nowISO() {
  return new Date().toISOString();
}

export function addMonths(dateText, months) {
  const date = dateText ? new Date(dateText) : new Date();
  const base = Number.isNaN(date.getTime()) || date < new Date() ? new Date() : date;
  base.setMonth(base.getMonth() + months);
  return base.toISOString().slice(0, 10);
}

export function ok(data = null, message = "ok") {
  return { code: 0, message, data };
}

export function fail(message, code = 400) {
  const error = new Error(message);
  error.statusCode = code;
  return error;
}

export function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 2 * 1024 * 1024) {
        reject(fail("请求内容太大", 413));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(fail("JSON 格式错误", 400));
      }
    });
  });
}

export function send(res, payload, statusCode = 200) {
  const text = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS"
  });
  res.end(text);
}

export function readToken(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    return "";
  }
  return header.slice(7);
}

export function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}
