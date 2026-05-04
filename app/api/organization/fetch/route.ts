import { db } from "@/db/client";
import { metadata } from "@/db/schema";
import { getSession } from "@/lib/getSession";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await getSession();
    const email = user?.email?.trim() || user?.user?.email?.trim();

    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [metadataRecord] = await db
      .select()
      .from(metadata)
      .where(eq(metadata.user_email, email));

    const organization = {
      id: user.organization_id ?? null,
      name: metadataRecord?.business_name ?? null,
      website_url: metadataRecord?.website_url ?? null,
      external_links: metadataRecord?.external_links ?? null,
    };

    return NextResponse.json({ organization });
  } catch (error) {
    console.error("API_ORGANIZATION_GET_ERROR", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
