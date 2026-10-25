import type { ToolContent } from '../content';

const content: ToolContent = {
  h1: 'Email extractor',
  lede: 'Pull every email address out of pasted text, HTML, CSV or a dropped file. Duplicates are removed, and you can sort, filter by domain and pick how they’re separated.',
  steps: [
    { title: 'Paste text or drop a file', body: 'Emails, web pages, spreadsheets exported as CSV, logs: anything with addresses in it. mailto: links and addresses in angle brackets are picked up too.' },
    { title: 'Set the options', body: 'Remove duplicates, sort A–Z, keep only certain domains, or lowercase everything. The count updates as you go.' },
    { title: 'Copy or download', body: 'One address per line, or separated by commas or semicolons for pasting into a To: field.' },
  ],
  faq: [
    { q: 'Which addresses does it find?', a: 'Anything shaped like name@domain.tld, including plus addressing (ada+news@example.com), subdomains and international addresses such as josé@exämple.de. It needs a dot in the domain, so user@localhost is skipped, and file names like logo@2x.png are left out.' },
    { q: 'How are duplicates detected?', a: 'The domain is compared without regard to case, so Ada@Example.COM and Ada@example.com count once. The part before the @ is compared exactly, because some mail servers treat it as case-sensitive. Turn on Lowercase to merge those too.' },
    { q: 'Does it check that the addresses work?', a: 'No. It finds text that looks like an address; it can’t tell whether a mailbox exists. That would need a network request, and this page never makes one.' },
    { q: 'Are quoted or obfuscated addresses found?', a: 'No. Rare forms like "john smith"@example.com, and hidden ones like ada [at] example [dot] com, are not picked up.' },
  ],
  example: {
    intro: 'Mixed text with a mailto link, a repeat in different case and trailing punctuation.',
    inputLabel: 'text',
    input: 'Contact Ada <ada@example.com> or <a href="mailto:grace@navy.example.org?subject=Hi">Grace</a>.\nCc: ADA@EXAMPLE.COM, alan.turing+ml@uni.example.ac.uk.',
    outputLabel: 'emails',
    output: 'ada@example.com\ngrace@navy.example.org\nADA@example.com\nalan.turing+ml@uni.example.ac.uk',
    note: 'ADA@example.com is kept as a separate address because the part before the @ differs in case. Turn on Lowercase to merge it with ada@example.com.',
  },
  mistakes: [
    { title: 'Sending to scraped lists', body: 'Addresses copied from web pages often belong to people who never asked to hear from you. Only email people who agreed to it.' },
    { title: 'Assuming every match is real', body: 'Text that looks like an address can still be a typo, a placeholder like name@example.com, or a mailbox that no longer exists.' },
    { title: 'Merging case in the local part without thinking', body: 'Most providers ignore case before the @, but not all. Lowercasing is usually safe for lists you send to, less so for records you keep.' },
    { title: 'Pasting a comma list into a field that wants semicolons', body: 'Some mail apps, Outlook among them, expect addresses separated by semicolons. Switch the separator before you copy.' },
  ],
  related: ['line-cleaner', 'list-to-sql', 'regex-tester', 'word-counter'],
};

export default content;
