import { cookies } from "next/headers";
import { scalekit } from "./scalekit";

export type SessionUser = {
  name?: string | null;
  email?: string | null;
  [key: string]: unknown;
};



export async function getSession(): Promise<SessionUser | null> {
  try {
    const sessionCookies = await cookies();
    const token =  sessionCookies.get("access_token")?.value;

    if (!token) {
      return null;
    }

    const result: any = await scalekit.validateToken(token);

    const user = await scalekit.user.getUser(result.sub);


    return user;
  } catch (error) {
    console.error("Error in getSession:", error);
    return null;
  }
}