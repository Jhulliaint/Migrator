import { NextRequest, NextResponse } from "next/server";
import { updateMilestone } from "@/lib/data/mutations";
import type { Milestone } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const patch = (await req.json()) as Partial<Milestone>;
  return NextResponse.json(await updateMilestone(params.id, patch));
}
