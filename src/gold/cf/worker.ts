import { GoldRoom } from "./gold-room";
import { CORS } from "./http";

export { GoldRoom };

const PAGE_PATHS = new Set(["/", "/demo", "/index.html", "/demo.css", "/demo.js"]);

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    const url = new URL(request.url);
    const stub = env.GOLD_ROOM.getByName("xauusd");

    if (PAGE_PATHS.has(url.pathname)) {
      ctx.waitUntil(stub.ensureTicking());
      if (url.pathname === "/demo") {
        const index = new URL(request.url);
        index.pathname = "/index.html";
        return env.ASSETS.fetch(new Request(index, request));
      }
      return env.ASSETS.fetch(request);
    }

    return stub.fetch(request);
  },
} satisfies ExportedHandler<Env>;
