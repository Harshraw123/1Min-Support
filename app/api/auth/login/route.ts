


import { scalekit } from "@/lib/scalekit";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL is not defined");
  }


    // /.give authorize url after succesfull signup

    //jo bhi scalekit session ya token dega usko cokkies me store kralenge via call back
  // lgin ke baad url pe direct hone vo hai api/auth/callback



  // Callback URL after login
  const redirectUrl = `${baseUrl}/api/auth/callback`;


  // Get authorization URL from Scalekit
  const url = await scalekit.getAuthorizationUrl(redirectUrl);

  console.log(url);

  return NextResponse.redirect(url);
}