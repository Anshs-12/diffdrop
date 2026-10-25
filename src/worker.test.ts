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

describe('worker: markdown for agents', () => {
  const MD = `# JSON formatter\n\n> x\n\nCanonical: ${SITE_URL}/json-formatter/\nLast updated: 2026-10-26\n\nBody\n`;
  const files: Record<string, [string, string]> = {
    '/json-formatter/': ['<!doctype html><title>JSON formatter</title>', 'text/html'],
    '/_md/json-formatter.md': [MD, 'text/markdown'],
    '/_md/index.md': ['# Home\n', 'text/markdown'],
    '/_md/_catalog.json': ['{"pages":[]}', 'application/json'],
    '/llms.txt': ['# toolspace\n', 'text/plain'],
  };
  const assets = {
    ASSETS: {
      fetch: async (r: Request) => {
        const f = files[new URL(r.url).pathname];
        return f ? new Response(f[0], { headers: { 'Content-Type': f[1] } }) : new Response('<h1>404</h1>', { status: 404, headers: { 'Content-Type': 'text/html' } });
      },
    },
  };
  const get = (path: string, init?: RequestInit) => worker.fetch(new Request(`${SITE_URL}${path}`, init), assets);

  it('serves a page as markdown by .md suffix, with its headers', async () => {
    const res = await get('/json-formatter.md');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/markdown; charset=utf-8');
    expect(res.headers.get('X-Robots-Tag')).toBe('noindex, follow');
    expect(res.headers.get('Content-Location')).toBe(`${SITE_URL}/json-formatter/`);
    expect(res.headers.get('X-Markdown-Tokens')).toBe(String(Math.ceil(MD.length / 4)));
    expect(res.headers.get('Last-Modified')).toBe('Mon, 26 Oct 2026 00:00:00 GMT');
    expect(await res.text()).toBe(MD);
    expect(await (await get('/index.md')).text()).toBe('# Home\n');
  });

  it('negotiates markdown only when asked for above HTML', async () => {
    const md = await get('/json-formatter/', { headers: { Accept: 'text/markdown' } });
    expect(md.headers.get('Content-Type')).toBe('text/markdown; charset=utf-8');
    expect(md.headers.get('Vary')).toBe('Accept');
    for (const accept of ['*/*', 'text/html', 'text/markdown, text/html']) {
      const html = await get('/json-formatter/', { headers: { Accept: accept } });
      expect(html.headers.get('Content-Type'), accept).toBe('text/html');
      expect(html.headers.get('Vary')).toBe('Accept');
      expect(html.headers.get('Link')).toContain(`<${SITE_URL}/llms.txt>; rel="describedby"`);
    }
    // No Accept header at all: HTML
    expect((await get('/json-formatter/')).headers.get('Content-Type')).toBe('text/html');
    // Only listed pages are negotiated
    expect((await get('/llms.txt', { headers: { Accept: 'text/markdown' } })).headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
  });

  it('serves /api/md, the catalog, HEAD and OPTIONS', async () => {
    expect(await (await get('/api/md/json-formatter')).text()).toBe(MD);
    const catalog = await get('/api/md/_catalog');
    expect(catalog.headers.get('Content-Type')).toBe('application/json; charset=utf-8');
    expect(catalog.headers.get('Access-Control-Allow-Origin')).toBe('*');
    const head = await get('/json-formatter.md', { method: 'HEAD' });
    expect(head.headers.get('X-Markdown-Tokens')).toBeTruthy();
    expect(await head.text()).toBe('');
    const options = await get('/json-formatter.md', { method: 'OPTIONS' });
    expect(options.status).toBe(204);
    expect(options.headers.get('Access-Control-Allow-Methods')).toBe('GET, HEAD, OPTIONS');
  });

  it('answers unknown pages with a markdown 404, never HTML', async () => {
    for (const path of ['/does-not-exist.md', '/api/md/nope', '/secret.md']) {
      const res = await get(path);
      expect(res.status, path).toBe(404);
      expect(res.headers.get('Content-Type'), path).toBe('text/markdown; charset=utf-8');
      expect(await res.text()).toMatch(/^# Not found/);
    }
    // A listed page whose markdown file is missing is also a markdown 404
    expect((await get('/word-counter.md')).status).toBe(404);
  });

  it('serves the agent files as plain text with CORS', async () => {
    const res = await get('/llms.txt');
    expect(res.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});
