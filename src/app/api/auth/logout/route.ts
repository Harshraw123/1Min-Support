import { scalekit } from "@/lib/auth/scalekit";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const idToken = cookieStore.get("sk_id_token")?.value;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const postLogoutRedirectUri = `${baseUrl.replace(/\/$/, "")}?logout=success`;

  // Agar idToken hai → proper SSO logout
  if (idToken) {
    const logoutUrl = scalekit.getLogoutUrl({
      idTokenHint: idToken,
      postLogoutRedirectUri,
    });

    const response = NextResponse.redirect(logoutUrl);

    // Clear cookies
    response.cookies.delete("sk_id_token");
    response.cookies.delete("user_session");

    return response;
  }

  // Fallback: sirf cookies clear
  const response = NextResponse.redirect(postLogoutRedirectUri);

  response.cookies.delete("sk_id_token");
  response.cookies.delete("user_session");

  return response;
}