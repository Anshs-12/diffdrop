import type { ToolContent } from '../content';

const content: ToolContent = {
  h1: 'JSON to TypeScript',
  lede: 'Paste a JSON sample and get TypeScript interfaces, type aliases or a Zod schema to start from. Nested objects get their own named types. It all runs in your browser.',
  steps: [
    { title: 'Paste a JSON sample', body: 'An API response, a config file or a fixture. Open a .json file or drop it on the left; it’s read on your machine and never uploaded.' },
    {
      title: 'Pick the output',
      body: 'Interfaces, type aliases or a Zod schema, with the root name you choose. Turn export and readonly on or off. Nested objects become their own named types, named after their key.',
    },
    { title: 'Review, then copy or download', body: 'Check the result against what your data can really hold, then copy it or save it as a .ts file.' },
  ],
  faq: [
    {
      q: 'How does it decide a field is optional?',
      a: 'Only from arrays. When an array holds several objects, their keys are merged: a key that appears in some elements but not others is marked optional (?: in TypeScript, .optional() in Zod). A single object can’t show that, so every key in it is required.',
    },
    {
      q: 'What happens to null, empty arrays and mixed arrays?',
      a: 'A value that is only ever null is typed null. Null next to other values makes a union such as string | null (or .nullable() in Zod). An empty array is unknown[], because the sample says nothing about its items, and an array of mixed values becomes a union like (string | number)[].',
    },
    {
      q: 'Why are some keys in quotes?',
      a: 'Keys that aren’t valid JavaScript identifiers, like "first-name", "2fa" or "a b", have to be quoted in a TypeScript type or a Zod object. Keys made of letters in any script, digits (not first), $ and _ stay bare.',
    },
    {
      q: 'Does the Zod schema need a particular version?',
      a: 'It uses z.object, z.array, z.union, z.record, z.unknown, .nullable() and .optional(), which exist in both Zod 3 and Zod 4. Schemas for nested objects are declared before the ones that use them.',
    },
    { q: 'Is my JSON uploaded?', a: 'No. The types are worked out in this tab, and nothing is sent anywhere.' },
  ],
  example: {
    intro: 'The second team member has an email and no lead flag, so both keys become optional. The empty tags array can’t say what it holds, so it stays unknown[].',
    inputLabel: 'json',
    input: '{\n  "id": 7,\n  "name": "Ada",\n  "manager": null,\n  "tags": [],\n  "team": [\n    { "id": 1, "lead": true },\n    { "id": 2, "email": "kofi@example.com" }\n  ]\n}',
    outputLabel: 'typescript',
    output:
      'export interface Root {\n  id: number;\n  name: string;\n  manager: null;\n  tags: unknown[];\n  team: TeamItem[];\n}\n\nexport interface TeamItem {\n  id: number;\n  lead?: boolean;\n  email?: string;\n}\n',
    note: 'manager is typed null because null is all the sample shows. If it can also hold a person, change it by hand, for example to Person | null.',
  },
  mistakes: [
    { title: 'Trusting one sample', body: 'One response can’t show every case. A field that happens to be present may be optional, and a string may only ever hold a few values. Read the types before you rely on them.' },
    { title: 'Leaving null as null', body: 'A field that was null in the sample is typed null, which rejects every real value. Replace it with the type it holds when it’s set, plus | null.' },
    { title: 'Leaving unknown[] in place', body: 'An empty array gives no clue about its items. Paste a sample where it has at least one item, or write the item type yourself.' },
    { title: 'Using the types as validation', body: 'TypeScript types disappear at runtime, so they can’t check data from an API. Use the Zod output, or another runtime check, for data you don’t control.' },
  ],
  related: ['json-formatter', 'json-validator', 'json-to-yaml', 'mock-json'],
};

export default content;
