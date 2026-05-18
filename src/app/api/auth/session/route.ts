import { getSession } from "@/lib/auth/getSession";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getSession();
    
    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error("[SESSION_ERROR]", error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
