import type { ToolContent } from '../content';

const content: ToolContent = {
  h1: 'Contrast checker',
  lede: 'Check a text color against its background with the WCAG 2 contrast ratio: AA and AAA for normal and large text, and 3:1 for interface parts. If a pair fails, get the closest text color that passes.',
  steps: [
    { title: 'Enter two colors', body: 'Pick or type the text and background colors in hex, rgb() or hsl(). The swap button flips them.' },
    { title: 'Read the result', body: 'The ratio is shown to two decimals, rounded down, with pass or fail for each WCAG level and a live preview.' },
    { title: 'Fix a failing pair', body: 'When text fails, the suggestion keeps its hue and changes only lightness, as little as possible, until it passes.' },
  ],
  faq: [
    { q: 'What contrast ratio do I need?', a: 'WCAG 2 level AA asks for 4.5:1 for normal text and 3:1 for large text. Level AAA asks for 7:1 and 4.5:1. Icons, input borders and other parts of the interface need 3:1 against what is next to them.' },
    { q: 'What counts as large text?', a: 'At least 18 point (24 CSS pixels) regular, or 14 point (about 18.7 CSS pixels) bold.' },
    { q: 'Why does #777 on white fail when it rounds to 4.5?', a: 'Its ratio is about 4.478:1, and WCAG compares the exact ratio with the threshold, so anything below 4.5 fails. This page rounds down for that reason; #767676 is the lightest gray that passes on white.' },
    { q: 'How are transparent colors handled?', a: 'A translucent text color is painted over the background first, and a translucent background over white, and the ratio is measured on the result.' },
    { q: 'Is this the APCA contrast from WCAG 3?', a: 'No. This is the WCAG 2.x formula, the one current accessibility guidelines refer to. APCA is still a draft and uses different numbers.' },
  ],
  example: {
    intro: 'Mid gray text on white, a common choice for secondary text.',
    inputLabel: 'colors',
    input: 'Text: #777777\nBackground: #ffffff',
    outputLabel: 'result',
    output: 'Ratio 4.47:1\nAA normal text: fail\nAA large text: pass\nAAA normal text: fail\nAAA large text: fail\nUI components: pass\nNearest AA text color: #767676',
    note: 'The exact ratio is 4.478:1. One small step darker reaches 4.5:1.',
  },
  mistakes: [
    { title: 'Rounding up to pass', body: '4.48 is not 4.5. Thresholds are exact, so a ratio that only reaches 4.5 after rounding still fails.' },
    { title: 'Checking only body text', body: 'Placeholder text, disabled-looking labels and links need contrast too. Placeholders are often the worst offenders.' },
    { title: 'Ignoring hover and focus states', body: 'A button that passes at rest can fail when hovered. Check each state’s colors.' },
    { title: 'Testing text on a photo with one color', body: 'Text over an image meets many backgrounds. Check against the lightest and darkest parts, or add an overlay.' },
  ],
  related: ['color-converter', 'color-palette', 'css-gradient'],
};

export default content;
