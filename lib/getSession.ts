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

    const result = (await scalekit.validateToken(token)) as unknown;
    if (
      !result ||
      typeof result !== "object" ||
      !("sub" in result) ||
      typeof (result as { sub?: unknown }).sub !== "string"
    ) {
      return null;
    }

    return await scalekit.user.getUser((result as { sub: string }).sub);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : typeof error === "string" ? error : "Unknown error";
    console.log("Session validation failed:", message);
    return null;
  }
}