import { Scalekit } from "@scalekit-sdk/node";

const environmentUrl = process.env.SCALEKIT_ENVIRONMENT_URL;
const clientId = process.env.SCALEKIT_CLIENT_ID;
const clientSecret = process.env.SCALEKIT_CLIENT_SECRET;

if (!environmentUrl || !clientId || !clientSecret) {
  throw new Error("Missing Scalekit environment variables");
}

// Shared Scalekit SDK client auth routes me login/callback ke liye use hota hai.
export const scalekit: Scalekit = new Scalekit(
  environmentUrl,
  clientId,
  clientSecret
);
