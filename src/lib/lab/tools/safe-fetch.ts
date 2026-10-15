import { lookup } from "dns/promises";
import { isIP } from "net";

function isPrivateV4(ip: string) {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateIp(ip: string) {
  if (isIP(ip) === 4) return isPrivateV4(ip);
  const v = ip.toLowerCase();
  if (v.startsWith("::ffff:")) return isPrivateV4(v.slice(7));
  return v === "::" || v === "::1" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80");
}

async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Invalid URL.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Only http and https URLs are allowed.");
  if (url.username || url.password) throw new Error("URLs with credentials are not allowed.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("Private hosts are not allowed.");
  }
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true, verbatim: true });
  if (addrs.length === 0 || addrs.some((a) => isPrivateIp(a.address))) {
    throw new Error("Private hosts are not allowed.");
  }
  return url;
}

/** fetch() for user-supplied URLs: public hosts only, redirects re-checked, size and time capped. */
export async function safeFetch(
  raw: string,
  init: RequestInit & { maxBytes?: number; timeoutMs?: number } = {}
): Promise<{ status: number; contentType: string; body: string; finalUrl: string }> {
  const { maxBytes = 2_000_000, timeoutMs = 12_000, ...rest } = init;
  let target = raw;
  for (let hop = 0; hop < 4; hop++) {
    const url = await assertPublicUrl(target);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...rest, redirect: "manual", signal: ctrl.signal });
      if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
        target = new URL(res.headers.get("location")!, url).toString();
        continue;
      }
      const reader = res.body?.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > maxBytes) {
            await reader.cancel();
            break;
          }
          chunks.push(value);
        }
      }
      return {
        status: res.status,
        contentType: res.headers.get("content-type") || "",
        body: Buffer.concat(chunks).toString("utf8"),
        finalUrl: url.toString(),
      };
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error("Too many redirects.");
}
