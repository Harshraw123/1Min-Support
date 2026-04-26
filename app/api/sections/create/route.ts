import { NextRequest } from "next/server";
import { POST as storePost } from "@/app/api/sections/store/route";

/**
 * Backwards-compatible route.
 * The UI uses `/api/sections/store`; keep `/api/sections/create` working too.
 */
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return storePost(req);
}