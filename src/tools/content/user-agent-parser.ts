import type { ToolContent } from '../content';

const content: ToolContent = {
  h1: 'User agent parser',
  lede: 'See which browser, engine, operating system and device a user agent string describes. It starts with your own browser’s string, and you can paste any other, such as one from a server log.',
  steps: [
    { title: 'Start with your own, or paste one', body: 'The box shows the string your browser sends. Paste a different one from a log or an analytics export, or pick a sample.' },
    { title: 'Read the result', body: 'Browser and version, rendering engine, operating system, and whether it’s a desktop, phone, tablet or bot. Warnings point out what the string can’t tell you.' },
    { title: 'Copy it', body: 'Copy or download the result as JSON, including the client hints your browser exposes, if it has them.' },
  ],
  faq: [
    { q: 'What is a user agent string?', a: 'A line of text browsers send with every request, in the User-Agent header, naming the browser, its engine and the operating system. Apps, crawlers and command-line tools send one too.' },
    { q: 'Why does every browser say Mozilla and Safari?', a: 'History. Sites once served better pages to particular browsers, so newer browsers copied the older ones’ tokens to get them. Chrome’s string mentions Mozilla, AppleWebKit, KHTML, Gecko and Safari. Parsers have to check the specific tokens (Edg/, OPR/, SamsungBrowser/) before the generic ones.' },
    { q: 'Why can’t it tell Windows 10 from Windows 11?', a: 'Both send “Windows NT 10.0”. In Chromium browsers, a page can ask for the platform version through client hints (navigator.userAgentData.getHighEntropyValues); this page reads only the basic values and doesn’t ask for more.' },
    { q: 'Why does my iPad show up as a Mac?', a: 'Since iPadOS 13, Safari on iPad requests desktop sites by default and sends the same string as Safari on a Mac. For your own device, this page also checks for a touch screen and says when a “Mac” is probably an iPad.' },
    { q: 'Why does Chrome report 130.0.0.0 and Android 10; K?', a: 'Chrome reduced its user agent to limit fingerprinting. Only the major version is real, the OS version is frozen (Android 10, macOS 10.15.7, Windows NT 10.0) and the phone model is replaced by K.' },
  ],
  example: {
    intro: 'Samsung Internet on a Galaxy phone.',
    inputLabel: 'user agent',
    input: 'Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36',
    outputLabel: 'parsed',
    output: 'Browser: Samsung Internet 26.0\nEngine: Blink 122.0.0.0\nOperating system: Android 14\nDevice type: Mobile (model: SAMSUNG SM-S918B)',
  },
  mistakes: [
    { title: 'Using the user agent for features', body: 'Check whether the feature exists instead (if ("share" in navigator)). Browsers change, spoof each other and freeze their strings, so feature detection keeps working.' },
    { title: 'Trusting a bot’s name', body: 'Anyone can send “Googlebot” in a request. Verify crawlers with the methods their operators publish, such as a reverse DNS lookup on the IP address.' },
    { title: 'Matching “Chrome” before “Edg”', body: 'Edge, Opera, Samsung Internet and many others include the Chrome token too. Check for the specific browser first.' },
    { title: 'Reading exact versions from Chrome', body: 'Chrome sends only its major version (130.0.0.0). Don’t rely on the minor or build numbers in logs.' },
  ],
  related: ['robots-txt', 'http-status', 'meta-tag-generator', 'regex-tester'],
};

export default content;
