import { NextRequest, NextResponse } from "next/server";
import { upsertTask } from "@/lib/data/mutations";
import type { Task } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return NextResponse.json(upsertTask((await req.json()) as Task));
}
