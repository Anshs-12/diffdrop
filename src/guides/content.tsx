import React from 'react';
import { REPO_URL } from '@/site';
import ToolLink from './ToolLink';
import ContactCard from './ContactCard';
import { GUIDE_META, type GuideId } from './meta';

export type { GuideId } from './meta';

export interface Guide {
  h1: string;
  lede: string;
  published: string;
  body: React.ReactNode;
}

const Code: React.FC<{ children: string }> = ({ children }) => <pre>{children}</pre>;

export const GUIDES: Record<GuideId, Guide> = {
  'guide-compare-json': {
    ...GUIDE_META['guide-compare-json'],
    body: (
      <>
        <p>
          You have two versions of a JSON file: an API response before and after a deploy, two config files, or a translation
          file from two branches. You want to know what changed. Pasting both into a text diff seems obvious, but it usually
          shows far more “changes” than there really are.
        </p>

        <h2>Why a plain diff of JSON misleads</h2>
        <p>JSON has two kinds of differences that don’t change the data at all:</p>
        <ul>
          <li>
            <strong>Key order.</strong> <code>{'{"a":1,"b":2}'}</code> and <code>{'{"b":2,"a":1}'}</code> are the same object.
            Serializers, databases and languages reorder keys freely, so two equal objects can look completely different line by
            line.
          </li>
          <li>
            <strong>Formatting.</strong> Minified JSON is one long line; pretty-printed JSON spreads the same data over hundreds.
            Indentation (2 spaces, 4 spaces, tabs) and spacing differ between tools.
          </li>
        </ul>
        <p>
          A line diff treats both as changes. Compare a minified response with a pretty-printed one and every line differs, which
          hides the one value you were looking for.
        </p>

        <h2>The fix: normalize first, then diff</h2>
        <p>Make both sides look the same wherever the data is the same, then compare:</p>
        <ol>
          <li>
            <strong>Pretty-print both</strong> with the same indentation, so each key and value sits on its own line.
          </li>
          <li>
            <strong>Sort keys</strong> alphabetically, recursively, in every object. Equal objects now have identical lines.
          </li>
          <li>
            <strong>Keep array order.</strong> Arrays are ordered in JSON: <code>[1,2]</code> and <code>[2,1]</code> really are
            different, so they must not be sorted.
          </li>
          <li>
            <strong>Diff the result</strong> line by line, with changed values marked word by word.
          </li>
        </ol>
        <p>The JSON diff does all four with one click on “Format JSON &amp; sort keys”, in your browser:</p>
        <ToolLink id="json-diff" />

        <h2>Doing it on the command line</h2>
        <p>
          With <code>jq</code> installed, <code>-S</code> sorts keys and the output is pretty-printed, so this gives the same
          normalized comparison:
        </p>
        <Code>{`diff <(jq -S . old.json) <(jq -S . new.json)`}</Code>
        <p>In Python, the same idea:</p>
        <Code>{`import json

def normalize(path):
    with open(path) as f:
        return json.dumps(json.load(f), indent=2, sort_keys=True).splitlines()

import difflib
print("\\n".join(difflib.unified_diff(normalize("old.json"), normalize("new.json"), lineterm="")))`}</Code>

        <h2>Reading the result</h2>
        <ul>
          <li>
            <strong>A changed value</strong> shows as a modified line, with the old and new value highlighted inside it.
          </li>
          <li>
            <strong>An added key</strong> is a green line on the right only; <strong>a removed key</strong> is a red line on the
            left only.
          </li>
          <li>
            <strong>A moved array item</strong> shows as removed in one place and added in another, because arrays are ordered.
          </li>
          <li>
            <strong>Type changes</strong> are real changes: <code>"42"</code> (a string) is not <code>42</code> (a number).
          </li>
        </ul>

        <h2>Common problems</h2>
        <h3>One file isn’t valid JSON</h3>
        <p>
          Trailing commas, comments and single quotes are allowed in JavaScript but not in JSON, and they stop any JSON-aware
          comparison. The validator shows the exact line and column:
        </p>
        <ToolLink id="json-validator" />
        <h3>Big numbers change</h3>
        <p>
          IDs like <code>12345678901234567890</code> are larger than JavaScript numbers can hold exactly, so many tools quietly
          round them, and the rounding then shows up as a change, or worse, hides one. toolspace keeps numbers exactly as written.
        </p>
        <h3>Duplicate keys</h3>
        <p>
          <code>{'{"id":1,"id":2}'}</code> is technically allowed, but parsers keep only the last value, so a duplicate can hide
          data. The formatter and validator warn about them.
        </p>
        <h3>Private data</h3>
        <p>
          API responses often hold tokens or customer data. Online tools that upload your JSON to a server put that data at risk.
          Every toolspace tool runs in your browser, and the page is blocked from sending data anywhere.
        </p>
      </>
    ),
  },

  'guide-json-to-csv': {
    ...GUIDE_META['guide-json-to-csv'],
    body: (
      <>
        <p>
          CSV is a table: rows and columns of plain values. JSON is a tree: objects inside objects, lists inside lists. Converting
          one to the other means deciding how the tree becomes a table, and then getting past a few Excel quirks. This guide
          covers both.
        </p>

        <h2>1. Start from an array of objects</h2>
        <p>The natural shape is an array where each object becomes a row and each key a column:</p>
        <Code>{`[
  { "id": 1, "name": "Ada",   "city": "London" },
  { "id": 2, "name": "Grace", "city": "Arlington" }
]`}</Code>
        <Code>{`id,name,city
1,Ada,London
2,Grace,Arlington`}</Code>
        <p>
          API responses often wrap the array, as in <code>{'{"data": [...], "total": 2}'}</code>. Use the inner array. The
          converter does this automatically when an object holds exactly one array of objects.
        </p>
        <p>
          If objects have different keys, the columns are the union of all keys, in the order first seen, and missing values are
          left empty.
        </p>

        <h2>2. Flatten nested objects into dotted columns</h2>
        <p>
          A nested object becomes several columns named by their path. <code>{'{"address": {"city": "London", "zip": "N1"}}'}</code>{' '}
          becomes the columns <code>address.city</code> and <code>address.zip</code>. This keeps every value in its own cell, so
          you can sort and filter by it.
        </p>
        <p>
          Watch for collisions: a key that already contains a dot, like <code>{'"address.city"'}</code>, would land in the same
          column as the nested path. A careful converter keeps both, naming the second <code>address.city (2)</code>.
        </p>

        <h2>3. Decide what to do with arrays</h2>
        <p>Lists inside a row don’t fit one cell. There are three common choices:</p>
        <ul>
          <li>
            <strong>Keep them as JSON text in one cell</strong>, like <code>["admin","editor"]</code>. No data is lost and the row
            count stays the same. This is the default here.
          </li>
          <li>
            <strong>Spread them over columns</strong> (<code>roles.0</code>, <code>roles.1</code>). Works for short, fixed-length
            lists; awkward when lengths vary.
          </li>
          <li>
            <strong>One row per item</strong>, repeating the parent’s values. Good for analysis (each order line as a row), but
            the table gets longer and totals double-count.
          </li>
        </ul>

        <h2>4. Make Excel read it correctly</h2>
        <h3>Accents and emoji: UTF-8 with a BOM</h3>
        <p>
          Excel opens a plain UTF-8 CSV as if it were in an old Windows encoding, so <code>Zürich</code> turns into{' '}
          <code>ZÃ¼rich</code>. Starting the file with a byte order mark (the bytes <code>EF BB BF</code>) tells Excel it’s
          UTF-8. Google Sheets and Numbers handle either.
        </p>
        <h3>Commas or semicolons</h3>
        <p>
          In countries that write decimals with a comma (much of Europe and South America), Excel expects semicolons between
          columns. If everything lands in column A, export with a semicolon delimiter, or tab-separated.
        </p>
        <h3>Quoting</h3>
        <p>
          Cells that contain the delimiter, quotes or line breaks must be wrapped in double quotes, with inner quotes doubled
          (RFC 4180): <code>"She said ""hi"""</code>.
        </p>
        <h3>Long numbers and leading zeros</h3>
        <p>
          Excel turns <code>12345678901234567890</code> into <code>1.23457E+19</code> and drops leading zeros from postcodes and
          phone numbers. Import through Data → From Text/CSV and set those columns to Text to keep them.
        </p>

        <h2>5. Don’t let a cell run as a formula</h2>
        <p>
          A cell starting with <code>=</code>, <code>+</code>, <code>-</code> or <code>@</code> can run as a formula when the CSV
          is opened, and a formula like <code>=HYPERLINK(...)</code> from untrusted data can mislead whoever opens the file (CSV
          injection). Prefixing such cells with a single quote makes Excel show them as text. The converter does this by default
          (“Escape formulas”); turn it off if you need the raw values.
        </p>

        <h2>Do it in one step</h2>
        <p>
          The JSON to CSV converter flattens nested objects, keeps arrays as JSON, unwraps API responses, adds the BOM and escapes
          formulas, all in your browser:
        </p>
        <ToolLink id="json-to-csv" />
        <p>
          Check the JSON is valid first if the converter reports an error, or explore its structure to decide what should become
          rows:
        </p>
        <div className="flex flex-wrap gap-2">
          <ToolLink id="json-validator" />
          <ToolLink id="json-viewer" />
        </div>

        <h2>On the command line</h2>
        <p>
          For a flat array, <code>jq</code> can write CSV directly (you choose the columns):
        </p>
        <Code>{`jq -r '(.[0] | keys_unsorted) as $k | $k, (.[] | [.[$k[]]]) | @csv' data.json > data.csv`}</Code>
        <p>
          With pandas, <code>json_normalize</code> flattens nested objects into dotted columns, and <code>utf-8-sig</code> adds
          the BOM for Excel:
        </p>
        <Code>{`import json, pandas as pd

with open("data.json") as f:
    df = pd.json_normalize(json.load(f))
df.to_csv("data.csv", index=False, encoding="utf-8-sig")`}</Code>
      </>
    ),
  },
  'about': {
    ...GUIDE_META['about'],
    body: (
      <>
        <p>
          toolspace is a set of everyday developer tools: a diff checker, JSON tools, encoders and decoders, text and code
          tools, generators and more. They are free to use, with no account and no usage limits, and the code is open source.
        </p>

        <details open>
          <summary>Your data stays on your device</summary>
          <p>
            Every tool does its work in your browser. The text you paste, the files you open, and the tokens, passwords and
            colors you work with are processed in the tab and never sent to a server. Close the tab and they are gone.
          </p>
          <p>
            Files are read locally and never uploaded. Share links in the diff checker keep both texts in the part of the
            address after #, which browsers never send to any server.
          </p>
        </details>

        <details>
          <summary>How can it be free?</summary>
          <p>
            Because the work happens on your device, there are no servers doing it and no per-use cost to recover. The site is
            a set of static files, so running it costs very little, and every tool stays free with no paid plan.
          </p>
        </details>

        <details>
          <summary>Open source</summary>
          <p>
            The code is MIT licensed. You can read it, run your own copy, or contribute a fix or a new tool{' '}
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
              on GitHub
            </a>
            .
          </p>
        </details>

        <details>
          <summary>Get in touch</summary>
          <p>
            Questions, bugs or ideas for a new tool are welcome on the <a href="/contact/">contact page</a>.
          </p>
        </details>
      </>
    ),
  },
  contact: {
    ...GUIDE_META.contact,
    body: (
      <>
        <ContactCard />
        <h2>Report a bug or suggest a tool</h2>
        <p>
          For bugs and tool ideas, a GitHub issue is best: others can see it, add details and follow along. Please include what
          you did, what you expected and what happened instead.
        </p>
        <p>
          <a href={`${REPO_URL}/issues`} target="_blank" rel="noopener noreferrer">
            Open an issue on GitHub
          </a>
        </p>
        <h2>No forms</h2>
        <p>
          There is no contact form: email goes from your own mail app. What you paste into the tools always stays in your
          browser; see <a href="/about/">about toolspace</a>.
        </p>
      </>
    ),
  },
};
