# scripts

`og-image.html` is the source of `public/og.png`, the 1200×630 card shown when
someone shares a diffdrop link. After editing it, re-render with headless Chrome:

```sh
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
  --hide-scrollbars --window-size=1200,630 --screenshot=public/og.png \
  "file://$PWD/scripts/og-image.html"
```
