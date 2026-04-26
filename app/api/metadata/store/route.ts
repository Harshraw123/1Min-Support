import { db } from "@/db/client";
import { metadata } from "@/db/schema";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/getSession";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { business_name, website_url, external_links } = body ?? {};

    const session = await getSession();
    const user_email = session?.email?.trim() || session?.user?.email?.trim();

    if (!user_email || !business_name || !website_url) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const metadataResponse = await db.insert(metadata).values({
      user_email,
      business_name: String(business_name).trim(),
      website_url: String(website_url).trim(),
      external_links: external_links ? String(external_links).trim() : null,
    }).returning();

    // Set a cookie to indicate metadata is configured
    (await cookies()).set("metadata", JSON.stringify({ business_name }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", 
        //HTTP  →  Cookie visible: {"business_name":"MyShop"}  ← hacker देख सकता है
        // HTTPS → Cookie encrypted, कोई नहीं देख सकता to secure https me bhejta hai
        sameSite: "lax",
        path: "/",
      });

//     Converts { business_name: "MyShop" } → '{"business_name":"MyShop"}'
// Cookies only store strings, so objects must be serialized

    return NextResponse.json(metadataResponse,{status:201});
  } catch (error) {
    console.log("[METADATA_STORE_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

