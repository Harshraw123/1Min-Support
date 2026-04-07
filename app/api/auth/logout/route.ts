import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "/";
  const response = NextResponse.redirect(baseUrl);

  response.cookies.set("access_token", "", {
    httpOnly: true,
    maxAge: 0,
    secure: false,
    path: "/",
  });

  return response;
}

