import type { ToolContent } from '../content';

const content: ToolContent = {
  h1: 'JSONPath tester',
  lede: 'Run a JSONPath expression against your JSON and see every match with its exact path. It follows the RFC 9535 standard, including filters, slices, recursive descent and the standard functions.',
  steps: [
    { title: 'Paste your JSON', body: 'Paste it, open a .json file or drop one on the left. It’s parsed in your browser and errors show their line and column.' },
    { title: 'Write an expression', body: 'Start with $ and add segments: .name, [0], [*], [1:3], ..name or a filter like [?@.price < 10]. Matches update as you type, and syntax errors point to the character at fault.' },
    { title: 'Copy the matches', body: 'Show each match’s path and value, just the values or just the paths, then copy or download them as a JSON array.' },
  ],
  faq: [
    { q: 'Which JSONPath syntax does this support?', a: 'RFC 9535, the 2024 standard: $ and @, .name and [\'name\'], indexes including negative ones, [start:end:step] slices, *, .. (recursive descent), unions like [0,2] and filters with ==, !=, <, <=, >, >=, &&, || and !. The functions length(), count(), match(), search() and value() are supported too.' },
    { q: 'Why doesn’t my expression from another library work?', a: 'Older JSONPath implementations differ. Script expressions like [(@.length-1)] aren’t part of the standard (use [-1]), names in brackets need quotes, and a filter like [?(@.price < 10)] works with or without the parentheses. In comparisons, a query can only be one that picks a single value.' },
    { q: 'What is a normalized path?', a: 'A standard way of writing exactly where a match is, using only bracket notation: $[\'store\'][\'book\'][0]. Each match has one, so you can tell matches with the same value apart.' },
    { q: 'How do match() and search() work?', a: 'match() is true when the whole string matches a pattern, search() when any part does. Patterns use I-Regexp (RFC 9485), a small subset of regular expressions: no backreferences, lookarounds or lazy quantifiers, and ^ and $ are ordinary characters. An invalid pattern matches nothing, with a warning. Matching never backtracks, so a pattern can’t freeze the page.' },
    { q: 'In what order are matches listed?', a: 'In document order: array items in order and object members in the order they appear in your JSON. The standard leaves object member order open, so other tools may list them differently.' },
  ],
  example: {
    intro: 'Titles of books under 10 in the RFC’s bookstore example.',
    inputLabel: 'expression',
    input: '$.store.book[?@.price < 10].title',
    outputLabel: 'matches',
    output: "$['store']['book'][0]['title']  \"Sayings of the Century\"\n$['store']['book'][2]['title']  \"Moby Dick\"",
  },
  mistakes: [
    { title: 'Forgetting quotes in brackets', body: '$[name] is a syntax error; write $[\'name\'] or $.name. Names with spaces or dots need the bracket form.' },
    { title: 'Using = instead of ==', body: 'Filters compare with ==. A single = is an error.' },
    { title: 'Comparing a query that can match many nodes', body: '@.tags[*] == \'x\' is not allowed, because it can return several values. Filter the array instead: @.tags[?@ == \'x\'].' },
    { title: 'Expecting a string to equal a number', body: '13 == \'13\' is false. Values must have the same type to be equal, and < and > only work between two numbers or two strings.' },
  ],
  related: ['json-viewer', 'json-formatter', 'json-validator', 'regex-tester'],
};

export default content;
