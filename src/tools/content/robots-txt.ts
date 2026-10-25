import type { ToolContent } from '../content';

const content: ToolContent = {
  h1: 'Robots.txt generator',
  lede: 'Build a robots.txt file group by group: pick the crawlers, add the paths they may or may not fetch, and list your sitemap. Then test any URL against it, or paste an existing file to test that. Runs in your browser.',
  steps: [
    { title: 'Start from a preset or a blank group', body: 'Allow all, block all, block a folder, or block a list of AI crawlers. Each group names one or more user-agents and their Allow and Disallow paths.' },
    { title: 'Add sitemaps and check the file', body: 'Sitemap lines go at the end. The finished file updates as you edit; copy it or download robots.txt for the root of your site.' },
    { title: 'Test a URL', body: 'Enter a path and a crawler name to see whether it may fetch it and which line decided. Paste a live robots.txt to test that instead.' },
  ],
  faq: [
    { q: 'How does a crawler decide between Allow and Disallow?', a: 'Under RFC 9309, the rule with the longest matching path wins, whichever comes first in the file. If an Allow and a Disallow match with the same length, Allow wins. No matching rule means the URL is allowed.' },
    { q: 'Which group applies to a crawler?', a: 'Only one: the group whose User-agent matches the crawler’s name (case doesn’t matter). If there isn’t one, the * group applies. A crawler with its own group ignores the * rules entirely, so repeat any shared rules in it.' },
    { q: 'What do * and $ mean in a path?', a: '* matches any run of characters, and $ at the end means the URL must end there. Disallow: /*.pdf$ blocks URLs ending in .pdf but not /file.pdf?download=1.' },
    { q: 'Does robots.txt hide a page from search results?', a: 'No. It asks crawlers not to fetch URLs, but a blocked URL can still be listed if other pages link to it. To keep a page out of results, let it be crawled and use a noindex meta tag.' },
    { q: 'Does Google use Crawl-delay?', a: 'No, Google ignores Crawl-delay. Some other crawlers, such as Bing’s, read it as seconds to wait between requests. It isn’t part of RFC 9309.' },
  ],
  example: {
    intro: 'Keep crawlers out of a shop’s cart and account pages but leave the help section open, and point them at the sitemap.',
    inputLabel: 'groups',
    input: 'User-agent: *\n  disallow /cart/\n  disallow /account/\n  allow /account/help/\nSitemap: https://example.com/sitemap.xml',
    outputLabel: 'robots.txt',
    output: 'User-agent: *\nDisallow: /cart/\nDisallow: /account/\nAllow: /account/help/\n\nSitemap: https://example.com/sitemap.xml\n',
    note: 'Testing /account/help/returns gives “allowed”: Allow: /account/help/ is longer than Disallow: /account/.',
  },
  mistakes: [
    { title: 'Disallow: / on the live site', body: 'A file copied from staging with Disallow: / asks every crawler to stay away from the whole site. Check before you deploy.' },
    { title: 'Expecting a specific group to add to *', body: 'A Googlebot group replaces the * group for Googlebot; it doesn’t add to it. Rules you want everywhere must be in each group.' },
    { title: 'Using it to hide private pages', body: 'robots.txt is public and only a request. Anyone can read it, and it lists exactly the paths you’d rather keep quiet. Protect private pages with a login.' },
    { title: 'Wrong place or case', body: 'The file must be at /robots.txt on each host (and each subdomain), and paths are case-sensitive: /Admin and /admin are different.' },
  ],
  related: ['meta-tag-generator', 'regex-tester', 'url-encoder', 'slug-generator'],
};

export default content;
