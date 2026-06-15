import { NextRequest, NextResponse } from "next/server";
import { updateUser, deleteUser } from "@/lib/data/mutations";
import type { User } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const patch = (await req.json()) as Partial<User>;
  try {
    const db = updateUser(params.id, patch);
    return NextResponse.json(db);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = deleteUser(params.id);
  return NextResponse.json(db);
}
