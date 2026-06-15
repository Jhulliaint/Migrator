import { NextRequest, NextResponse } from "next/server";
import { updateSettings } from "@/lib/data/mutations";
import type { Settings } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  const patch = (await req.json()) as Partial<Settings>;
  return NextResponse.json(updateSettings(patch));
}
