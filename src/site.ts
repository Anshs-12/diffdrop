/**
 * Where the site lives and which pages it has. Change SITE_URL when the domain
 * moves (e.g. to https://diffdrop.me): canonical links, social cards,
 * robots.txt and sitemap.xml all follow it at build time.
 */
export const SITE_URL = 'https://diffdrop.anshx12.workers.dev';

export const REPO_URL = 'https://github.com/Anshs-12/diffdrop';

/** Every indexable page, for sitemap.xml. Paths end in "/" (directory index). */
export const PAGES: { path: string; priority: number }[] = [
  { path: '/', priority: 1.0 },
];
