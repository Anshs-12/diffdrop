import type { ToolContent } from '../content';

const content: ToolContent = {
  h1: 'PX to REM converter',
  lede: 'Convert pixels to rem and rem to pixels with any root font size. Convert one value, a list with one per line, or paste CSS and only its px values change.',
  steps: [
    { title: 'Set the root font size', body: 'Browsers default to 16px. If your CSS sets html { font-size } to something else, enter that instead.' },
    { title: 'Type a value or paste a list', body: 'Single converts one number as you type. Batch takes one value per line, or a whole stylesheet: px values are converted and everything else, including comments, strings and url(), is left as it is.' },
    { title: 'Copy the result', body: 'Pick how many decimals to keep, then copy or download. The table below shows common sizes at your root size.' },
  ],
  faq: [
    { q: 'How do I convert px to rem?', a: 'Divide the pixel value by the root font size. With the default 16px, 24px ÷ 16 = 1.5rem. To go back, multiply: 1.5rem × 16 = 24px.' },
    { q: 'What is the difference between rem and em?', a: 'rem is relative to the root element’s font size, so 1rem is the same everywhere on the page. em is relative to the current element’s font size, so it compounds when elements are nested. This tool converts rem only and leaves em values alone.' },
    { q: 'Why use rem instead of px?', a: 'When someone raises the default font size in their browser settings, text and spacing sized in rem grow with it. Sizes in px stay fixed.' },
    { q: 'What if my site sets html { font-size: 62.5% }?', a: 'That makes the root 10px (62.5% of 16px), so 1rem is 10px. Enter 10 as the root font size.' },
    { q: 'Should borders be in rem?', a: 'Often not. A 1px hairline becomes 0.0625rem, which can round to 0 or 2 device pixels at some zoom levels. Turn on “Keep 1px” to leave 1px values alone in CSS.' },
  ],
  example: {
    intro: 'A CSS rule at the default 16px root size. Only the px values change.',
    inputLabel: 'css',
    input: '.card {\n  padding: 12px 20px;\n  font-size: 14px;\n  border-radius: 6px;\n  line-height: 1.5;\n}',
    outputLabel: 'converted',
    output: '.card {\n  padding: 0.75rem 1.25rem;\n  font-size: 0.875rem;\n  border-radius: 0.375rem;\n  line-height: 1.5;\n}',
  },
  mistakes: [
    { title: 'Using the wrong root size', body: 'rem is relative to the html element’s font size. If your CSS changes it, convert with that value, not 16.' },
    { title: 'Mixing up rem and em', body: 'em compounds inside nested elements, so 1.5em inside 1.5em text is 2.25 times the parent size. Use rem when you want the same size everywhere.' },
    { title: 'Converting media query breakpoints blindly', body: 'rem and em in media queries are based on the browser’s default font size, not your html font-size, so a 62.5% root doesn’t apply there.' },
    { title: 'Rounding too hard', body: 'Two decimals can turn 13px into 0.81rem, which is 12.96px. Keep 4 decimals if you need sizes to match a design exactly.' },
  ],
  related: ['css-beautifier', 'aspect-ratio', 'color-converter', 'css-gradient'],
};

export default content;
