import type { ToolContent } from '../content';

const content: ToolContent = {
  h1: 'Image compressor',
  lede: 'Make JPG, PNG and WebP images smaller in your browser. Choose a format and quality, compare the sizes and the before and after, then download. Images never leave your device.',
  steps: [
    { title: 'Add images', body: 'Drop one or more JPG, PNG or WebP files, or pick them. They are decoded in this tab, not uploaded.' },
    { title: 'Choose format and quality', body: 'JPEG and WebP get smaller as quality drops; around 75–80% is usually hard to tell from the original.' },
    { title: 'Compare and download', body: 'Each file shows its old size, new size and the change. If the new file is bigger, keep the original instead.' },
  ],
  faq: [
    { q: 'Are my images uploaded?', a: 'No. Decoding and re-encoding happen in this tab with the browser’s own image tools, and the page is blocked from sending data anywhere.' },
    { q: 'Why did my PNG barely shrink, or grow?', a: 'PNG is lossless, so saving it again keeps every pixel and the browser’s PNG encoder is not tuned for size. To make a PNG much smaller, save it as WebP or JPEG instead (JPEG has no transparency).' },
    { q: 'Which format should I pick?', a: 'WebP is usually the smallest and keeps transparency, and every current browser shows it. JPEG works everywhere and suits photos. PNG suits screenshots and flat graphics that need exact pixels.' },
    { q: 'Is the photo’s metadata kept?', a: 'No. Re-encoding through a canvas drops EXIF data such as camera details and GPS location, and ignores the EXIF rotation once it has been applied to the pixels.' },
  ],
  mistakes: [
    { title: 'Compressing the same JPEG again and again', body: 'Each lossy save loses a little more detail. Start from the original file every time.' },
    { title: 'Saving transparent images as JPEG', body: 'JPEG has no transparency, so transparent areas become white here. Use WebP or PNG to keep them.' },
    { title: 'Shrinking bytes but not pixels', body: 'A 6000 px photo shown 800 px wide wastes most of its size. Resize it first, then compress.' },
    { title: 'Judging quality at a glance', body: 'Look at faces, text and smooth gradients up close; that is where compression shows first.' },
  ],
  related: ['image-resizer', 'favicon-generator', 'svg-optimizer'],
};

export default content;
