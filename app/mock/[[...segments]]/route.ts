import { createMockHandler } from "@/lib/mock/handler";
import { createRuntimeStore } from "@/lib/mock/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const handler = createMockHandler(createRuntimeStore);

export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
  handler as OPTIONS,
  // Override Next.js's implicit HEAD-to-GET fallback: only the five configured
  // methods are callable; HEAD receives the same 404/405 status without a body.
  handler as HEAD,
};
