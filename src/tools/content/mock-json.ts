import type { ToolContent } from '../content';

const content: ToolContent = {
  h1: 'Mock data generator',
  lede: 'Generate fake JSON test data: names, emails, phone numbers, dates, IDs, prices and more. Pick the fields and the number of rows, then copy or download. Runs in your browser.',
  steps: [
    { title: 'Choose your fields', body: 'Give each field a key name and a type. Add, remove and reorder fields; number fields take a range and "one of a list" takes your own choices. Your fields are remembered in this browser.' },
    { title: 'Set rows and a seed', body: 'Pick up to 10,000 rows. Leave the seed empty for new data each time, or type any text to get the same data again whenever you use that seed.' },
    { title: 'Copy or download', body: 'Get a pretty or minified JSON array, JSON Lines (one object per line) or CSV.' },
  ],
  faq: [
    {
      q: 'Could the emails or phone numbers belong to real people?',
      a: 'The emails only use example.com, example.org and example.net, domains reserved for examples and documentation. Phone numbers use 555-0100 to 555-0199, a range set aside for fiction in North America. IP addresses come from the ranges reserved for documentation: 192.0.2.x, 198.51.100.x and 203.0.113.x.',
    },
    {
      q: 'What does the seed do?',
      a: 'The same seed with the same fields and row count always gives the same data, so tests and screenshots can be repeated. Past dates count back from today, so they shift by a day each day.',
    },
    {
      q: 'Do the name, email and username match?',
      a: 'Yes. Within one row, the first name, last name, full name, email and username all come from the same made-up person.',
    },
    {
      q: 'Is the data random enough for security testing?',
      a: 'No. It uses a small, fast generator meant for test data, and the UUIDs are shaped like version 4 UUIDs but aren’t cryptographically random. Use the UUID or password generators when that matters.',
    },
    { q: 'Is anything sent to a server?', a: 'No. The data is made in this tab from small built-in word lists.' },
  ],
  example: {
    intro: 'Four fields, two rows, with the seed set to demo. Run it with the same fields and seed and you get exactly these rows.',
    inputLabel: 'fields',
    input: 'id: ID (1, 2, 3…)\nname: Full name\nemail: Email\nactive: Boolean\nrows: 2, seed: demo',
    outputLabel: 'json',
    output:
      '[\n  {\n    "id": 1,\n    "name": "Uma Dunn",\n    "email": "uma.dunn6@example.org",\n    "active": true\n  },\n  {\n    "id": 2,\n    "name": "Victor Brooks",\n    "email": "victor.brooks98@example.com",\n    "active": false\n  }\n]\n',
  },
  mistakes: [
    { title: 'Using real-looking contact details', body: 'Made-up emails on real domains can reach real inboxes if a test sends mail. Stick to the example.com family, as this tool does.' },
    { title: 'Two fields with the same key', body: 'Only the last one shows up in each object. The tool warns when a key is used twice.' },
    { title: 'Testing with tiny data only', body: 'Three rows hide paging, sorting and performance problems. Generate a few thousand rows as well.' },
    { title: 'Forgetting the seed', body: 'Without a seed, every run is different, so a failing test may not fail again. Set a seed when you need to reproduce something.' },
  ],
  related: ['uuid-generator', 'json-formatter', 'json-to-csv', 'lorem-ipsum'],
};

export default content;
