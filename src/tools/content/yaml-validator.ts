import type { ToolContent } from '../content';

const content: ToolContent = {
  h1: 'YAML validator',
  lede: 'Check YAML syntax and see exactly where it breaks, by line and column. Duplicate keys get a warning, files with several documents are supported, and the parsed result is shown as JSON. Runs in your browser.',
  steps: [
    { title: 'Paste or open your YAML', body: 'A config, a Kubernetes manifest, a CI file. Open a .yaml or .yml file or drop it on the left; it’s read on your machine and never uploaded.' },
    { title: 'Read the status line', body: 'It says whether the YAML is valid. Errors and warnings come with their line and column, and Go to line jumps the cursor there.' },
    { title: 'Check the parsed result', body: 'The right side shows what a YAML parser actually reads, as JSON. Copy or download it. A file with several documents (split by ---) becomes a JSON array.' },
  ],
  faq: [
    {
      q: 'Which YAML version does it check?',
      a: 'YAML 1.2 by default, the current version. Switch to YAML 1.1 to see how older parsers read the same file. The two differ mainly in which plain words count as booleans and how numbers with a leading 0 are read.',
    },
    {
      q: 'What is the Norway problem?',
      a: 'In YAML 1.1, unquoted yes, no, on, off, y and n (in lower, Title or UPPER case) are booleans. So a list of country codes with NO for Norway reads NO as false. YAML 1.2 keeps them as strings. In 1.2 mode the validator warns about these words so you can quote them if they’re meant as text.',
    },
    {
      q: 'Are duplicate keys an error?',
      a: 'The YAML spec says keys in one mapping must be unique, but many parsers quietly keep only one of the values. The validator shows a warning with the line of the repeated key, so you can decide which value you meant.',
    },
    {
      q: 'What about values JSON can’t hold?',
      a: '.inf and .nan become null in the JSON view, with a warning. Dates stay strings in YAML 1.2; in YAML 1.1 mode they’re read as timestamps and shown in ISO form. Aliases (*name) are expanded, and an alias that contains itself is reported instead of shown.',
    },
    { q: 'Is my YAML uploaded?', a: 'No. It’s parsed in this tab with the open-source yaml library, and nothing is sent anywhere.' },
  ],
  example: {
    intro: 'NO and on are plain words here. In YAML 1.2 they stay strings, but a YAML 1.1 parser reads them as false and true, so the validator warns about both.',
    inputLabel: 'yaml',
    input: 'country: NO\nport: 8080\nflags:\n  - on\n  - "off"\n',
    outputLabel: 'json',
    output: '{\n  "country": "NO",\n  "port": 8080,\n  "flags": [\n    "on",\n    "off"\n  ]\n}\n',
    note: '"off" is quoted, so it’s a string in every version and gets no warning.',
  },
  mistakes: [
    { title: 'Tabs for indentation', body: 'YAML doesn’t allow tabs for indentation. Use spaces, and keep items at the same level lined up.' },
    { title: 'Unquoted yes, no, on and off', body: 'Older (YAML 1.1) parsers turn them into booleans. Quote them when they’re text, like a country code or a feature name.' },
    { title: 'A colon and space inside a value', body: 'title: Part 2: the end is an error, because ": " starts a new mapping. Quote the value.' },
    { title: 'Leading zeros', body: 'In YAML 1.1, 0755 is an octal number (493). In YAML 1.2 it’s 755. Quote values like file modes or ZIP codes to keep the exact text.' },
  ],
  related: ['json-to-yaml', 'json-validator', 'json-formatter'],
};

export default content;
