/**
 * "Featured on" badges shown on the home page. To add one, append an entry
 * with the link and image from the site's badge snippet, and add the image's
 * origin to img-src in src/csp.ts (the page blocks images from other sites).
 */
export interface Badge {
  name: string;
  href: string;
  src: string;
}

/** Every badge is shown in a box this size (ScrollLaunch's), scaled to fit without stretching. */
export const BADGE_SIZE = { width: 220, height: 48 };

export const BADGES: Badge[] = [
  {
    name: 'CodeHype',
    href: 'https://www.codehype.ai/product/toolspace?utm_source=codehype_badge',
    src: 'https://www.codehype.ai/badges/toolspace.svg?variant=find-us&v=20',
  },
  {
    name: 'ScrollLaunch',
    href: 'https://www.scrolllaunch.com/products/toolspace?ref=badge',
    src: 'https://www.scrolllaunch.com/api/badge/toolspace',
  },
];
