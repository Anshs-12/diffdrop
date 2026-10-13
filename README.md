# diffdrop

Everything they paywall. Free. Nothing leaves your browser.

diffdrop is a diff checker that runs entirely in your browser: unlimited use,
no account, nothing uploaded. It lives at [diffdrop.me](https://diffdrop.me).

## Features

- Myers O(ND) line diff (the algorithm behind `git diff`), run in a Web Worker
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
- **Performance**: time budgets for the engine (20k and 100k lines) and for
  rendering in the browser.

Browser tests use your installed Google Chrome. To use Playwright's bundled
Chromium instead (e.g. in CI): `npx playwright install chromium` and run with
`PW_CHANNEL=`.

