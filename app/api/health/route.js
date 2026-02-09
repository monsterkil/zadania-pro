import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const hasUrl = !!(process.env.POSTGRES_URL || process.env.DATABASE_URL);
  if (!hasUrl) {
    return NextResponse.json({
      ok: false,
      error: "Brak POSTGRES_URL lub DATABASE_URL",
      env: "missing",
    }, { status: 503 });
  }

  try {
    const result = await sql`SELECT 1 as ping`;
    if (!result || result.length === 0) {
      return NextResponse.json({
        ok: false,
        error: "Baza nie odpowiedziała",
        env: "set",
      }, { status: 503 });
    }
    return NextResponse.json({ ok: true, db: "connected" });
  } catch (err) {
    const msg = err?.message || String(err);
    console.error("[health] DB error:", msg);
    const tablesHint = msg.includes("relation") || msg.includes("does not exist")
      ? " Prawdopodobnie brak tabel — uruchom lokalnie: npm run db:push (z POSTGRES_URL w .env.local)."
      : "";
    return NextResponse.json({
      ok: false,
      error: msg + tablesHint,
      env: "set",
    }, { status: 503 });
  }
}
