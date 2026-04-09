// Next.js middleware for protecting dashboard routes

import { getSession } from './lib/getSession';
import { NextRequest, NextResponse } from "next/server";
import { scalekitSessionCookieName, verifyScalekitSessionCookieValue } from "./lib/sessionCookie";

export async function proxy(req: NextRequest) {
  try {
    const baseUrl = new URL(req.url).origin;

    // Fast-path: verify signed cookie without calling Scalekit on every request.
    const accessToken = req.cookies.get("access_token")?.value;
    const fastCookie = req.cookies.get(scalekitSessionCookieName)?.value;
    const fastOk = verifyScalekitSessionCookieValue(accessToken, fastCookie);

    // Safe fallback when secret is missing or cookie isn't present (keeps current behavior).
    const session = fastOk ? { user: {} } : await getSession();

    if (!session) {
      // Redirect to home page if not authenticated
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || baseUrl}`);
    }

    // User is authenticated, proceed to dashboard
    if (!fastOk) console.log("Authenticated user accessing dashboard:", session.user?.email);
    return NextResponse.next();
  } catch (error) {
    console.error("Proxy middleware error:", error);
    // If there's an error, redirect to home for safety
    const baseUrl = new URL(req.url).origin;
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || baseUrl}`);
  }
}

export  const config = {
  matcher: '/dashboard/:path*',
}



