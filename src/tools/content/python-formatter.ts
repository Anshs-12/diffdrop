import type { ToolContent } from '../content';

const content: ToolContent = {
  h1: 'Python formatter',
  lede: 'Format Python in the Black style with Ruff’s formatter, compiled to WebAssembly and running in your browser. Choose line length, quotes and indentation; syntax errors are shown with their line.',
  steps: [
    { title: 'Paste Python', body: 'A function, a script or a module. Open or drop a .py file; nothing is uploaded.' },
    { title: 'Choose the options', body: '“Default” is 4 spaces, as PEP 8 recommends. Set the line length (80, 100 or 120; Black’s own default is 88) and single or double quotes.' },
    { title: 'Read any error', body: 'Code that doesn’t parse isn’t formatted: you get the error and a button that jumps to its line.' },
  ],
  faq: [
    { q: 'Is this the same as Black?', a: 'Ruff’s formatter is built as a drop-in replacement for Black and gives the same output on almost all code. The few differences are documented by the Ruff project and rarely show up in everyday code.' },
    { q: 'Does it sort imports or fix lint errors?', a: 'No. It only formats. Sorting imports and fixing lint findings are separate Ruff commands (ruff check --fix) that don’t run here.' },
    { q: 'Why is a line still longer than the limit?', a: 'Like Black, Ruff doesn’t split long strings or comments, and a single long name can’t be broken. Those lines stay over the limit.' },
    { q: 'Which Python syntax is supported?', a: 'Current Python 3: type hints, f-strings, async and await, decorators, dataclasses, match statements and the walrus operator.' },
  ],
  mistakes: [
    { title: 'Pasting from an interactive session', body: 'Lines starting with >>> or In [1]: aren’t Python. Remove the prompts and the printed output first.' },
    { title: 'Mixing tabs and spaces', body: 'Python rejects indentation that mixes the two inconsistently, so the formatter reports it as an error. Re-indent the block, then format.' },
    { title: 'Being surprised by the magic trailing comma', body: 'A comma after the last item keeps a call, list or dict split one item per line. Remove the comma if you want it joined onto one line.' },
    { title: 'Expecting a linter', body: 'Unused imports, undefined names and bugs pass through untouched. Formatting only changes layout.' },
  ],
  related: ['code-beautifier', 'sql-formatter', 'json-formatter', 'regex-tester'],
};

export default content;
