import { scalekit } from "@/lib/scalekit";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const baseUrl = new URL(req.url).origin;

  // Get the ID token hint for Scalekit logout
  const idTokenHint = req.cookies.get("idToken")?.value;
  const postLogoutRedirectUri = baseUrl;

  const logoutUrl = scalekit.getLogoutUrl({
    idTokenHint,
    postLogoutRedirectUri,
  });

  const response = NextResponse.redirect(logoutUrl);

  response.cookies.delete("access_token");
  response.cookies.delete("refresh_token");
  response.cookies.delete("idToken");

  // Also try to logout from Scalekit if needed
  try {
    if (idTokenHint) {
      const logoutUrl = scalekit.getLogoutUrl({
        idTokenHint,
        postLogoutRedirectUri: baseUrl,
      });
      // You could redirect to Scalekit logout first, but for now just clear local session
    }
  } catch (error) {
    console.error("Scalekit logout error:", error);
  }

  return response;
}