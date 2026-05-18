/**
 * File: app/api/auth/route.ts
 * Purpose: Authentication flow ko initialize karna aur CSRF protection ke liye state set karna.
 */

import crypto from "crypto";
import { cookies } from "next/headers";
import { scalekit } from "@/lib/auth/scalekit";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    /* 1. SECURITY: Ek 16-byte ka random 'state' generate karna.
       Yeh login process ke dauran CSRF attack se bachata hai.
    */
    const state = crypto.randomBytes(16).toString("hex");

    /* 2. STORAGE: State ko browser cookie mein save karna.
       - httpOnly: JavaScript isse read nahi kar payegi (Secure).
       - sameSite: "lax" login flows ke liye standard hai.
       HttpOnly cookies are a crucial security feature that prevent client-side scripts (like JavaScript) from accessing sensitive cookies, primarily mitigating Cross-Site Scripting (XSS) attacks
    */
    const cookieStore = await cookies();

    cookieStore.set("sk_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 3600, // 1 ghante tak valid
      path: "/",
      sameSite: "lax",
    });

    /* 3. URL GENERATION: ScaleKit se authorization URL mangwana.
       Isme hamara 'state' aur 'redirectUri' pass hota hai.
    */

       const options={
        scopes:['openid','profile','email','offline_access'],
        state
       }

     const  redirectUri=process.env.SCALEKIT_REDIRECT_URI!


    const authorizationUrl = scalekit.getAuthorizationUrl(
      redirectUri,
      options,
    );

    /* 4. REDIRECT: User ko authentication provider (ScaleKit) par bhejna.
    */
    return NextResponse.redirect(authorizationUrl);

  } catch (error) {
    // Agar koi error aaye toh console par print karna
    console.error("Auth initialization error:", error);
    return NextResponse.json(
      { error: "Failed to initialize auth" },
      { status: 500 }
    );
  }
}