import crypto from "crypto";

const COOKIE_NAME = "sk_session";

function getSecret(): string | null {
  // Cookie signing ke liye Scalekit client secret env se milta hai.
  return process.env.SCALEKIT_CLIENT_SECRET || null;
}

function b64url(input: Buffer | string): string {
  // Binary data ko cookie-safe base64url string me encode karta hai.
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function fromB64url(input: string): Buffer {
  // Cookie-safe base64url ko wapas Buffer me decode karta hai.
  const normalized = input.replaceAll("-", "+").replaceAll("_", "/");
  const pad = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + pad, "base64");
}

function sha256(data: string): Buffer {
  // Access token ka hash store hota hai, raw token cookie me nahi.
  return crypto.createHash("sha256").update(data).digest();
}

function hmac(secret: string, data: string): Buffer {
  // Cookie payload ko tamper-proof banane ke liye HMAC signature banta hai.
  return crypto.createHmac("sha256", secret).update(data).digest();
}

function timingSafeEqual(a: Buffer, b: Buffer): boolean {
  // Signature compare timing-safe hota hai taaki leak risk kam rahe.
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function createScalekitSessionCookieValue(accessToken: string, maxAgeSeconds: number): string {
  // Access token hash, expiry aur signature mila kar fast session cookie value banti hai.
  const secret = getSecret();
  if (!secret) {
    throw new Error("Missing SCALEKIT_CLIENT_SECRET for fast auth cookie");
  }

  const exp = Math.floor(Date.now() / 1000) + maxAgeSeconds;
  const tokenHash = b64url(sha256(accessToken));
  const payload = `${exp}.${tokenHash}`;
  const sig = b64url(hmac(secret, payload));
  return `${payload}.${sig}`;
}

export function verifyScalekitSessionCookieValue(
  accessToken: string | undefined,
  cookieValue: string | undefined
): boolean {
  // Cookie expiry, token hash aur signature verify karke session trust decide hota hai.
  const secret = getSecret();
  if (!secret) return false;
  if (!accessToken || !cookieValue) return false;

  const parts = cookieValue.split(".");
  if (parts.length !== 3) return false;

  const [expStr, tokenHashB64, sigB64] = parts;
  const exp = Number(expStr);
  if (!Number.isFinite(exp)) return false;
  if (exp <= Math.floor(Date.now() / 1000)) return false;

  const expectedTokenHash = b64url(sha256(accessToken));
  if (tokenHashB64 !== expectedTokenHash) return false;

  const payload = `${expStr}.${tokenHashB64}`;
  const expectedSig = hmac(secret, payload);
  let providedSig: Buffer;
  try {
    providedSig = fromB64url(sigB64);
  } catch {
    return false;
  }

  return timingSafeEqual(expectedSig, providedSig);
}

export const scalekitSessionCookieName = COOKIE_NAME;
