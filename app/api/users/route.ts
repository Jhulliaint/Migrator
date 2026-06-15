import { NextRequest, NextResponse } from "next/server";
import { createUser } from "@/lib/data/mutations";
import type { User } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as User;
  const db = await createUser(body);
  return NextResponse.json(db);
}
