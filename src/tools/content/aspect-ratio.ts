import type { ToolContent } from '../content';

const content: ToolContent = {
  h1: 'Aspect ratio calculator',
  lede: 'Enter a width and height to get the simplified ratio, or pick a ratio like 16:9 and one side to get the other. Common sizes for the ratio are listed below.',
  steps: [
    { title: 'Enter a size', body: 'Type the width and height in pixels (or any unit). The ratio is reduced to whole numbers, with its decimal value.' },
    { title: 'Find a missing side', body: 'Pick a preset or type a ratio such as 1.85:1, then enter a width or a height to get the other.' },
    { title: 'Check common sizes', body: 'The table lists familiar screen and media sizes at that ratio, and marks those that are only close to it.' },
  ],
  faq: [
    { q: 'How do I calculate an aspect ratio?', a: 'Divide the width and height by their greatest common divisor. For 1920 × 1080 that is 120, which gives 16:9.' },
    { q: 'Is 21:9 really 21:9?', a: 'Not exactly. “21:9” monitors are usually 2560 × 1080 (64:27) or 3440 × 1440 (43:18), both a little wider than 21:9. The table marks such sizes as close rather than exact.' },
    { q: 'Why is 1366 × 768 not exactly 16:9?', a: 'It reduces to 683:384, about 1.779. It is sold as 16:9 (1.778) because it is within a fraction of a pixel of it.' },
    { q: 'What ratio should I use for social video?', a: '9:16 (such as 1080 × 1920) fills a phone screen held upright; 1:1 and 4:5 (1080 × 1350) suit feeds; 16:9 suits landscape players.' },
  ],
  example: {
    intro: 'Simplify a monitor size, then size a video for the same ratio.',
    inputLabel: 'input',
    input: 'Width 2560, height 1440\nRatio 16:9, width 1280',
    outputLabel: 'result',
    output: '2560 × 1440 → 16:9 (1.7778)\n16:9 at 1280 wide → 1280 × 720',
  },
  mistakes: [
    { title: 'Rounding the ratio, not the size', body: 'Work out the missing side from the full ratio and round only the result, or small errors add up.' },
    { title: 'Odd pixel counts for video', body: 'Many video encoders need even widths and heights. If the result is odd, step to the nearest even size.' },
    { title: 'Mixing up width and height', body: '9:16 is portrait and 16:9 is landscape. The first number is always the width.' },
    { title: 'Stretching instead of cropping', body: 'Changing an image’s ratio means cropping or adding bars. Resizing to a new ratio without either distorts it.' },
  ],
  related: ['image-resizer', 'image-compressor', 'favicon-generator'],
};

export default content;
