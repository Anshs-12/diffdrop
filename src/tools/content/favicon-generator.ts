import type { ToolContent } from '../content';

const content: ToolContent = {
  h1: 'Favicon generator',
  lede: 'Turn one image into a favicon.ico (16, 32 and 48 px) and PNG icons for browsers, iPhone home screens and Android, plus the HTML tags and web manifest to add them. Nothing is uploaded.',
  steps: [
    { title: 'Add an image', body: 'Drop or pick a PNG, JPG, SVG or WebP. A square image at least 512 px wide gives the best results.' },
    { title: 'Adjust the look', body: 'Choose a background color or keep it transparent, add padding and round the corners. The previews update at real sizes.' },
    { title: 'Download and add the tags', body: 'Download each file into your site’s root folder, then paste the link tags into your page’s <head>.' },
  ],
  faq: [
    { q: 'Which favicon files do I actually need?', a: 'A favicon.ico covers every browser on its own. Add apple-touch-icon.png (180 px) for iPhone and iPad home screens, and the 192 and 512 px PNGs with a web manifest if the site can be installed as an app.' },
    { q: 'What is inside the favicon.ico?', a: 'Three PNG images, 16, 32 and 48 px square, in one ICO container. PNG inside ICO has been supported since Windows Vista and works in all current browsers.' },
    { q: 'Why does my icon look black on an iPhone?', a: 'iOS fills transparent parts of apple-touch-icon.png with black. Choose a background color so the home screen icon looks as you intend.' },
    { q: 'Can I use an SVG favicon?', a: 'Yes, as the source here, and current desktop browsers also accept an SVG favicon directly. Keep favicon.ico as well, since some browsers and tools only look for it.' },
  ],
  mistakes: [
    { title: 'Using a detailed logo at 16 px', body: 'Fine text and thin lines disappear at 16 px. A simple mark or a single letter reads better.' },
    { title: 'Forgetting the cache', body: 'Browsers cache favicons hard. After changing it, open the icon’s URL directly or use a private window to see the new one.' },
    { title: 'Wrong paths in the tags', body: 'The tags here point to the site root (/favicon.ico). If you put the files in a folder, change the paths to match.' },
    { title: 'A non-square source', body: 'Wide logos are fitted inside the square with space above and below. Crop to a square first if you want it to fill the icon.' },
  ],
  related: ['image-resizer', 'svg-optimizer', 'meta-tag-generator'],
};

export default content;
