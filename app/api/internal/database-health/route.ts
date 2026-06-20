import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDatabase } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const database = getDatabase();
  if (!database) {
    return NextResponse.json({ status: "disconnected" });
  }

  try {
    await database.execute(sql`select 1`);
    return NextResponse.json({ status: "connected" });
  } catch {
    return NextResponse.json({ status: "disconnected" }, { status: 503 });
  }
}
