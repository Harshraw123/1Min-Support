import { db } from "@/db/client";
import { metadata } from "@/db/schema";
import { getSession } from "@/lib/getSession";
import { eq } from "drizzle-orm";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cookieStore = await cookies();
    const metadataCookie = cookieStore.get("metadata");

    // Cache hit - return from cookie
    if (metadataCookie?.value) {
      return NextResponse.json(
        {
          exists: true,
          source: "cookie",
          data: JSON.parse(metadataCookie.value),
        },
        { status: 200 } // 
      );
    }

    if (!user?.email) {
        return NextResponse.json({ error: "Email not found" }, { status: 400 });
      }
    // Cache miss - check database
    const [record] = await db
      .select()
      .from(metadata)
      .where(eq(metadata.user_email, user.email));

    if (!record) {
      return NextResponse.json({ exists: false }, { status: 404 }); 
    }

    // sett cookie for next time
    cookieStore.set(
      "metadata",
      JSON.stringify({ business_name: record.business_name }), // 
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // ✅ was incomplete
        sameSite: "lax",
        path: "/",
      }
    );

    return NextResponse.json(
      {
        exists: true,
        source: "database",
        data: { business_name: record.business_name },
      },
      { status: 200 }
    );

  } catch (error) {
    console.log("[METADATA_FETCH_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}