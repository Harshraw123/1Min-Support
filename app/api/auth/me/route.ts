import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/getSession";

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    
    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }
    
    return NextResponse.json({ user });
  } catch (error) {
    console.error("Auth check error:", error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
