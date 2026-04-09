import { scalekit } from "@/lib/scalekit";
import { NextRequest, NextResponse } from "next/server";
import { createScalekitSessionCookieValue, scalekitSessionCookieName } from "@/lib/sessionCookie";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);

  console.log("Callback URL:", req.url);
  console.log("Origin:", origin);

  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Handle errors from Scalekit
  if (error) {
    console.error("Scalekit error:", error, errorDescription);
    return NextResponse.redirect(`${origin}?error=${error}&description=${errorDescription}`);
  }

  if (!code) {
    console.log("No code found, redirecting to home");
    return NextResponse.redirect(origin);
  }

  const baseUrl = origin;
  const redirectUri = `${baseUrl}/api/auth/callback`;

  console.log("Using redirect URI:", redirectUri);

  try {
    // Exchange code for session
    const session = await scalekit.authenticateWithCode(code, redirectUri);
    
    console.log("Session created successfully");


    // Redirect to home page after successful login (with toast flag)
    const redirectTarget = new URL(baseUrl);
    redirectTarget.searchParams.set("login", "success");
    const response = NextResponse.redirect(redirectTarget);



    // Store access token in cookie
    const accessTokenMaxAge = 24 * 60 * 60; // 1 day
    response.cookies.set("access_token", session.accessToken, {
      httpOnly: true,
      maxAge: accessTokenMaxAge,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
    });

    // Fast-path auth cookie: lets middleware check auth without hitting Scalekit on every request.
    // If the secret isn't configured, we simply skip setting it and fall back to slow validation.
    try {
      const fastCookieValue = createScalekitSessionCookieValue(session.accessToken, accessTokenMaxAge);
      response.cookies.set(scalekitSessionCookieName, fastCookieValue, {
        httpOnly: true,
        maxAge: accessTokenMaxAge,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        sameSite: "lax",
      });
    } catch {
      // no-op
    }

    // Store refresh token if available
    if (session.refreshToken) {
      response.cookies.set("refresh_token", session.refreshToken, {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60, // 7 days
        secure: process.env.NODE_ENV === "production",
        path: "/",
        sameSite: "lax",
      });
    }

    // Store ID token if available
    if (session.idToken) {
      response.cookies.set("idToken", session.idToken, {
        httpOnly: true,
        maxAge: 24 * 60 * 60, // 1 day
        secure: process.env.NODE_ENV === "production",
        path: "/",
        sameSite: "lax",
      });
    }

    return response;
  } catch (error) {
    console.error("Authentication error:", error);
    return NextResponse.redirect(`${origin}?error=auth_failed`);
  }

}



  // Flow (now correct):
// Scalekit → redirects to
// /api/auth/callback?code=...
// You extract code
// Exchange → accessToken
// Store in cookie 🍪
// Redirect user to homepage



