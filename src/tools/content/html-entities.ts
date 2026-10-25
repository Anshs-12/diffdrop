import type { ToolContent } from '../content';

const content: ToolContent = {
  h1: 'HTML entity encoder and decoder',
  lede: 'Escape text so it shows as text in HTML, or turn entities like &amp; and &#233; back into characters. Decoding runs as plain text processing, never as HTML.',
  steps: [
    { title: 'Choose Encode or Decode', body: 'Encode escapes & < > " and \' so a browser shows them instead of treating them as markup. Decode reverses it.' },
    { title: 'Pick a style', body: 'Named entities (&lt;), decimal (&#60;) or hex (&#x3C;). Turn on Encode non-ASCII to also escape accented letters, symbols and emoji.' },
    { title: 'Copy the result', body: 'Switching direction moves the output into the input, so you can check a round trip in one click.' },
  ],
  faq: [
    { q: 'Which characters must be escaped in HTML?', a: 'In text, & and < always; > for safety. Inside attribute values, also the quote you used around the value. This tool escapes all five (& < > " \') so the result is safe in both places.' },
    { q: 'Why is the apostrophe written as &#39; and not &apos;?', a: '&apos; came with XHTML and HTML5 and isn’t in HTML 4, so some older software doesn’t know it. &#39; works everywhere. The decoder understands both.' },
    { q: 'Which named entities does the decoder know?', a: 'The full HTML 4 set of 252 names, from &nbsp; and &copy; to Greek letters, arrows and math symbols, plus &apos;. Any numeric entity works. Unknown names are left as written and listed above the output.' },
    { q: 'Do I need entities for accents and emoji?', a: 'Not if the page is served as UTF-8, which almost every page is. Escape them only when the text has to pass through a system that mangles non-ASCII characters.' },
    { q: 'Is it safe to decode untrusted text here?', a: 'Yes. Decoding is a lookup in a table; the text is never put into the page as HTML, so a decoded <script> tag is only text.' },
  ],
  example: {
    intro: 'A snippet of HTML escaped with named entities, so it can be shown as code on a web page.',
    inputLabel: 'text',
    input: '<a href="/?q=fish&chips">Fish & chips</a>',
    outputLabel: 'escaped',
    output: '&lt;a href=&quot;/?q=fish&amp;chips&quot;&gt;Fish &amp; chips&lt;/a&gt;',
  },
  mistakes: [
    { title: 'Escaping twice', body: 'Encoding already-escaped text turns &amp; into &amp;amp;, which shows up on the page as “&amp;”. Decode first if you aren’t sure.' },
    { title: 'Forgetting the semicolon', body: '&copy without the semicolon only works by accident for a few old names. Always write &copy;.' },
    { title: 'Escaping only < and >', body: 'An unescaped & or quote can still break an attribute value or start an entity. Escape all five special characters.' },
    { title: 'Using entities to stop script injection in JavaScript or URLs', body: 'HTML escaping protects HTML text and attributes. Inside a <script> block, a URL or CSS, each context needs its own escaping.' },
  ],
  related: ['url-encoder', 'base64', 'html-beautifier', 'markdown-preview'],
};

export default content;
