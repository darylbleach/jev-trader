import { GoldRoom } from "./gold-room";
import { CORS } from "./http";
import { GOLD_PAGES } from "./page";

export { GoldRoom };

const PAGE_ALIASES: Record<string, string> = {
  "/": "/",
  "/demo": "/",
  "/index.html": "/",
  "/demo.css": "/demo.css",
  "/demo.js": "/demo.js",
};

function pageResponse(pathname: string): Response | null {
  const key = PAGE_ALIASES[pathname];
  if (!key) return null;
  const page = GOLD_PAGES[key];
  if (!page) return null;
  return new Response(page.body, {
    headers: {
      "content-type": page.type,
      "cache-control": "no-store",
    },
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    const url = new URL(request.url);
    const stub = env.GOLD_ROOM.getByName("xauusd");

    const page = pageResponse(url.pathname);
    if (page) {
      ctx.waitUntil(stub.ensureTicking());
      return page;
    }

    return stub.fetch(request);
  },
} satisfies ExportedHandler<Env>;
