import type { ToolContent } from '../content';

const content: ToolContent = {
  h1: 'HTML beautifier',
  lede: 'Format HTML with Prettier: nested tags indented, long attribute lists wrapped, and inline <script> and <style> blocks tidied too. Minify mode collapses whitespace and strips comments for a smaller page.',
  steps: [
    { title: 'Paste your markup', body: 'A full page or a fragment. Open or drop an .html file; it’s read on your machine.' },
    { title: 'Indent or compact it', body: 'Format indents the tree and wraps at your line width. Minify collapses whitespace but leaves <pre>, <textarea>, <script> and <style> exactly as written.' },
    { title: 'Check the structure', body: 'A tag closed in the wrong place is reported with its line, so the output never silently restructures your page.' },
  ],
  faq: [
    { q: 'Why do some lines start with “>”?', a: 'Whitespace between inline elements such as <a>, <span> or <label> shows up on the page as a space. To add line breaks without adding visible spaces, Prettier moves the closing “>” of a tag onto the next line. It looks odd, but the page renders the same.' },
    { q: 'What does Minify do?', a: 'It removes comments (except Internet Explorer conditional comments), collapses each run of whitespace to one space, drops whitespace where it never shows (in the <head>, between table rows and cells, between options) and tidies spaces inside tags. Attribute values and inline scripts and styles are not changed or minified.' },
    { q: 'Is Minify safe for every page?', a: 'For normal HTML, yes: browsers already collapse whitespace the same way. The exception is an element other than <pre> or <textarea> that your CSS sets to white-space: pre; there, collapsed spaces would show. Use Format for such pages.' },
    { q: 'Will it fix broken HTML?', a: 'It fills in optional end tags such as </li> and </p>, which browsers also allow. A closing tag in the wrong place, like </div> while a <span> is still open, is reported with its line instead of being guessed at.' },
  ],
  example: {
    intro: 'A navigation list squeezed onto one line.',
    inputLabel: 'html',
    input: '<nav><ul><li><a href="/">Home</a></li><li><a href="/blog">Blog</a></li></ul></nav>',
    outputLabel: 'formatted',
    output: '<nav>\n  <ul>\n    <li><a href="/">Home</a></li>\n    <li><a href="/blog">Blog</a></li>\n  </ul>\n</nav>\n',
  },
  mistakes: [
    { title: 'Closing tags out of order', body: '<b><i>text</b></i> overlaps two elements. Browsers patch it up differently; close the inner tag first.' },
    { title: 'Assuming whitespace never matters', body: '<a>One</a><a>Two</a> and the same links on separate lines render differently: the line break becomes a space. Both modes here keep that difference.' },
    { title: 'Expecting Minify to shrink scripts', body: 'Inline JavaScript and CSS are kept as written. Minify them with your build tool, or use the CSS beautifier’s Minify mode for styles.' },
    { title: 'Escaping by hand', body: 'A literal < or & in text should be &lt; or &amp;. The HTML entity encoder converts a whole block at once.' },
  ],
  related: ['code-beautifier', 'css-beautifier', 'html-entities', 'markdown-preview'],
};

export default content;
