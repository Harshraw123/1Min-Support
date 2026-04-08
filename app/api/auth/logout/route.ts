import { scalekit } from "@/lib/scalekit";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { origin } = new URL(req.url);

  // Get the ID token hint for Scalekit logout
  const idTokenHint = req.cookies.get("idToken")?.value;
  const postLogoutRedirectUri = process.env.NEXT_PUBLIC_APP_URL ?? origin;


  const logoutUrl = scalekit.getLogoutUrl({
    idTokenHint,
    postLogoutRedirectUri,
  });

  const response = NextResponse.redirect(logoutUrl);

  // Ensure cookie deletion matches the original cookie path.
  // (Cookies were set with `path: "/"` in the callback route.)
  const expires = new Date(0);
  response.cookies.set("access_token", "", { expires, path: "/" });
  response.cookies.set("refresh_token", "", { expires, path: "/" });
  response.cookies.set("idToken", "", { expires, path: "/" });

  return response;
}