import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import fallback from "@/lib/lab/aa-providers-fallback.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PUBLIC_FILE = path.join(process.cwd(), "public/lab-leaderboard/providers-data.json");

export async function GET() {
  try {
    const raw = await fs.readFile(PUBLIC_FILE, "utf8");
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json(fallback);
  }
}
