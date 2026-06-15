import { NextRequest, NextResponse } from "next/server";
import { upsertRisk } from "@/lib/data/mutations";
import type { Risk } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return NextResponse.json(upsertRisk((await req.json()) as Risk));
}
