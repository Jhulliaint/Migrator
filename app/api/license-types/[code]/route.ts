import { NextRequest, NextResponse } from "next/server";
import { updateLicenseType } from "@/lib/data/mutations";
import type { LicenseType } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { code: string } }) {
  const patch = (await req.json()) as Partial<LicenseType>;
  try {
    return NextResponse.json(updateLicenseType(params.code, patch));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 404 });
  }
}
