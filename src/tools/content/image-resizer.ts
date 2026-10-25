import type { ToolContent } from '../content';

const content: ToolContent = {
  h1: 'Image resizer',
  lede: 'Resize an image to exact pixels or a percentage, with the aspect ratio locked or free, and save it as JPG, PNG or WebP. It all happens in your browser.',
  steps: [
    { title: 'Open an image', body: 'Drop or pick a JPG, PNG or WebP file. It stays on your device.' },
    { title: 'Set the size', body: 'Type a width or height in pixels, or a percentage. With the lock on, the other side follows the original shape.' },
    { title: 'Pick a format and download', body: 'The new dimensions and file size update as you go. Download when it looks right.' },
  ],
  faq: [
    { q: 'Will resizing make my image blurry?', a: 'Making an image smaller keeps it sharp: large reductions are done in halving steps with high-quality smoothing, which avoids jagged edges. Making it larger can’t add detail, so enlarged images look soft.' },
    { q: 'How do I resize without stretching?', a: 'Keep the aspect-ratio lock on. You set one side and the other is worked out from the original proportions.' },
    { q: 'Is there a size limit?', a: 'Browsers cap canvases at about 16,000 pixels on a side and roughly 16 megapixels in total on some devices, so very large outputs are refused with a message.' },
    { q: 'Are my images uploaded?', a: 'No. The image is decoded and redrawn in this tab, and the page is blocked from sending data anywhere.' },
  ],
  mistakes: [
    { title: 'Unlocking the ratio by accident', body: 'With the lock off, a new width alone squashes the image. Turn the lock back on, or set both sides on purpose.' },
    { title: 'Enlarging small images', body: 'Scaling a 400 px image to 2000 px gives a big, soft picture. Start from the largest original you have.' },
    { title: 'Saving photos as PNG', body: 'PNG is lossless, so photos get large. Use JPEG or WebP for photos and PNG for screenshots and graphics.' },
    { title: 'Forgetting high-density screens', body: 'An image shown 400 CSS pixels wide on a 2× display needs about 800 real pixels to look crisp.' },
  ],
  related: ['image-compressor', 'aspect-ratio', 'favicon-generator'],
};

export default content;
