# diffdrop

Everything they paywall. Free. Your text stays in your browser.

diffdrop is a diff checker that runs entirely in your browser: unlimited use,
no account, nothing uploaded. It lives at
[diffdrop.anshx12.workers.dev](https://diffdrop.anshx12.workers.dev).

## Features

- Myers O(ND) line diff (the algorithm behind `git diff`), linear-space like
  git's, run in a Web Worker
- Built for large files: 500,000 lines show up in about a second; the diff view
  and the CodeMirror editors only render what is on screen
- Highlights in the editors while you type, or a separate split / unified view
- Word- or character-level changes inside modified lines
- Ignore whitespace, case, or anything matching your own regex rules
- Syntax colors, folding of unchanged lines, line wrap
- Line-by-line merge with undo
- Export a `.patch` that `git apply` accepts, or save a PDF
- Change summary, plus an on-device AI summary in browsers that have one
- Share links that keep both texts after the `#`, so no server ever sees them

## Privacy

There is no backend. Production builds ship a Content Security Policy with
`connect-src 'none'`, so the page cannot make network requests.

## Development

```sh
npm install
npm run dev      # dev server
npm run build    # type-check and build to dist/
npm run preview  # serve the production build
```

## Testing

```sh
npm test           # unit and randomized property tests (Vitest)
npm run test:e2e   # browser tests against the production build (Playwright)
npm run test:perf  # rendering time budgets in the browser
npm run test:all   # everything
```

- **Engine**: Myers is checked against a reference LCS on 20,000 random inputs
  (every result must rebuild both sides and be minimal); generated patches are
  applied with the real `git apply`; merges must converge.
- **Browser**: diffing, split/unified, merge and undo, ignore rules, in-editor
  highlights, `.patch` download, share links, theme, and privacy checks (the
  CSP is present, no requests are made while diffing, outgoing `fetch` is
  blocked).
- **Performance**: the engine must return the exact minimal diff for 20k, 100k
  and 500k lines within time limits; in the browser, 5k–500k line diffs must be
  on screen within limits, keep under 200 rows in the DOM, scroll in one frame,
  and typing in a 100k-line document must stay under 100 ms per keystroke.

## Performance

Measured on an M-series laptop (paste to diff on screen):

| Lines   | Diff engine | On screen |
| ------- | ----------- | --------- |
| 20,000  | ~15 ms      | ~0.3 s    |
| 100,000 | ~45 ms      | ~0.4 s    |
| 500,000 | ~300 ms     | ~1.1 s    |

Inputs up to 10,000 lines always get the exact shortest edit script. Larger
inputs are first anchored on lines that occur once on each side (as git's
patience diff does) and a search-depth cap bounds pathological cases, so the
result stays correct (it rebuilds both files) but may occasionally be a little
longer than the theoretical minimum.

Browser tests use your installed Google Chrome. To use Playwright's bundled
Chromium instead (e.g. in CI): `npx playwright install chromium` and run with
`PW_CHANNEL=`.

