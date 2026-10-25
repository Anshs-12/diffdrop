import type { ToolContent } from '../content';

const content: ToolContent = {
  h1: 'JavaScript beautifier',
  lede: 'Beautify minified or messy JavaScript with Prettier: indentation, quotes, semicolons and line breaks made consistent. JSX, async code, optional chaining and private class fields are all understood.',
  steps: [
    { title: 'Paste JavaScript', body: 'One line of minified code or a whole module. Open or drop a .js, .mjs or .jsx file to read it locally.' },
    { title: 'Set the style', body: 'Indentation, a line width of 80, 100 or 120, and single or double quotes. Everything else follows Prettier’s defaults.' },
    { title: 'Copy the result', body: 'The output updates as you type. A syntax error is shown with its line and column, with a button that jumps to it.' },
  ],
  faq: [
    { q: 'Can it make a minified bundle readable?', a: 'It restores line breaks and indentation, so the structure becomes readable. Names a minifier shortened to a, b or c stay short; they can’t be recovered from the code alone.' },
    { q: 'Can it minify JavaScript?', a: 'No. Prettier only formats, and shrinking JavaScript safely needs a full minifier such as Terser or esbuild, which this page doesn’t include. Your build tool does this better.' },
    { q: 'Which Prettier settings are used?', a: 'Prettier 3’s defaults (semicolons on, trailing commas where valid) plus the indentation, line width and quote style you pick here. The output matches running Prettier with the same options.' },
    { q: 'What about TypeScript?', a: 'Choose TypeScript in the language list, or use the code beautifier. Types, interfaces and generics are formatted by the same Prettier TypeScript parser.' },
  ],
  example: {
    intro: 'A one-line snippet, as you might copy it out of a minified file.',
    inputLabel: 'javascript',
    input: 'const total=items.filter(i=>i.inStock).reduce((sum,i)=>sum+i.price*i.qty,0);console.log(`Total: ${total}`)',
    outputLabel: 'formatted',
    output: 'const total = items\n  .filter((i) => i.inStock)\n  .reduce((sum, i) => sum + i.price * i.qty, 0);\nconsole.log(`Total: ${total}`);\n',
  },
  mistakes: [
    { title: 'Pasting code that doesn’t parse', body: 'Prettier needs valid syntax. A missing bracket stops it, and the status line shows where; fix that line and the rest formats.' },
    { title: 'Fighting the line width', body: 'Prettier breaks lines to fit the width you choose. If your project uses wider lines, pick 100 or 120 instead of rewrapping by hand.' },
    { title: 'Formatting JSON as JavaScript', body: 'JSON formats here too, but the JSON formatter keeps numbers exactly and validates the file. Use it for data.' },
    { title: 'Beautifying code you don’t trust', body: 'Readable code is still code. Formatting never runs it, but don’t paste the result into a console to “see what it does”.' },
  ],
  related: ['code-beautifier', 'json-formatter', 'html-beautifier', 'regex-tester'],
};

export default content;
