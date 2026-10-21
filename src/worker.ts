/**
 * Cloudflare Worker in front of the static site (see wrangler.jsonc). Requests
 * to the site's old workers.dev address are sent to the same path and query on
 * the current domain with a permanent (301) redirect; everything else is served
 * from the built files as before.
 */
import { OLD_HOST, SITE_URL } from './site';

interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.hostname === OLD_HOST) {
      return Response.redirect(`${SITE_URL}${url.pathname}${url.search}`, 301);
    }
    return env.ASSETS.fetch(request);
  },
};
