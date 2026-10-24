/**
 * "Featured on" badges shown on the home page, all drawn in the same style.
 * To add one: save the site's logo (from its own favicon or app icon) as
 * public/badges/<id>.png, around 128px square, and append an entry here.
 * Logos are served from this site, so the page loads nothing from elsewhere.
 */
export interface Badge {
  /** The site's name, as it writes it. */
  name: string;
  /** Our page on that site. */
  href: string;
  /** Logo file in public/badges/. */
  logo: string;
}

export const BADGES: Badge[] = [
  { name: 'CodeHype', href: 'https://www.codehype.ai/product/toolspace?utm_source=codehype_badge', logo: '/badges/codehype.png' },
  { name: 'ScrollLaunch', href: 'https://www.scrolllaunch.com/products/toolspace?ref=badge', logo: '/badges/scrolllaunch.png' },
  { name: 'DevHunt', href: 'https://devhunt.org/tool/toolspace', logo: '/badges/devhunt.png' },
  { name: 'FindAlternate', href: 'https://www.findalternate.com/toolspace', logo: '/badges/findalternate.png' },
  { name: 'Startup Benchmarks', href: 'https://startupbenchmarks.com/product/toolspace', logo: '/badges/startupbenchmarks.png' },
  { name: 'Million Dot Homepage', href: 'https://milliondothomepage.com/product/toolspace', logo: '/badges/milliondothomepage.png' },
  { name: 'ShinyLaunch', href: 'https://shinylaunch.com/product/toolspace', logo: '/badges/shinylaunch.png' },
  { name: 'LaunchClash', href: 'https://launchclash.com/product/toolspace', logo: '/badges/launchclash.png' },
  { name: 'Startup Fast', href: 'https://startupfa.st', logo: '/badges/startupfast.png' },
  { name: 'DeepLaunch', href: 'https://deeplaunch.io', logo: '/badges/deeplaunch.png' },
];
