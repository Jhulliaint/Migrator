import { NextRequest, NextResponse } from "next/server";
import { upsertTask, deleteTask } from "@/lib/data/mutations";
import type { Task } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  return NextResponse.json(upsertTask((await req.json()) as Task));
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  return NextResponse.json(deleteTask(params.id));
}
