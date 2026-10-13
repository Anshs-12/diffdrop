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
