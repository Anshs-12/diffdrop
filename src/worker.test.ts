import { describe, expect, it } from 'vitest';
import worker from './worker';
import { SITE_URL } from './site';

const env = { ASSETS: { fetch: async (r: Request) => new Response(`asset ${new URL(r.url).pathname}`) } };

describe('worker', () => {
  it('sends the old workers.dev address to the same path and query on the new domain, permanently', async () => {
    const res = await worker.fetch(new Request('https://diffdrop.anshx12.workers.dev/json-formatter/?a=1&b=two#x'), env);
    expect(res.status).toBe(301);
    expect(res.headers.get('location')).toBe('https://toolspace.tech/json-formatter/?a=1&b=two');
    const root = await worker.fetch(new Request('https://diffdrop.anshx12.workers.dev/'), env);
    expect(root.headers.get('location')).toBe('https://toolspace.tech/');
  });

  it('serves the site normally on the new domain', async () => {
    const res = await worker.fetch(new Request(`${SITE_URL}/word-counter/`), env);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('asset /word-counter/');
  });
});
