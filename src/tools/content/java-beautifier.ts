import type { ToolContent } from '../content';

const content: ToolContent = {
  h1: 'Java beautifier',
  lede: 'Format Java code with clang-format: braces, spacing, indentation and line breaks made consistent across classes, records, lambdas and switch expressions. Paste a method or a whole file; it never leaves your browser.',
  steps: [
    { title: 'Paste your Java', body: 'A snippet, a class or a whole .java file. You can also open or drop the file onto the editor.' },
    { title: 'Pick indentation and width', body: '“Default” is 4 spaces in a Google-based style. Choose 2 spaces to match google-java-format, or tabs, and a line width of 80, 100 or 120.' },
    { title: 'Copy the formatted code', body: 'The result updates as you type. If a brace, bracket or string is left open, you get its line instead of a mangled file.' },
  ],
  faq: [
    { q: 'Which formatter does this use?', a: 'clang-format, the LLVM project’s formatter, which also formats Java. It runs here as WebAssembly, so the code is formatted on your machine.' },
    { q: 'Is the output the same as google-java-format?', a: 'Close, but not identical. google-java-format is a Java program and can’t run in a browser. Both put braces on the same line and wrap long chains; google-java-format indents with 2 spaces, so pick 2 spaces for the nearest match.' },
    { q: 'Does it check that my code compiles?', a: 'No. Before formatting it checks that braces, brackets, parentheses, strings, text blocks and comments are all closed, and points to the line when one isn’t. Type errors and missing semicolons aren’t detected.' },
    { q: 'Does it support records, sealed classes and switch expressions?', a: 'Yes. Records, pattern matching in switch, arrow cases, text blocks, var and lambdas all format. Text block contents are left exactly as written.' },
  ],
  mistakes: [
    { title: 'Reformatting a file inside a feature change', body: 'Formatting touches nearly every line, which buries the real change in a review. Format in its own commit, then make the change.' },
    { title: 'Pasting half a method', body: 'A snippet that stops mid-block has an unclosed brace. The beautifier reports it rather than guessing; paste whole blocks.' },
    { title: 'Mixing indentation styles in one project', body: 'Pick one setting for the team. Default (4 spaces) matches most Java codebases; Google’s style guide uses 2.' },
    { title: 'Expecting it to fix compile errors', body: 'A formatter only moves whitespace. Missing semicolons, wrong types and unknown names still need your compiler or IDE.' },
  ],
  related: ['code-beautifier', 'javascript-beautifier', 'diff-checker', 'json-formatter'],
};

export default content;
