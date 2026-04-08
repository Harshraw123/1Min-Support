import { cookies } from "next/headers";
import { scalekit } from "./scalekit";

export type SessionUser = {
  user?: {
    email?: string;
    userProfile?: {
      firstName?: string;
      lastName?: string;
    };
  };
  [key: string]: unknown;
};

export async function getSession(): Promise<SessionUser | null> {
  try {
    const sessionCookies = await cookies();
    const token = sessionCookies.get("access_token")?.value;

    if (!token) return null;

    const result: any = await scalekit.validateToken(token);
    return await scalekit.user.getUser(result.sub);
  } catch (error: any) {
    console.log("Session validation failed:", error.message || error.name);
    return null;
  }
}