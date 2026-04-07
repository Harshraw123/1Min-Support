import { scalekit } from "@/lib/scalekit";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const baseUrl = new URL(req.url).origin;

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

  return response;
}