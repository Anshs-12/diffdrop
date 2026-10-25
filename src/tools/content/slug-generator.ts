import type { ToolContent } from '../content';

const content: ToolContent = {
  h1: 'Slug generator',
  lede: 'Turn titles into clean URL slugs: accents transliterated, emoji and punctuation dropped, words joined by dashes. Paste one title per line to make many at once.',
  steps: [
    { title: 'Paste your titles', body: 'One per line. Each line becomes one slug, and blank lines stay blank so the lists line up.' },
    { title: 'Set the options', body: 'Dash or underscore, lowercase on or off, a maximum length that cuts at a word boundary, and optionally drop short words like “the” and “of”.' },
    { title: 'Copy or download', body: 'Copy the slugs or download them as a text file, one per line.' },
  ],
  faq: [
    { q: 'What is a URL slug?', a: 'The readable part of a web address that names a page, like how-to-bake-bread in example.com/blog/how-to-bake-bread.' },
    { q: 'How are accents and special letters handled?', a: 'Accented letters lose their accents (é → e, ñ → n), and letters that don’t decompose are spelled out: ß → ss, æ → ae, ø → o, ł → l, đ → d. An ampersand becomes “and”.' },
    { q: 'What happens to Cyrillic, Greek or Chinese text?', a: 'Letters from other alphabets are kept as they are, since browsers support them in addresses. They are not transliterated to Latin letters.' },
    { q: 'Dashes or underscores?', a: 'Dashes are the common choice for web pages, and they read as word breaks. Underscores are more usual in file names and code identifiers.' },
    { q: 'Should I remove stop words?', a: 'It makes slugs shorter, for example the-art-of-the-deal becomes art-deal. It can also change the meaning, so check the result. If a title is only stop words, they are kept.' },
  ],
  example: {
    intro: 'Accents, punctuation and an emoji, with the default options.',
    inputLabel: 'title',
    input: 'Crème Brûlée: A Beginner’s Guide 🍮',
    outputLabel: 'slug',
    output: 'creme-brulee-a-beginners-guide',
  },
  mistakes: [
    { title: 'Changing the slug of a published page', body: 'Old links and bookmarks will break. If you must change it, redirect the old address to the new one.' },
    { title: 'Keeping dates and numbers that will go stale', body: 'A slug like best-laptops-2025 looks old next year. Leave the year out if you plan to update the page.' },
    { title: 'Mixed case in URLs', body: 'Many servers treat /About and /about as different pages. Lowercase slugs avoid duplicate addresses.' },
    { title: 'Cutting slugs mid-word', body: 'how-to-bake-br looks broken. The maximum length here always cuts at the last whole word that fits.' },
  ],
  related: ['case-converter', 'url-encoder', 'title-case', 'line-cleaner'],
};

export default content;
