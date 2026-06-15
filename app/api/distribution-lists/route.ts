import { NextRequest, NextResponse } from "next/server";
import { upsertDistributionList } from "@/lib/data/mutations";
import type { DistributionList } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return NextResponse.json(await upsertDistributionList((await req.json()) as DistributionList));
}
