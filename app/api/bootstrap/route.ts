import { NextResponse } from "next/server";
import { getDb } from "@/lib/data/store";

// État local : pas de cache, lecture fraîche à chaque appel.
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getDb());
}
