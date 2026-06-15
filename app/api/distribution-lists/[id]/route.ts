import { NextRequest, NextResponse } from "next/server";
import { upsertDistributionList, deleteDistributionList } from "@/lib/data/mutations";
import type { DistributionList } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  return NextResponse.json(await upsertDistributionList((await req.json()) as DistributionList));
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  return NextResponse.json(await deleteDistributionList(params.id));
}
