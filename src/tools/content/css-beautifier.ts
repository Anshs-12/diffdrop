import type { ToolContent } from '../content';

const content: ToolContent = {
  h1: 'CSS beautifier',
  lede: 'Beautify CSS with Prettier, one declaration per line, or switch to Minify for a single compact line ready to ship. SCSS nesting and variables are understood, and syntax errors are reported with their line.',
  steps: [
    { title: 'Paste your stylesheet', body: 'Minified CSS from a site, a messy file, or SCSS. Open or drop a .css or .scss file to read it locally.' },
    { title: 'Format or minify', body: 'Format indents rules and puts each declaration on its own line. Minify removes comments and every space that doesn’t matter.' },
    { title: 'Compare the size', body: 'The status line shows the size before and after minifying, so you can see what you saved.' },
  ],
  faq: [
    { q: 'What exactly does Minify remove?', a: 'Comments (except /*! … */ licence comments), line breaks, indentation, spaces around braces, semicolons, commas and selector combinators (> + ~), spaces after colons, and the last semicolon in each block. Strings, url() values and the spaces around + and - inside calc() stay, because removing them would change or break the CSS.' },
    { q: 'Does minifying shorten colors or merge rules?', a: 'No. It only removes whitespace and comments, so the result behaves exactly like the original. Optimizers such as cssnano or Lightning CSS go further, with more risk.' },
    { q: 'Does it validate my CSS?', a: 'It catches syntax errors, like a block that is never closed, and shows the line. It doesn’t check whether property names or values exist.' },
    { q: 'Does it work with SCSS?', a: 'Yes. The SCSS parser also reads plain CSS, so nesting, $variables, @mixin and @include format as expected.' },
  ],
  example: {
    intro: 'Minify mode on a small rule set. The spaces inside calc() and before :focus-visible are kept on purpose.',
    inputLabel: 'css',
    input: '/* buttons */\n.btn {\n  padding: 8px 12px;\n  width: calc(100% - 16px);\n}\n\n.toolbar :focus-visible {\n  outline: 2px solid currentColor;\n}\n',
    outputLabel: 'minified',
    output: '.btn{padding:8px 12px;width:calc(100% - 16px)}.toolbar :focus-visible{outline:2px solid currentColor}',
    note: '“.toolbar :focus-visible” (any focused element inside the toolbar) and “.toolbar:focus-visible” (the toolbar itself) are different selectors, so that space stays.',
  },
  mistakes: [
    { title: 'Minifying the only copy', body: 'Keep the readable file as your source and minify when you publish. Editing minified CSS by hand is slow and error-prone.' },
    { title: 'Removing spaces in calc() by hand', body: 'calc(100%-16px) is invalid: + and - need a space on both sides. The minifier keeps them.' },
    { title: 'One missing closing brace', body: 'A block left open swallows every rule after it, so styles break far from the real mistake. The formatter points to where the block began.' },
    { title: 'An accidental space before a pseudo-class', body: '“.btn :hover” styles hovered elements inside the button, not the hovered button. Formatting keeps that space, so check it when a hover style seems ignored.' },
  ],
  related: ['code-beautifier', 'html-beautifier', 'css-gradient', 'color-converter'],
};

export default content;
