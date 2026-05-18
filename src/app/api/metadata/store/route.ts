import { db } from "@/db/client";
import { metadata } from "@/db/schema";
import { getSession } from "@/lib/auth/getSession";
import { scalekit } from "@/lib/auth/scalekit";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { business_name, website_url, external_links } = body ?? {};

    const session = await getSession();
    const user_email = session?.email?.trim() || session?.user?.email?.trim();

    if (!user_email || !business_name || !website_url) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const companyName = String(business_name).trim();

    const normalizedExternalLinks =
      external_links === null || external_links === undefined
        ? null
        : typeof external_links === "string"
          ? external_links.trim()
            ? (() => {
                try {
                  return JSON.parse(external_links);
                } catch {
                  return [external_links.trim()];
                }
              })()
            : null
          : external_links;

    const payload = {
      business_name: companyName,
      website_url: String(website_url).trim(),
      external_links: normalizedExternalLinks,
    };

    const organizationId =
      typeof session?.organization_id === "string" && session.organization_id.trim()
        ? session.organization_id.trim()
        : null;

    const [existing] = await db
      .select({ id: metadata.id })
      .from(metadata)
      .where(eq(metadata.user_email, user_email));

    const metadataResponse = existing
      ? await db
          .update(metadata)
          .set(payload)
          .where(eq(metadata.user_email, user_email))
          .returning()
      : await db
          .insert(metadata)
          .values({
            user_email,
            ...payload,
          })
          .returning();

    if (organizationId && companyName) {
      try {
        console.log("Creating org with name:", companyName);
        const updatedOrg = await scalekit.organization.updateOrganization(organizationId, {
          displayName: companyName,
        });
        console.log(
          "Scalekit response name:",
          updatedOrg?.organization?.displayName ?? null
        );
      } catch (scalekitError) {
        console.error("SCALEKIT_ORG_NAME_UPDATE_ERROR", {
          organizationId,
          companyName,
          scalekitError,
        });
      }
    }

    // Set a cookie to indicate metadata is configured
    (await cookies()).set("metadata", JSON.stringify({ business_name: companyName }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", 
        //HTTP  →  Cookie visible: {"business_name":"MyShop"}  ← hacker देख सकता है
        // HTTPS → Cookie encrypted, कोई नहीं देख सकता to secure https me bhejta hai
        sameSite: "lax",
        path: "/",
      });

//     Converts { business_name: "MyShop" } → '{"business_name":"MyShop"}'
// Cookies only store strings, so objects must be serialized

    return NextResponse.json(metadataResponse, { status: existing ? 200 : 201 });
  } catch (error) {
    console.log("[METADATA_STORE_ERROR]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

