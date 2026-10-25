import type { ToolContent } from '../content';

const content: ToolContent = {
  h1: 'HTTP status codes',
  lede: 'Every registered HTTP status code, from 100 Continue to 511, with what it means and when to send it. Search by number or words, filter by class, and link straight to any code.',
  steps: [
    { title: 'Search or filter', body: 'Type a number (404, or 40 for all 40x codes) or words like “redirect” or “rate limit”. Or pick a class: 1xx to 5xx.' },
    { title: 'Read the entry', body: 'Each code has a plain explanation, when to use it, the document that defines it, and whether responses are cacheable by default.' },
    { title: 'Copy or link', body: 'Copy the code line, or link to it with the code as the anchor, like /http-status-codes/#404.' },
  ],
  faq: [
    { q: 'What’s the difference between 401 and 403?', a: '401 Unauthorized means the request has no valid credentials: log in and try again. 403 Forbidden means the server knows who you are (or doesn’t care) and still refuses; logging in again won’t help.' },
    { q: 'Should I use 301 or 308, 302 or 307?', a: '301 and 302 let clients change a POST into a GET when following the redirect; 308 and 307 require the same method and body. For ordinary page redirects 301 and 302 work fine; for APIs that redirect POST or PUT, use 308 or 307.' },
    { q: 'What does “cacheable by default” mean?', a: 'RFC 9110 lets caches store responses with these codes and reuse them for a while even without explicit Cache-Control or Expires headers. Other codes are only cached when headers say so.' },
    { q: 'When should an API return 400 versus 422?', a: '400 is for requests that can’t be read at all, like broken JSON. 422 is for a well-formed request whose content fails validation, like a missing required field. Many APIs use 400 for both, which is also fine.' },
    { q: 'Is 418 a real status code?', a: '418 I’m a teapot came from an April Fools’ joke RFC in 1998. It was never a real HTTP code, but RFC 9110 reserves the number so it isn’t reused.' },
  ],
  mistakes: [
    { title: '200 with an error message', body: 'Sending 200 OK with {"error": "not found"} in the body hides failures from clients, caches and monitoring. Use the matching 4xx or 5xx code.' },
    { title: '404 for “not logged in”', body: 'Use 401 when credentials are missing, so clients know to authenticate. 404 is fine for hiding a resource someone may not know exists.' },
    { title: 'Redirecting forms with 301', body: 'Browsers turn a redirected POST into a GET with 301 and 302, so the form data is lost. Use 303 after handling a POST, or 307/308 to resend it.' },
    { title: '500 for bad input', body: '5xx means the server failed. If the client sent something invalid, return a 4xx so it knows to fix the request rather than retry.' },
  ],
  related: ['url-encoder', 'jwt-decoder', 'json-formatter', 'robots-txt'],
};

export default content;
