import { NextRequest, NextResponse } from "next/server";
import { upsertRisk, deleteRisk } from "@/lib/data/mutations";
import type { Risk } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  return NextResponse.json(await upsertRisk((await req.json()) as Risk));
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  return NextResponse.json(await deleteRisk(params.id));
}
