import { NextResponse } from "next/server";

// Create a response that clears cookies and redirects
export function createClearCookiesResponse(redirectUrl: string) {
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
