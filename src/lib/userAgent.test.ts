import { describe, expect, it } from 'vitest';
import { parseUserAgent, readClientHints } from './userAgent';

const UA = {
  chromeWin: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  edgeWin: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.2849.68',
  edgeLegacy: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.102 Safari/537.36 Edge/18.19582',
  firefoxWin: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
  firefoxMac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:132.0) Gecko/20100101 Firefox/132.0',
  firefoxLinux: 'Mozilla/5.0 (X11; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0',
  firefoxUbuntu: 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0',
  firefoxAndroid: 'Mozilla/5.0 (Android 14; Mobile; rv:132.0) Gecko/132.0 Firefox/132.0',
  safariMac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
  chromeMac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  operaWin: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 OPR/114.0.0.0',
  vivaldi: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Vivaldi/7.0.3495.6',
  iphoneSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
  iphoneChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1',
  iphoneFirefox: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/132.0 Mobile/15E148 Safari/605.1.15',
  iphoneEdge: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 EdgiOS/130.2849.80 Mobile/15E148 Safari/605.1.15',
  iphoneInstagram: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 352.0.0.25.88 (iPhone15,2; iOS 17_5; en_US; en; scale=3.00; 1179x2556; 646946498)',
  iphoneWebView: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
  ipad: 'Mozilla/5.0 (iPad; CPU OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1',
  ipadOld: 'Mozilla/5.0 (iPad; CPU OS 12_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1.2 Mobile/15E148 Safari/604.1',
  androidChrome: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
  androidChromeFull: 'Mozilla/5.0 (Linux; Android 9; Pixel 3 Build/PQ3A.190801.002) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.111 Mobile Safari/537.36',
  androidTablet: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  samsung: 'Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36',
  webview: 'Mozilla/5.0 (Linux; Android 13; SM-A536B Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.6668.100 Mobile Safari/537.36',
  operaMini: 'Opera/9.80 (Android; Opera Mini/36.2.2254/119.132; U; id) Presto/2.12.423 Version/12.16',
  edgeAndroid: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36 EdgA/130.0.0.0',
  chromeOs: 'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  chromeLinux: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  ie11: 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko',
  ie8: 'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 5.1; Trident/4.0)',
  googlebot: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  googlebotSmartphone:
    'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.69 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  bingbot: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm) Chrome/116.0.1938.76 Safari/537.36',
  duck: 'DuckDuckBot/1.1; (+http://duckduckgo.com/duckduckbot.html)',
  yandex: 'Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)',
  facebook: 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
  gptbot: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2; +https://openai.com/gptbot',
  ahrefs: 'Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)',
  curl: 'curl/8.7.1',
  headless: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/130.0.0.0 Safari/537.36',
  someBot: 'Mozilla/5.0 (compatible; ExampleCrawler/1.0; +https://example.com/crawler)',
  cubot: 'Mozilla/5.0 (Linux; Android 11; CUBOT X30) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
  win7: 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
  kindle: 'Mozilla/5.0 (Linux; Android 9; KFTRWI) AppleWebKit/537.36 (KHTML, like Gecko) Silk/130.4.1 like Chrome/130.0.6723.102 Safari/537.36',
};

const brief = (ua: string, hints = {}) => {
  const r = parseUserAgent(ua, hints);
  const nv = (x: { name: string; version: string | null } | null) => (x ? `${x.name}${x.version ? ` ${x.version}` : ''}` : null);
  return { browser: nv(r.browser), engine: nv(r.engine), os: nv(r.os), device: r.device, bot: r.bot };
};

describe('parseUserAgent: desktop browsers', () => {
  it.each([
    [UA.chromeWin, 'Chrome 130.0.0.0', 'Blink 130.0.0.0', 'Windows 10 or 11'],
    [UA.edgeWin, 'Microsoft Edge 130.0.2849.68', 'Blink 130.0.0.0', 'Windows 10 or 11'],
    [UA.edgeLegacy, 'Microsoft Edge 18.19582', 'EdgeHTML 18.19582', 'Windows 10 or 11'],
    [UA.firefoxWin, 'Firefox 132.0', 'Gecko 132.0', 'Windows 10 or 11'],
    [UA.firefoxMac, 'Firefox 132.0', 'Gecko 132.0', 'macOS 10.15'],
    [UA.firefoxLinux, 'Firefox 132.0', 'Gecko 132.0', 'Linux'],
    [UA.firefoxUbuntu, 'Firefox 115.0', 'Gecko 109.0', 'Ubuntu'],
    [UA.safariMac, 'Safari 18.1', 'WebKit 605.1.15', 'macOS 10.15.7'],
    [UA.chromeMac, 'Chrome 130.0.0.0', 'Blink 130.0.0.0', 'macOS 10.15.7'],
    [UA.operaWin, 'Opera 114.0.0.0', 'Blink 129.0.0.0', 'Windows 10 or 11'],
    [UA.vivaldi, 'Vivaldi 7.0.3495.6', 'Blink 130.0.0.0', 'Windows 10 or 11'],
    [UA.chromeOs, 'Chrome 130.0.0.0', 'Blink 130.0.0.0', 'ChromeOS 14541.0.0'],
    [UA.chromeLinux, 'Chrome 130.0.0.0', 'Blink 130.0.0.0', 'Linux'],
    [UA.ie11, 'Internet Explorer 11.0', 'Trident 7.0', 'Windows 7'],
    [UA.ie8, 'Internet Explorer 8.0', 'Trident 4.0', 'Windows XP'],
    [UA.win7, 'Chrome 109.0.0.0', 'Blink 109.0.0.0', 'Windows 7'],
  ])('%s', (ua, browser, engine, os) => {
    expect(brief(ua)).toEqual({ browser, engine, os, device: 'desktop', bot: null });
  });
});

describe('parseUserAgent: phones and tablets', () => {
  it.each([
    [UA.iphoneSafari, 'Mobile Safari 18.1', 'WebKit 605.1.15', 'iOS 18.1', 'mobile'],
    [UA.iphoneChrome, 'Chrome 130.0.6723.90', 'WebKit 605.1.15', 'iOS 17.6.1', 'mobile'],
    [UA.iphoneFirefox, 'Firefox 132.0', 'WebKit 605.1.15', 'iOS 17.6', 'mobile'],
    [UA.iphoneEdge, 'Microsoft Edge 130.2849.80', 'WebKit 605.1.15', 'iOS 17.6', 'mobile'],
    [UA.iphoneInstagram, 'Instagram in-app browser 352.0.0.25.88', 'WebKit 605.1.15', 'iOS 17.5', 'mobile'],
    [UA.iphoneWebView, 'iOS WebView (in-app)', 'WebKit 605.1.15', 'iOS 16.0', 'mobile'],
    [UA.ipad, 'Mobile Safari 17.6', 'WebKit 605.1.15', 'iPadOS 17.6', 'tablet'],
    [UA.ipadOld, 'Mobile Safari 12.1.2', 'WebKit 605.1.15', 'iOS 12.4', 'tablet'],
    [UA.androidChrome, 'Chrome 130.0.0.0', 'Blink 130.0.0.0', 'Android 10', 'mobile'],
    [UA.androidChromeFull, 'Chrome 76.0.3809.111', 'Blink 76.0.3809.111', 'Android 9', 'mobile'],
    [UA.androidTablet, 'Chrome 130.0.0.0', 'Blink 130.0.0.0', 'Android 10', 'tablet'],
    [UA.samsung, 'Samsung Internet 26.0', 'Blink 122.0.0.0', 'Android 14', 'mobile'],
    [UA.webview, 'Android WebView 129.0.6668.100', 'Blink 129.0.6668.100', 'Android 13', 'mobile'],
    [UA.firefoxAndroid, 'Firefox 132.0', 'Gecko 132.0', 'Android 14', 'mobile'],
    [UA.operaMini, 'Opera Mini 36.2.2254', 'Presto 2.12.423', 'Android', 'mobile'],
    [UA.edgeAndroid, 'Microsoft Edge 130.0.0.0', 'Blink 130.0.0.0', 'Android 10', 'mobile'],
    [UA.cubot, 'Chrome 130.0.0.0', 'Blink 130.0.0.0', 'Android 11', 'mobile'],
    [UA.kindle, 'Chrome 130.0.6723.102', 'Blink 130.0.6723.102', 'Android 9', 'tablet'],
  ])('%s', (ua, browser, engine, os, device) => {
    expect(brief(ua)).toEqual({ browser, engine, os, device, bot: null });
  });

  it('reads the device model when there is one', () => {
    expect(parseUserAgent(UA.androidChromeFull).model).toBe('Pixel 3');
    expect(parseUserAgent(UA.samsung).model).toBe('SAMSUNG SM-S918B');
    expect(parseUserAgent(UA.webview).model).toBe('SM-A536B');
    expect(parseUserAgent(UA.androidChrome).model).toBe('K');
    expect(parseUserAgent(UA.iphoneSafari).model).toBe('iPhone');
    expect(parseUserAgent(UA.chromeWin).model).toBeNull();
  });
});

describe('parseUserAgent: bots', () => {
  it.each([
    [UA.googlebot, 'Googlebot'],
    [UA.googlebotSmartphone, 'Googlebot'],
    [UA.bingbot, 'Bingbot'],
    [UA.duck, 'DuckDuckBot'],
    [UA.yandex, 'YandexBot'],
    [UA.facebook, 'Facebook crawler'],
    [UA.gptbot, 'GPTBot'],
    [UA.ahrefs, 'AhrefsBot'],
    [UA.curl, 'curl'],
    [UA.headless, 'Headless Chrome'],
    [UA.someBot, 'ExampleCrawler'],
  ])('%s', (ua, bot) => {
    const r = parseUserAgent(ua);
    expect(r.bot).toBe(bot);
    expect(r.device).toBe('bot');
    expect(r.notes.join(' ')).toContain('doesn’t prove');
  });
  it('still reads the browser a smartphone crawler pretends to be', () => {
    expect(brief(UA.googlebotSmartphone)).toMatchObject({ browser: 'Chrome 130.0.6723.69', os: 'Android 6.0.1' });
  });
});

describe('parseUserAgent: caveats', () => {
  it('says Windows 10 and 11 look the same', () => {
    expect(parseUserAgent(UA.chromeWin).notes.join(' ')).toContain('can’t tell Windows 10 and 11 apart');
  });
  it('explains the reduced Chrome user agent', () => {
    const notes = parseUserAgent(UA.androidChrome).notes.join(' ');
    expect(notes).toContain('reduced user agent');
    expect(notes).toContain('Android 10; K');
    expect(parseUserAgent(UA.androidChromeFull).notes.join(' ')).not.toContain('reduced');
  });
  it('flags the frozen macOS version and the iPad desktop-mode string', () => {
    const notes = parseUserAgent(UA.safariMac).notes.join(' ');
    expect(notes).toContain('10.15.7');
    expect(notes).toContain('could also be an iPad');
    const touch = parseUserAgent(UA.safariMac, { maxTouchPoints: 5 });
    expect(touch.device).toBe('tablet');
    expect(touch.notes.join(' ')).toContain('most likely an iPad');
  });
  it('notes that iOS browsers use WebKit', () => {
    expect(parseUserAgent(UA.iphoneChrome).notes.join(' ')).toContain('Chrome runs on Apple’s WebKit');
  });
});

describe('parseUserAgent: odd input', () => {
  it('handles empty, junk, huge and unicode strings', () => {
    expect(parseUserAgent('')).toMatchObject({ browser: null, os: null, device: 'unknown', bot: null });
    expect(parseUserAgent('hello world')).toMatchObject({ browser: null, os: null, device: 'unknown' });
    expect(parseUserAgent('Mozilla/5.0 (Windows NT 10.0) 日本語 🚀 Firefox/1.0').browser).toEqual({ name: 'Firefox', version: '1.0' });
    const t = performance.now();
    parseUserAgent('Mozilla/5.0 ('.repeat(100_000) + 'a'.repeat(100_000));
    parseUserAgent('x'.repeat(4000) + 'bot');
    expect(performance.now() - t).toBeLessThan(500);
  });
});

it('matches the page’s worked example', async () => {
  const { default: content } = await import('../tools/content/user-agent-parser');
  const r = parseUserAgent(content.example!.input);
  const nv = (x: { name: string; version: string | null } | null) => `${x!.name} ${x!.version}`;
  const device = `${r.device[0]!.toUpperCase()}${r.device.slice(1)}${r.model ? ` (model: ${r.model})` : ''}`;
  expect(`Browser: ${nv(r.browser)}\nEngine: ${nv(r.engine)}\nOperating system: ${nv(r.os)}\nDevice type: ${device}`).toBe(content.example!.output);
});

describe('readClientHints', () => {
  it('reads low-entropy userAgentData when present', () => {
    const nav = { userAgentData: { brands: [{ brand: 'Chromium', version: '130' }], mobile: false, platform: 'macOS' } } as unknown as Navigator;
    expect(readClientHints(nav)).toEqual({ brands: [{ brand: 'Chromium', version: '130' }], mobile: false, platform: 'macOS' });
    expect(readClientHints({} as Navigator)).toBeNull();
    expect(readClientHints(undefined)).toBeNull();
  });
});
