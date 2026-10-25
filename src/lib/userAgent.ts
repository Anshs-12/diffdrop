/**
 * A small, hand-written user agent parser. User agent strings are free text
 * that browsers fill with tokens copied from each other, so the order of the
 * rules matters: more specific browsers (Edge, Opera, Samsung) are checked
 * before the Chrome and Safari tokens they also send.
 */

export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown';

export interface NameVersion {
  name: string;
  version: string | null;
}

export interface UaResult {
  browser: NameVersion | null;
  engine: NameVersion | null;
  os: NameVersion | null;
  device: DeviceType;
  /** Device model when the string names one (often frozen or missing in modern browsers). */
  model: string | null;
  /** Crawler or tool name when the string is from a bot. */
  bot: string | null;
  /** Caveats about what this string can't tell you. */
  notes: string[];
}

export interface UaHints {
  /** navigator.maxTouchPoints, only known for the visitor's own browser. */
  maxTouchPoints?: number;
}

const BOTS: [RegExp, string][] = [
  [/Googlebot(?:-[A-Za-z]+)?/, 'Googlebot'],
  [/Google-InspectionTool/, 'Google-InspectionTool'],
  [/AdsBot-Google(?:-Mobile)?/, 'AdsBot-Google'],
  [/Mediapartners-Google/, 'Google AdSense'],
  [/Storebot-Google/, 'Storebot-Google'],
  [/bingbot/i, 'Bingbot'],
  [/BingPreview/, 'BingPreview'],
  [/DuckDuckBot/, 'DuckDuckBot'],
  [/YandexBot|YandexMobileBot/, 'YandexBot'],
  [/Baiduspider/, 'Baiduspider'],
  [/Applebot/, 'Applebot'],
  [/Yahoo! Slurp/, 'Yahoo Slurp'],
  [/facebookexternalhit|facebookcatalog/, 'Facebook crawler'],
  [/meta-externalagent/, 'Meta crawler'],
  [/Twitterbot/, 'Twitterbot'],
  [/LinkedInBot/, 'LinkedInBot'],
  [/Slackbot/, 'Slackbot'],
  [/Discordbot/, 'Discordbot'],
  [/TelegramBot/, 'TelegramBot'],
  [/WhatsApp\//, 'WhatsApp link preview'],
  [/Pinterestbot|Pinterest\//, 'Pinterestbot'],
  [/AhrefsBot/, 'AhrefsBot'],
  [/SemrushBot/, 'SemrushBot'],
  [/MJ12bot/, 'MJ12bot'],
  [/DotBot/, 'DotBot'],
  [/PetalBot/, 'PetalBot'],
  [/Bytespider/, 'Bytespider'],
  [/GPTBot/, 'GPTBot'],
  [/CCBot/, 'CCBot'],
  [/UptimeRobot/, 'UptimeRobot'],
  [/HeadlessChrome/, 'Headless Chrome'],
  [/PhantomJS/, 'PhantomJS'],
  [/^curl\//, 'curl'],
  [/^Wget\//, 'Wget'],
  [/python-requests|python-urllib|aiohttp/i, 'Python HTTP client'],
  [/^Go-http-client/, 'Go HTTP client'],
  [/^okhttp/i, 'OkHttp'],
  [/^axios\//, 'axios'],
  [/^node-fetch|^undici/, 'Node.js HTTP client'],
  [/^Java\//, 'Java HTTP client'],
  [/^PostmanRuntime/, 'Postman'],
];
// Anything else that calls itself a bot, crawler or spider
// (bounded, so it can't backtrack for long; "Cubot" is a phone brand, not a bot)
const GENERIC_BOT = /\b(?!cubot)([a-z][\w-]{0,40}?(?:bot|crawler|spider))\b|\b(?:bot|crawler|spider|crawling)\b/i;

const ver = (s: string | undefined) => (s ? s.replace(/_/g, '.') : null);

function match(ua: string, re: RegExp): string | null | undefined {
  const m = re.exec(ua);
  return m ? (m[1] ?? null) : undefined;
}

function detectBrowser(ua: string): NameVersion | null {
  const rules: [RegExp, string][] = [
    [/\bEdg(?:e|A|iOS)?\/([\d.]+)/, 'Microsoft Edge'],
    [/\bOPR\/([\d.]+)/, 'Opera'],
    [/\bOPiOS\/([\d.]+)/, 'Opera'],
    [/\bOPT\/([\d.]+)/, 'Opera Touch'],
    [/Opera Mini\/([\d.]+)/, 'Opera Mini'],
    [/^Opera\/.*Version\/([\d.]+)/, 'Opera'],
    [/\bSamsungBrowser\/([\d.]+)/, 'Samsung Internet'],
    [/\bYaBrowser\/([\d.]+)/, 'Yandex Browser'],
    [/\bVivaldi\/([\d.]+)/, 'Vivaldi'],
    [/\bUCBrowser\/([\d.]+)/, 'UC Browser'],
    [/\bMiuiBrowser\/([\d.]+)/, 'Mi Browser'],
    [/\bDuckDuckGo\/([\d.]+)/, 'DuckDuckGo'],
    [/\bFBAV\/([\d.]+)/, 'Facebook in-app browser'],
    [/\bInstagram ([\d.]+)/, 'Instagram in-app browser'],
    [/\bFxiOS\/([\d.]+)/, 'Firefox'],
    [/\bFirefox\/([\d.]+)/, 'Firefox'],
    [/\bCriOS\/([\d.]+)/, 'Chrome'],
    [/HeadlessChrome\/([\d.]+)/, 'Headless Chrome'],
  ];
  for (const [re, name] of rules) {
    const v = match(ua, re);
    if (v !== undefined) return { name, version: v };
  }
  const chrome = match(ua, /\bChrome\/([\d.]+)/);
  if (chrome !== undefined) {
    if (/; wv\)/.test(ua)) return { name: 'Android WebView', version: chrome };
    return { name: /\bChromium\//.test(ua) ? 'Chromium' : 'Chrome', version: chrome };
  }
  const ie = match(ua, /\bMSIE ([\d.]+)/) ?? match(ua, /Trident\/7\.0.*rv:([\d.]+)/);
  if (ie != null) return { name: 'Internet Explorer', version: ie };
  if (/\bAndroid\b/.test(ua) && /Version\/[\d.]+/.test(ua) && /Safari\//.test(ua)) {
    return { name: 'Android Browser', version: match(ua, /Version\/([\d.]+)/) ?? null };
  }
  if (/AppleWebKit\//.test(ua) && /Safari\//.test(ua) && /Version\/[\d.]+/.test(ua)) {
    return { name: /Mobile\//.test(ua) ? 'Mobile Safari' : 'Safari', version: match(ua, /Version\/([\d.]+)/) ?? null };
  }
  // iOS apps that show web pages in a WebKit view leave the Safari token out
  if (/\((?:iPhone|iPad|iPod)/.test(ua) && /AppleWebKit\//.test(ua)) return { name: 'iOS WebView (in-app)', version: null };
  return null;
}

function detectOs(ua: string): NameVersion | null {
  const ios = /\((iPhone|iPad|iPod)[^)]*?OS (\d+(?:_\d+)*)/.exec(ua);
  if (ios) {
    const version = ver(ios[2]);
    const major = Number(version?.split('.')[0]);
    return { name: ios[1] === 'iPad' && major >= 13 ? 'iPadOS' : 'iOS', version };
  }
  if (/\((?:iPhone|iPad|iPod)/.test(ua)) return { name: 'iOS', version: null };
  const winPhone = match(ua, /Windows Phone(?: OS)? ([\d.]+)/);
  if (winPhone !== undefined) return { name: 'Windows Phone', version: winPhone };
  const android = match(ua, /\bAndroid[ /]?([\d.]+)?/);
  if (android !== undefined) return { name: 'Android', version: android };
  const harmony = match(ua, /\bHarmonyOS(?:[ /]([\d.]+))?/);
  if (harmony !== undefined) return { name: 'HarmonyOS', version: harmony };
  const kai = match(ua, /\bKAIOS\/([\d.]+)/i);
  if (kai !== undefined) return { name: 'KaiOS', version: kai };
  const nt = match(ua, /Windows NT ([\d.]+)/);
  if (nt !== undefined) {
    const names: Record<string, string> = {
      '10.0': '10 or 11',
      '6.3': '8.1',
      '6.2': '8',
      '6.1': '7',
      '6.0': 'Vista',
      '5.2': 'XP x64',
      '5.1': 'XP',
      '5.0': '2000',
    };
    return { name: 'Windows', version: (nt && names[nt]) ?? (nt ? `NT ${nt}` : null) };
  }
  if (/\bWindows\b/.test(ua)) return { name: 'Windows', version: null };
  const cros = match(ua, /\bCrOS \S+ ([\d.]+)/);
  if (cros !== undefined) return { name: 'ChromeOS', version: cros };
  const mac = match(ua, /Mac OS X (\d+(?:[._]\d+)*)/);
  if (mac !== undefined) return { name: 'macOS', version: ver(mac ?? undefined) };
  if (/\bMacintosh\b/.test(ua)) return { name: 'macOS', version: null };
  if (/\bUbuntu\b/.test(ua)) return { name: 'Ubuntu', version: match(ua, /Ubuntu[/ ]([\d.]+)/) ?? null };
  if (/\bFedora\b/.test(ua)) return { name: 'Fedora', version: null };
  if (/\bFreeBSD\b/.test(ua)) return { name: 'FreeBSD', version: null };
  if (/\b(?:Linux|X11)\b/.test(ua)) return { name: 'Linux', version: null };
  return null;
}

function detectEngine(ua: string, browser: NameVersion | null, os: NameVersion | null): NameVersion | null {
  // On iOS and iPadOS every browser has had to use WebKit, whatever brand it shows
  const appleMobile = os?.name === 'iOS' || os?.name === 'iPadOS';
  const webkit = match(ua, /AppleWebKit\/([\d.]+)/);
  if (appleMobile && webkit !== undefined) return { name: 'WebKit', version: webkit };
  const edgeHtml = match(ua, /\bEdge\/([\d.]+)/);
  if (edgeHtml !== undefined) return { name: 'EdgeHTML', version: edgeHtml };
  const chrome = match(ua, /\b(?:Chrome|HeadlessChrome)\/([\d.]+)/);
  if (chrome !== undefined) return { name: 'Blink', version: chrome };
  const presto = match(ua, /\bPresto\/([\d.]+)/);
  if (presto !== undefined) return { name: 'Presto', version: presto };
  const trident = match(ua, /\bTrident\/([\d.]+)/);
  if (trident !== undefined) return { name: 'Trident', version: trident };
  if (webkit !== undefined) return { name: 'WebKit', version: webkit };
  if (/\bGecko\/\d/.test(ua) || browser?.name === 'Firefox') return { name: 'Gecko', version: match(ua, /\brv:([\d.]+)/) ?? null };
  return null;
}

function detectModel(ua: string, os: NameVersion | null): string | null {
  if (os?.name === 'Android') {
    // "Linux; Android 14; Pixel 8 Build/UD1A..." or reduced "Linux; Android 10; K"
    const m = /Android[^;)]*;\s*(?:[a-z]{2}[-_][a-z]{2};\s*)?([^;)]+?)(?:\s+Build\/[^;)]*)?\s*[;)]/i.exec(ua);
    const model = m?.[1]?.trim();
    if (model && !/^(?:wv|U|Mobile|Linux)$/.test(model)) return model;
    return null;
  }
  const apple = /\((iPhone|iPad|iPod)/.exec(ua);
  return apple ? apple[1]! : null;
}

function detectDevice(ua: string, os: NameVersion | null): DeviceType {
  if (/\biPad\b|\bTablet\b|\bKindle\b|\bSilk\//i.test(ua)) return 'tablet';
  if (/Opera Mini|Windows Phone/.test(ua)) return 'mobile';
  if (os?.name === 'Android') return /\bMobile\b/.test(ua) ? 'mobile' : 'tablet';
  if (/\biPhone\b|\biPod\b|Windows Phone|Opera Mini|\bMobi\b|\bMobile\b/.test(ua)) return 'mobile';
  if (os && ['Windows', 'macOS', 'Linux', 'ChromeOS', 'Ubuntu', 'Fedora', 'FreeBSD'].includes(os.name)) return 'desktop';
  return 'unknown';
}

function detectBot(ua: string): string | null {
  for (const [re, name] of BOTS) if (re.test(ua)) return name;
  const g = GENERIC_BOT.exec(ua);
  if (g) return g[1] ?? 'Unnamed bot';
  return null;
}

export function parseUserAgent(input: string, hints: UaHints = {}): UaResult {
  const ua = input.trim().slice(0, 4000);
  const notes: string[] = [];
  if (!ua) return { browser: null, engine: null, os: null, device: 'unknown', model: null, bot: null, notes };

  const bot = detectBot(ua);
  const browser = detectBrowser(ua);
  const os = detectOs(ua);
  const engine = detectEngine(ua, browser, os);
  const model = detectModel(ua, os);
  let device = bot ? 'bot' : detectDevice(ua, os);

  if (bot) notes.push('Anyone can send this string, so it doesn’t prove the request came from this bot. Big crawlers publish ways to verify them, such as reverse DNS lookups.');
  if (os?.name === 'Windows' && os.version === '10 or 11')
    notes.push('Windows 11 still sends “Windows NT 10.0”, so the user agent can’t tell Windows 10 and 11 apart.');
  if (os?.name === 'macOS' && /10[._]15[._]7/.test(ua))
    notes.push('Browsers report macOS 10.15.7 on every version from Catalina onward, so the real macOS version is unknown.');
  if (os?.name === 'macOS' && browser?.name === 'Safari') {
    if (hints.maxTouchPoints && hints.maxTouchPoints > 1) {
      device = 'tablet';
      notes.push('This Mac-style string comes with a touch screen, so it’s most likely an iPad requesting desktop sites.');
    } else {
      notes.push('iPads browse in desktop mode by default and send this same Mac string, so this could also be an iPad.');
    }
  }
  if (engine?.name === 'Blink' && /\bChrome\/\d+\.0\.0\.0\b/.test(ua))
    notes.push('Chrome and other Chromium browsers send a reduced user agent: only the major version is real (the rest is 0.0.0), and the OS version and device model are frozen.');
  if (os?.name === 'Android' && /Android 10; K\)/.test(ua)) notes.push('“Android 10; K” is the frozen value of the reduced user agent; the real Android version and model are hidden.');
  if ((os?.name === 'iOS' || os?.name === 'iPadOS') && browser && !/Safari/.test(browser.name))
    notes.push(`On ${os.name}, ${browser.name} runs on Apple’s WebKit engine, like Safari.`);

  return { browser, engine, os, device, model, bot, notes };
}

export interface ClientHints {
  brands: { brand: string; version: string }[];
  mobile: boolean;
  platform: string;
}

/** The low-entropy navigator.userAgentData values (Chromium only), without asking for more. */
export function readClientHints(nav: Navigator | undefined): ClientHints | null {
  const d = (nav as (Navigator & { userAgentData?: ClientHints }) | undefined)?.userAgentData;
  if (!d || !Array.isArray(d.brands)) return null;
  return {
    brands: d.brands.map((b) => ({ brand: String(b.brand), version: String(b.version) })),
    mobile: !!d.mobile,
    platform: String(d.platform ?? ''),
  };
}
