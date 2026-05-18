import { cookies } from "next/headers";
type CookieSessionUser = {
  name?: string;
  email?: string;
  organization_id?: string | null;
};

export type SessionUser = {
  name?: string;
  email?: string;
  organization_id?: string | null;
  user?: {
    email?: string;
    userProfile?: {
      firstName?: string;
      lastName?: string;
    };
  };
  [key: string]: unknown;
};

function splitName(name: string): { firstName?: string; lastName?: string } {
  const trimmed = name.trim();
  if (!trimmed) return {};
  const [firstName, ...rest] = trimmed.split(/\s+/);
  const lastName = rest.length ? rest.join(" ") : undefined;
  return { firstName, lastName };
}

function parseUserSessionCookie(value: string | undefined): SessionUser | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as CookieSessionUser;
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.email || typeof parsed.email !== "string") return null;

    const name = typeof parsed.name === "string" ? parsed.name : undefined;
    const organizationId =
      typeof parsed.organization_id === "string" || parsed.organization_id === null
        ? parsed.organization_id
        : undefined;
    const { firstName, lastName } = name ? splitName(name) : {};

    return {
      name,
      email: parsed.email,
      organization_id: organizationId,
      user: {
        email: parsed.email,
        userProfile: {
          firstName,
          lastName,
        },
      },
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const sessionCookies = await cookies();
  const userSessionCookie = sessionCookies.get("user_session")?.value;
  return parseUserSessionCookie(userSessionCookie);
}