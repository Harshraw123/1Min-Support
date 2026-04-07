import { scalekit } from "@/lib/scalekit"; // 🔥 missing import
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) { // ✅ GET (capital) + NextRequest correct
  const { searchParams } = new URL(req.url); // code wala param chayie

  // http://localhost:3000/api/auth/callback?code=xyz

  const code = searchParams.get("code"); // ✅ fixed typo (serachParams)

  if (!code) {
    return NextResponse.json({ message: "code is not Found" });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL not defined");
  }

  const redirectUri = `${baseUrl}/api/auth/callback`;

  // built in method se session
  const session = await scalekit.authenticateWithCode(code, redirectUri); 


  // login ke baad home pe redirect
  const response = NextResponse.redirect(baseUrl);

  // jo bhi scalekit session ya token dega usko cookies me store kralenge via call back
  response.cookies.set("access_token", session.accessToken, {
    httpOnly: true,
    maxAge: 24 * 60 * 60, // 1 day
    secure: false, // ⚠️ production me true karna (https)
    path: "/", // 
  });



  return response; // 
}



  // Flow (now correct):
// Scalekit → redirects to
// /api/auth/callback?code=...
// You extract code
// Exchange → accessToken
// Store in cookie 🍪
// Redirect user to homepage