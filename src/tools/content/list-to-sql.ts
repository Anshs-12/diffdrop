import type { ToolContent } from '../content';

const content: ToolContent = {
  h1: 'List to SQL IN',
  lede: 'Turn a column of values into a SQL IN list, like IN (\'a\', \'b\'), or into one comma-separated line, and split a line back into a list. Quotes are escaped and duplicates removed. Runs in your browser.',
  steps: [
    { title: 'Paste one value per line', body: 'Copy a column from a spreadsheet, a query result or a log. To go the other way, pick Split line and paste a comma-separated line or an IN list.' },
    {
      title: 'Choose quotes and layout',
      body: 'Single quotes for text, none for numbers (the tool suggests it when every value is a number), or double quotes. Choose whether to wrap the list in IN ( … ) and how many values go on each line.',
    },
    { title: 'Copy it into your query', body: 'Copy the result or download it. Values are trimmed, empty lines skipped and duplicates removed unless you turn those off.' },
  ],
  faq: [
    {
      q: 'How are apostrophes handled?',
      a: 'With Escape quotes on, a quote inside a value is doubled, which is how standard SQL writes it: O\'Brien becomes \'O\'\'Brien\'. Backslashes are left as they are.',
    },
    {
      q: 'Single or double quotes?',
      a: 'Use single quotes for text values; that works in every major database. In standard SQL and PostgreSQL, double quotes name columns and tables instead, so "abc" means a column called abc. MySQL treats double quotes as strings unless ANSI_QUOTES is set.',
    },
    {
      q: 'Is there a limit on how many values an IN list can have?',
      a: 'The tool has no limit, but databases do. Oracle allows at most 1,000 expressions in one IN list. For long lists, a temporary table or a join is often faster and clearer.',
    },
    {
      q: 'Can it turn an IN list back into lines?',
      a: 'Yes. Pick Split line and paste the list. A surrounding IN ( … ) is ignored, quoted values may contain commas, and with Remove quotes on, \'O\'\'Brien\' comes back as O\'Brien.',
    },
    { q: 'Is my list uploaded?', a: 'No. It’s converted in this tab and never sent anywhere.' },
  ],
  example: {
    intro: 'The apostrophe in O\'Brien is doubled, the repeated line is dropped, and accented text passes through unchanged.',
    inputLabel: 'lines',
    input: "O'Brien\nZoë\nsmith\nO'Brien\n",
    outputLabel: 'sql',
    output: "IN ('O''Brien', 'Zoë', 'smith')",
  },
  mistakes: [
    { title: 'Pasting untrusted values into production SQL', body: 'Escaping quotes isn’t a defence against SQL injection. For anything that runs in an app, use parameterized queries; this tool is for quick ad-hoc queries.' },
    { title: 'Quoting numbers', body: 'IN (\'1\', \'2\') compares text with numbers, which some databases convert and others reject, and it can stop an index being used. Use no quotes for numeric IDs.' },
    { title: 'An empty IN list', body: 'IN () isn’t valid SQL, so the tool gives no output until there’s at least one value.' },
    { title: 'Hidden spaces', body: 'Values copied from spreadsheets often end in a space or tab, and \'abc \' won’t match \'abc\'. Keep Trim on.' },
  ],
  related: ['line-cleaner', 'sql-formatter', 'json-to-csv'],
};

export default content;
