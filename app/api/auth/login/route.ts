


import { scalekit } from "@/lib/scalekit";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const baseUrl = new URL(req.url).origin;

  // Callback URL after login - ensure this matches your Scalekit dashboard
  const redirectUrl = `${baseUrl}/api/auth/callback`;

  console.log("Login attempt - Base URL:", baseUrl);
  console.log("Login attempt - Redirect URL:", redirectUrl);

  try {
    // Get authorization URL from Scalekit
    const authUrl = await scalekit.getAuthorizationUrl(redirectUrl);
    console.log("Scalekit auth URL:", authUrl);
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Login error:", error);
    // Fallback to home page if there's an error
    return NextResponse.redirect(baseUrl);
  }
}