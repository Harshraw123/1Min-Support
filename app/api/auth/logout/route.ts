import { scalekit } from "@/lib/scalekit";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const idToken = cookieStore.get("user_session")?.value;

  const postLogoutRedirectUri = "http://localhost:3000";

  // Agar idToken hai → proper SSO logout
  if (idToken) {
    const logoutUrl = scalekit.getLogoutUrl({
      idToken,
      postLogoutRedirectUri,
    });

    const response = NextResponse.redirect(logoutUrl);

    // Clear cookies
    response.cookies.set("user_session", "", {
      expires: new Date(0),
      path: "/",
    });

    return response;
  }

  // Fallback: sirf cookies clear
  const response = NextResponse.redirect(postLogoutRedirectUri);

  response.cookies.set("user_session", "", {
    expires: new Date(0),
    path: "/",
  });

  return response;
}