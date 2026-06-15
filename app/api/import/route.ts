import { NextRequest, NextResponse } from "next/server";
import { importUsers } from "@/lib/data/mutations";
import type { User } from "@/lib/types";

export const dynamic = "force-dynamic";

// Reçoit des utilisateurs déjà mappés (le mapping/parse a lieu côté client).
export async function POST(req: NextRequest) {
  const { users, mode } = (await req.json()) as { users: User[]; mode: "merge" | "replace" };
  return NextResponse.json(importUsers(users, mode ?? "merge"));
}
