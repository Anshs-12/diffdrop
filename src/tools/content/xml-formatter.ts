import type { ToolContent } from '../content';

const content: ToolContent = {
  h1: 'XML formatter',
  lede: 'Format XML with clean indentation and check that it’s well-formed: a mismatched tag, a bare & or a repeated attribute is reported with its line and column. Minify mode strips comments and the whitespace between tags.',
  steps: [
    { title: 'Paste or open XML', body: 'A config file, a feed, a SOAP message or an SVG. Files are read in your browser.' },
    { title: 'Pick a mode', body: 'Format puts each element on its own line. Minify removes comments and the whitespace between tags. Choose 2 or 4 spaces or tabs.' },
    { title: 'Fix any error', body: 'If the XML isn’t well-formed, nothing is changed: you see the first problem and a button that jumps to its line.' },
  ],
  faq: [
    { q: 'What does well-formed mean?', a: 'One root element; every tag closed, in the right order and with the same case; attribute values quoted and not repeated; and & and < in text written as &amp; and &lt;. Any XML parser rejects a document that breaks one of these rules.' },
    { q: 'Does it validate against a schema or DTD?', a: 'No. It checks well-formedness, not whether elements match an XSD or DTD. Entities declared in an internal DTD are accepted and left as they are.' },
    { q: 'Will formatting change my text?', a: 'No. Only the whitespace between tags is changed, and only in elements that contain other elements and no text. Text, CDATA, comments, attribute values, mixed content (text next to tags) and anything under xml:space="preserve" stay exactly as written.' },
    { q: 'Why is &nbsp; an “unknown entity”?', a: 'XML predefines only five entities: &amp; &lt; &gt; &quot; and &apos;. Write a no-break space as &#160;, or declare the entity in a DOCTYPE.' },
  ],
  example: {
    intro: 'A small order document on one line.',
    inputLabel: 'xml',
    input: '<?xml version="1.0"?><order id="7"><customer>Ada</customer><items><item sku="A1" qty="2"/><item sku="B2" qty="1"/></items><note>Leave at the  door</note></order>',
    outputLabel: 'formatted',
    output:
      '<?xml version="1.0"?>\n<order id="7">\n  <customer>Ada</customer>\n  <items>\n    <item sku="A1" qty="2"/>\n    <item sku="B2" qty="1"/>\n  </items>\n  <note>Leave at the  door</note>\n</order>\n',
    note: 'The double space in the note is text, so it stays.',
  },
  mistakes: [
    { title: 'A bare ampersand', body: '“Tom & Jerry” must be “Tom &amp; Jerry”. Watch for it in URLs inside attributes: ?a=1&amp;b=2.' },
    { title: 'HTML entities in XML', body: '&nbsp;, &copy; and the like aren’t defined in XML. Use numeric references such as &#160; and &#169;.' },
    { title: 'Two root elements', body: 'A document can have only one top-level element. Wrap a list of records in a single parent such as <items>.' },
    { title: 'Tags that differ only in case', body: 'XML names are case-sensitive, so <Item>…</item> is a mismatch, not a match.' },
  ],
  related: ['code-beautifier', 'html-beautifier', 'json-formatter', 'yaml-validator'],
};

export default content;
