import type { ToolContent } from '../content';

const content: ToolContent = {
  h1: 'Color palette generator',
  lede: 'Start from one color and get a 50–950 scale plus complementary, analogous, triadic, split-complementary, tetradic and monochrome palettes. Click any swatch to copy it, or export the set as CSS variables or a Tailwind theme.',
  steps: [
    { title: 'Pick a base color', body: 'Use the picker or type any CSS color: #3b82f6, rgb(), hsl(), oklch() or a name like coral.' },
    { title: 'Browse the palettes', body: 'Every palette is worked out in OKLCH, so colors at the same step look equally light. Click a swatch to copy its hex.' },
    { title: 'Export one', body: 'Choose a palette and a format (hex list, CSS custom properties, Tailwind v4 @theme or a Tailwind v3 config) and copy it.' },
  ],
  faq: [
    { q: 'How is this different from the color converter?', a: 'The color converter shows one color in every notation (HEX, RGB, HSL, OKLCH, CMYK). This page builds sets of colors from one, and exports them ready for a stylesheet or a Tailwind theme.' },
    { q: 'Why OKLCH instead of HSL?', a: 'In HSL, yellow at 50% lightness looks far brighter than blue at 50%. OKLCH lightness follows what the eye sees, so turning the hue keeps the palette balanced and a 500 step looks about as strong in every hue.' },
    { q: 'Where does my color go in the 50–950 scale?', a: 'At the step whose lightness is closest to it, unchanged. The other steps keep its hue and get lighter or darker, with less chroma at the very light and very dark ends, the way hand-made design system scales do.' },
    { q: 'Why do some colors come out less saturated than I expect?', a: 'A rotated hue can need more chroma than a screen can show at that lightness. Those colors keep their lightness and hue and lose just enough chroma to fit sRGB, instead of being clipped into a different hue.' },
  ],
  mistakes: [
    { title: 'Using every harmony color equally', body: 'Triadic and tetradic sets are loud when the colors share the space evenly. Let one lead and use the others for small accents.' },
    { title: 'Assuming a palette is accessible', body: 'Harmony says nothing about contrast. Check text and background pairs with the contrast checker before you ship them.' },
    { title: 'Building scales by mixing with white', body: 'Mixing with white or black in RGB washes colors out and shifts their hue. Stepping lightness in OKLCH keeps the hue steady.' },
    { title: 'Picking a gray as the base', body: 'A color with no hue has nothing to rotate, so every harmony is the same gray. Start from a color with some saturation.' },
  ],
  related: ['color-converter', 'contrast-checker', 'css-gradient'],
};

export default content;
