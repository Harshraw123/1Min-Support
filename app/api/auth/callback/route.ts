/**
 * File: app/api/auth/callback/route.ts
 * Match with Becodemy Video Version
 */

import { db } from "@/db/client";
import { User as UserTable } from "@/db/schema"; // Video uses 'user' table from schema
import { scalekit } from "@/lib/scalekit"; // Import matches video screenshot
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const error_description = searchParams.get("error_description");

  // 1. Handle potential errors from ScaleKit
  if (error) {
    return NextResponse.json({ error, error_description }, { status: 401 });
  }

  const cookieStore = await cookies();
  const savedState = cookieStore.get("sk_state")?.value;

  // 2. State Validation (Security)
  if (!code || !state || state !== savedState) {
    return NextResponse.json({ error: "No code provided or state mismatch" }, { status: 400 });
  }

  try {
    const redirectUri = process.env.SCALEKIT_REDIRECT_URI!;

    // 3. Authenticate with ScaleKit
    const authResult = await scalekit.authenticateWithCode(
      code,
      redirectUri,
    );

    const { user, idToken } = authResult;

    // 4. Validate Token to get Claims (Organization ID)
    const claims = await scalekit.validateToken(idToken);
    const organizationId = 
      (claims as any).organization_id || 
      (claims as any).oid || 
      null;

    // 5. Database Logic: Check if user exists
    const existingUser = await db
      .select()
      .from(UserTable)
      .where(eq(UserTable.email, user.email));

    // 6. If user doesn't exist, insert them
    if (existingUser.length === 0) {
      await db.insert(UserTable).values({
        name: user?.name || 'Anonymous',
        email: user.email,
        organization_id: organizationId as string,
        image: (user as any).picture || "", 
      });
    }

    // 7. SUCCESS REDIRECT: Setup Response
    const response = NextResponse.redirect(new URL("/dashboard", req.url));

    const userSession={
        name:user.name,
        email:user.email,
        organization_id:organizationId
    }

    // 8. Set Session Cookie _>help in retrive user information quickly without hitting db again
    response.cookies.set("user_session", JSON.stringify(userSession), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
      sameSite: "lax",
    });

    // 9. Cleanup
    response.cookies.delete("sk_state");

    return response;

  } catch (error) {
    console.error("Callback Error:", error);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}