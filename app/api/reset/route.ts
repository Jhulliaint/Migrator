import { NextResponse } from "next/server";
import { resetDb } from "@/lib/data/store";

export const dynamic = "force-dynamic";

// Réinitialise les données de démonstration depuis le seed.
export async function POST() {
  return NextResponse.json(resetDb());
}
