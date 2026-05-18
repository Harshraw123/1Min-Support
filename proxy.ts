// Next.js middleware for protecting dashboard routes

import { getSession } from '@/lib/auth/getSession';
import { NextRequest, NextResponse } from "next/server";

export async function proxy(req: NextRequest) {
  try {
    const baseUrl = new URL(req.url).origin;
    const session = await getSession();

    if (!session) {
      // Redirect to home page if not authenticated
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || baseUrl}`);
    }

    // User is authenticated, proceed to dashboard
    console.log("Authenticated user accessing dashboard:", session.email || session.user?.email);
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


