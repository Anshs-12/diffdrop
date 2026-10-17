import { KEYWORDS, PAGES, type Page } from '@/site';

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Pages matching a query, best first: name matches beat keyword matches beat
 * description matches. Every word of the query has to match somewhere.
 */
export function searchPages(query: string, pages: Page[] = PAGES): Page[] {
  const words = norm(query).split(/\s+/).filter(Boolean);
  if (!words.length) return pages;
  const scored: { page: Page; score: number }[] = [];
  for (const page of pages) {
    const name = norm(page.name);
    const keywords = (KEYWORDS[page.id] ?? []).map(norm);
    const text = norm(`${page.blurb} ${page.title}`);
    let score = 0;
    let all = true;
    for (const w of words) {
      if (name.startsWith(w) || name.split(/\W+/).some((part) => part.startsWith(w))) score += 10;
      else if (name.includes(w)) score += 6;
      else if (keywords.some((k) => k.startsWith(w) || k.split(/\s+/).some((part) => part.startsWith(w)))) score += 4;
      else if (text.includes(w)) score += 1;
      else all = false;
    }
    if (all) scored.push({ page, score });
  }
  return scored.sort((a, b) => b.score - a.score || pages.indexOf(a.page) - pages.indexOf(b.page)).map((s) => s.page);
}
