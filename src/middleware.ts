import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const NO_STORE = "no-store, no-cache, must-revalidate, max-age=0";

function isNoStoreDocument(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/lab" ||
    pathname.startsWith("/lab/") ||
    pathname.startsWith("/lab-dashboard") ||
    pathname.startsWith("/lab-inference") ||
    pathname.startsWith("/lab-router") ||
    pathname === "/site-chrome.css" ||
    pathname === "/site-chrome.js"
  );
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const res = NextResponse.next();
  if (isNoStoreDocument(pathname)) {
    res.headers.set("Cache-Control", NO_STORE);
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");
    res.headers.set("Surrogate-Control", "no-store");
  }
  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff2?)$).*)",
  ],
};
