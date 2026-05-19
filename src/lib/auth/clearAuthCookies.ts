import { NextResponse } from "next/server";

export function createClearCookiesResponse(redirectUrl: string) {
  // Logout redirect response banate waqt auth cookies expire kar deta hai.
  const response = NextResponse.redirect(redirectUrl);
  
  response.cookies.set("access_token", "", { 
    expires: new Date(0),
    path: "/" 
  });
  response.cookies.set("refresh_token", "", { 
    expires: new Date(0),
    path: "/" 
  });
  response.cookies.set("idToken", "", { 
    expires: new Date(0),
    path: "/" 
  });
  
  return response;
}
