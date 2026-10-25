import type { ToolContent } from '../content';

const content: ToolContent = {
  h1: 'Meta tag generator',
  lede: 'Fill in a page’s title, description, link and image to get the HTML meta tags for it: the basics, Open Graph and Twitter cards. A rough search-result and social-card preview updates as you type, all in your browser.',
  steps: [
    { title: 'Describe the page', body: 'Enter the title, a one- or two-sentence description, the canonical URL and, if you have one, a share image URL with alt text.' },
    { title: 'Check the lengths and previews', body: 'The counters show roughly how much text search results and social cards tend to show before cutting it off. The previews are drawn locally; the image URL is never loaded.' },
    { title: 'Copy the tags into <head>', body: 'Copy them or download an .html snippet. Every value is HTML-escaped, so quotes and ampersands in your text are safe.' },
  ],
  faq: [
    { q: 'What’s the difference between og: and twitter: tags?', a: 'Open Graph (og:) tags were created by Facebook and are read by most sites that build link previews. X (Twitter) reads its own twitter: tags and falls back to Open Graph for title, description and image when they’re missing. Including both is common and harmless.' },
    { q: 'How long should a title or description be?', a: 'There’s no fixed limit: search results and social cards cut text by its width on screen, which depends on the device and font. About 50–60 characters for a title and 150–160 for a description are common guides for what tends to be shown in full.' },
    { q: 'Why should the image URL be absolute?', a: 'Sites that fetch your page to build a preview don’t resolve relative paths like /img/card.png. Use the full https:// URL.' },
    { q: 'What does the robots meta tag do?', a: 'noindex asks search engines not to list the page; nofollow asks them not to follow its links. When both are allowed (index, follow), the tag isn’t needed, so it’s left out.' },
    { q: 'Does this page fetch my URL or image?', a: 'No. Nothing is fetched or sent anywhere: the previews are drawn from the text you type, and the image appears as a placeholder showing its URL.' },
  ],
  example: {
    intro: 'An article page with a share image. Description, canonical URL and image go into the basic tags, Open Graph and Twitter cards.',
    inputLabel: 'fields',
    input:
      'title: Sourdough starter in 7 days\ndescription: How to make a sourdough starter from flour & water, with a day-by-day feeding schedule.\nurl: https://example.com/sourdough-starter\nsiteName: Example Kitchen\nimage: https://example.com/img/starter.jpg\nimageAlt: A jar of bubbly sourdough starter\ntype: article\ntwitterSite: @examplekitchen',
    outputLabel: 'html',
    output: `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sourdough starter in 7 days</title>
<meta name="description" content="How to make a sourdough starter from flour &amp; water, with a day-by-day feeding schedule.">
<link rel="canonical" href="https://example.com/sourdough-starter">

<meta property="og:type" content="article">
<meta property="og:title" content="Sourdough starter in 7 days">
<meta property="og:description" content="How to make a sourdough starter from flour &amp; water, with a day-by-day feeding schedule.">
<meta property="og:url" content="https://example.com/sourdough-starter">
<meta property="og:site_name" content="Example Kitchen">
<meta property="og:image" content="https://example.com/img/starter.jpg">
<meta property="og:image:alt" content="A jar of bubbly sourdough starter">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@examplekitchen">
<meta name="twitter:title" content="Sourdough starter in 7 days">
<meta name="twitter:description" content="How to make a sourdough starter from flour &amp; water, with a day-by-day feeding schedule.">
<meta name="twitter:image" content="https://example.com/img/starter.jpg">
<meta name="twitter:image:alt" content="A jar of bubbly sourdough starter">
`,
    note: 'The & in the description is written as &amp;, so the HTML stays valid.',
  },
  mistakes: [
    { title: 'Relative image URLs', body: 'og:image="/card.png" usually shows no image. Preview builders need the full https:// address.' },
    { title: 'The same title on every page', body: 'Each page needs its own title and description; copying one set across a site makes pages hard to tell apart in results and shares.' },
    { title: 'Unescaped quotes', body: 'A " inside content="…" ends the attribute early and breaks the tag. Escape it as &quot; (this tool does it for you).' },
    { title: 'A leftover noindex', body: 'A noindex tag copied from a staging site keeps the live page out of search results. Check the robots tag before you publish.' },
  ],
  related: ['robots-txt', 'html-entities', 'slug-generator', 'url-encoder'],
};

export default content;
