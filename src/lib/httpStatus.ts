/**
 * HTTP status codes. Standard codes are from the IANA registry (RFC 9110 and
 * the RFCs it lists); unofficial ones are marked with their source.
 */

export interface StatusCode {
  code: number;
  name: string;
  /** What it means, in plain words. */
  meaning: string;
  /** When a server should send it. */
  use: string;
  /** The defining document. */
  spec: string;
  /** Cacheable by default (heuristically cacheable, RFC 9110 §15.1). Only set for codes the spec lists. */
  cacheable?: boolean;
  /** Not in the IANA registry: who uses it. */
  unofficial?: string;
  note?: string;
}

/** RFC 9110 §15.1: these are heuristically cacheable; the rest need explicit freshness info. */
const CACHEABLE = new Set([200, 203, 204, 206, 300, 301, 308, 404, 405, 410, 414, 501]);

const S = (code: number, name: string, meaning: string, use: string, spec: string, note?: string): StatusCode => ({
  code,
  name,
  meaning,
  use,
  spec,
  ...(CACHEABLE.has(code) ? { cacheable: true } : {}),
  ...(note ? { note } : {}),
});

export const STATUS_CODES: StatusCode[] = [
  S(100, 'Continue', 'The server got the request headers and the client should go ahead and send the body.', 'Reply to a request with “Expect: 100-continue” when you’re willing to accept the body.', 'RFC 9110'),
  S(101, 'Switching Protocols', 'The server is switching to the protocol the client asked for in its Upgrade header.', 'Accepting an Upgrade, most often to WebSocket.', 'RFC 9110'),
  S(102, 'Processing', 'The server has accepted the request and is still working on it.', 'Long WebDAV operations, to stop the client timing out. Deprecated and rarely sent today.', 'RFC 2518'),
  S(103, 'Early Hints', 'Headers sent ahead of the final response, usually Link headers so the browser can preload resources.', 'While the server prepares a page, to let the browser start fetching CSS, fonts or scripts.', 'RFC 8297'),

  S(200, 'OK', 'The request succeeded. The body holds the result.', 'The normal success response for GET, and for POST or PUT when you return content.', 'RFC 9110'),
  S(201, 'Created', 'The request succeeded and a new resource was created.', 'After a POST (or PUT) creates something; put its URL in the Location header.', 'RFC 9110'),
  S(202, 'Accepted', 'The request was accepted for processing, but the work isn’t done yet.', 'Queued or background jobs; return a way to check progress.', 'RFC 9110'),
  S(203, 'Non-Authoritative Information', 'Success, but a proxy changed the response from what the origin sent.', 'Sent by transforming proxies; origin servers rarely use it.', 'RFC 9110'),
  S(204, 'No Content', 'Success, with no body.', 'A DELETE or PUT that has nothing to return, or saving a form without leaving the page.', 'RFC 9110'),
  S(205, 'Reset Content', 'Success; the client should reset the form or view that sent the request.', 'Rarely used: after a form submission, to clear the form for new input.', 'RFC 9110'),
  S(206, 'Partial Content', 'The body holds only the byte ranges the client asked for.', 'Answering a Range request: resumable downloads, video seeking.', 'RFC 9110'),
  S(207, 'Multi-Status', 'The body holds several status codes, one for each of several resources.', 'WebDAV operations on many resources at once.', 'RFC 4918'),
  S(208, 'Already Reported', 'Members of this collection were already listed earlier in the same response.', 'WebDAV bindings, to avoid listing the same resource twice.', 'RFC 5842'),
  S(226, 'IM Used', 'The response is the result of instance manipulations (such as a delta) applied to the resource.', 'HTTP delta encoding; seldom seen.', 'RFC 3229'),

  S(300, 'Multiple Choices', 'There are several representations; the client or user should pick one.', 'Rarely used in practice; most servers choose for the client instead.', 'RFC 9110'),
  S(301, 'Moved Permanently', 'The resource has a new permanent URL, given in the Location header.', 'Permanent redirects such as http to https or an old URL to a new one. Clients may change POST to GET when following it.', 'RFC 9110'),
  S(302, 'Found', 'The resource is temporarily at another URL.', 'Temporary redirects. Clients may change POST to GET; use 307 if the method must stay the same.', 'RFC 9110'),
  S(303, 'See Other', 'The result is at another URL; fetch it with GET.', 'After a form POST, to send the browser to a result page (the Post/Redirect/Get pattern).', 'RFC 9110'),
  S(304, 'Not Modified', 'The cached copy the client has is still current; no body is sent.', 'Answering a conditional GET (If-None-Match or If-Modified-Since) when nothing changed.', 'RFC 9110'),
  S(305, 'Use Proxy', 'Deprecated. It once told clients to use a proxy given in Location.', 'Don’t send it; browsers ignore it for security reasons.', 'RFC 9110'),
  S(306, '(Unused)', 'Reserved. It was used in an early draft and is no longer used.', 'Never send it.', 'RFC 9110'),
  S(307, 'Temporary Redirect', 'The resource is temporarily at another URL; repeat the same request there.', 'Temporary redirects where the method and body must not change (a POST stays a POST).', 'RFC 9110'),
  S(308, 'Permanent Redirect', 'The resource has a new permanent URL; repeat the same request there.', 'Permanent redirects where the method and body must not change.', 'RFC 9110'),

  S(400, 'Bad Request', 'The server can’t process the request because it’s malformed.', 'Invalid syntax, a body that won’t parse, or missing required parameters.', 'RFC 9110'),
  S(401, 'Unauthorized', 'The request needs authentication, and none (or an invalid one) was given.', 'No or bad credentials. Send a WWW-Authenticate header saying how to authenticate.', 'RFC 9110'),
  S(402, 'Payment Required', 'Reserved for future use.', 'Not standardised; some APIs use it for billing problems, by their own convention.', 'RFC 9110'),
  S(403, 'Forbidden', 'The server understood the request but refuses it.', 'The user is known but lacks permission. Logging in again won’t help.', 'RFC 9110'),
  S(404, 'Not Found', 'The server has nothing at this URL.', 'Unknown URLs; also to hide a resource the user may not know exists.', 'RFC 9110'),
  S(405, 'Method Not Allowed', 'The URL exists but doesn’t support this method.', 'A POST to a read-only URL, for example. List the allowed methods in an Allow header.', 'RFC 9110'),
  S(406, 'Not Acceptable', 'The server can’t produce a response matching the request’s Accept headers.', 'Content negotiation fails; many servers return a default format instead.', 'RFC 9110'),
  S(407, 'Proxy Authentication Required', 'Like 401, but the proxy needs the client to authenticate.', 'Sent by proxies, with a Proxy-Authenticate header.', 'RFC 9110'),
  S(408, 'Request Timeout', 'The server gave up waiting for the client to finish sending the request.', 'An idle connection; the client may repeat the request on a new one.', 'RFC 9110'),
  S(409, 'Conflict', 'The request conflicts with the current state of the resource.', 'Edit conflicts, duplicate unique values, or a version mismatch.', 'RFC 9110'),
  S(410, 'Gone', 'The resource was here and has been removed for good.', 'Content deliberately deleted with no new URL.', 'RFC 9110'),
  S(411, 'Length Required', 'The server needs a Content-Length header.', 'Requests with a body but no length.', 'RFC 9110'),
  S(412, 'Precondition Failed', 'A condition in the request headers (such as If-Match) wasn’t met.', 'Optimistic locking: the resource changed since the client last saw it.', 'RFC 9110'),
  S(413, 'Content Too Large', 'The request body is larger than the server will accept.', 'Uploads over your size limit. Formerly named Payload Too Large.', 'RFC 9110'),
  S(414, 'URI Too Long', 'The URL is longer than the server will handle.', 'Very long query strings; move the data into a POST body.', 'RFC 9110'),
  S(415, 'Unsupported Media Type', 'The server doesn’t accept the body’s format.', 'A Content-Type you don’t handle, such as XML sent to a JSON API.', 'RFC 9110'),
  S(416, 'Range Not Satisfiable', 'The requested byte range is outside the resource.', 'A Range header beyond the end of the file.', 'RFC 9110'),
  S(417, 'Expectation Failed', 'The server can’t meet the Expect header’s requirement.', 'Declining “Expect: 100-continue” or an unknown expectation.', 'RFC 9110'),
  S(418, 'I’m a teapot (unused)', 'Originally “I’m a teapot”, an April Fools’ joke (RFC 2324, the Hyper Text Coffee Pot Control Protocol). RFC 9110 reserves the number so it isn’t reused.', 'Don’t use it for real errors. Some servers return it as an easter egg.', 'RFC 9110', 'Joke code: from an April Fools’ RFC.'),
  S(421, 'Misdirected Request', 'The request reached a server that can’t answer for this host name.', 'With connection reuse (HTTP/2), when a connection is used for a host the server doesn’t serve.', 'RFC 9110'),
  S(422, 'Unprocessable Content', 'The body is well-formed but its content is invalid.', 'Validation errors in an API: valid JSON with a missing or wrong field. Formerly Unprocessable Entity.', 'RFC 9110'),
  S(423, 'Locked', 'The resource is locked.', 'WebDAV locking.', 'RFC 4918'),
  S(424, 'Failed Dependency', 'The request failed because an earlier request it depended on failed.', 'WebDAV operations that depend on one another.', 'RFC 4918'),
  S(425, 'Too Early', 'The server won’t risk processing a request sent in TLS early data, because it might be replayed.', 'TLS 1.3 0-RTT requests that aren’t safe to replay.', 'RFC 8470'),
  S(426, 'Upgrade Required', 'The server refuses the request over the current protocol; the client should upgrade.', 'Requiring a newer protocol; name it in an Upgrade header.', 'RFC 9110'),
  S(428, 'Precondition Required', 'The server requires the request to be conditional.', 'Forcing clients to send If-Match, so they can’t overwrite each other’s changes.', 'RFC 6585'),
  S(429, 'Too Many Requests', 'The client sent too many requests in a given time.', 'Rate limiting. A Retry-After header says when to try again.', 'RFC 6585'),
  S(431, 'Request Header Fields Too Large', 'The headers, or one header, are too large.', 'Oversized cookies or headers.', 'RFC 6585'),
  S(451, 'Unavailable For Legal Reasons', 'The server can’t provide the resource for legal reasons.', 'Content blocked by a legal demand.', 'RFC 7725'),

  S(500, 'Internal Server Error', 'Something went wrong on the server, and there’s no more specific code.', 'Unhandled exceptions and other server bugs.', 'RFC 9110'),
  S(501, 'Not Implemented', 'The server doesn’t support the feature needed for this request.', 'An unrecognised method.', 'RFC 9110'),
  S(502, 'Bad Gateway', 'A gateway or proxy got an invalid response from the server behind it.', 'From a reverse proxy or load balancer when the app server crashed or sent garbage.', 'RFC 9110'),
  S(503, 'Service Unavailable', 'The server can’t handle the request right now.', 'Overload or maintenance. A Retry-After header says when to come back.', 'RFC 9110'),
  S(504, 'Gateway Timeout', 'A gateway or proxy didn’t get a response in time from the server behind it.', 'From a reverse proxy when the app server is too slow.', 'RFC 9110'),
  S(505, 'HTTP Version Not Supported', 'The server doesn’t support the HTTP version of the request.', 'Rare.', 'RFC 9110'),
  S(506, 'Variant Also Negotiates', 'The server’s content negotiation is misconfigured and loops.', 'A server configuration error with transparent negotiation; rare.', 'RFC 2295'),
  S(507, 'Insufficient Storage', 'The server can’t store what it needs to complete the request.', 'WebDAV, when the disk or quota is full.', 'RFC 4918'),
  S(508, 'Loop Detected', 'The server found an infinite loop while processing the request.', 'WebDAV with bindings.', 'RFC 5842'),
  S(510, 'Not Extended', 'The request needs an extension the server doesn’t have. Marked obsoleted (historic) by IANA.', 'Rare; don’t rely on it.', 'RFC 2774'),
  S(511, 'Network Authentication Required', 'The client must sign in to the network first.', 'Sent by captive portals, such as hotel or airport Wi-Fi login pages.', 'RFC 6585'),
];

const U = (code: number, name: string, by: string, meaning: string): StatusCode => ({ code, name, meaning, use: '', spec: '', unofficial: by });

/** Codes some products send that aren’t in the IANA registry. */
export const UNOFFICIAL_CODES: StatusCode[] = [
  U(444, 'No Response', 'nginx', 'Logged when nginx closes the connection without sending any response. It never reaches the client.'),
  U(499, 'Client Closed Request', 'nginx', 'Logged when the client closed the connection before nginx could reply.'),
  U(520, 'Web Server Returned an Unknown Error', 'Cloudflare', 'The origin server returned an empty, unknown or unexpected response.'),
  U(521, 'Web Server Is Down', 'Cloudflare', 'The origin server refused the connection.'),
  U(522, 'Connection Timed Out', 'Cloudflare', 'Cloudflare couldn’t complete a TCP connection to the origin in time.'),
  U(523, 'Origin Is Unreachable', 'Cloudflare', 'Cloudflare couldn’t reach the origin server, often a DNS or routing problem.'),
  U(524, 'A Timeout Occurred', 'Cloudflare', 'Cloudflare connected to the origin, but it didn’t send an HTTP response in time.'),
  U(525, 'SSL Handshake Failed', 'Cloudflare', 'The TLS handshake between Cloudflare and the origin failed.'),
  U(526, 'Invalid SSL Certificate', 'Cloudflare', 'Cloudflare couldn’t validate the origin’s TLS certificate.'),
];

export const CLASSES: { id: string; label: string; summary: string }[] = [
  { id: '1', label: '1xx', summary: 'Informational' },
  { id: '2', label: '2xx', summary: 'Success' },
  { id: '3', label: '3xx', summary: 'Redirection' },
  { id: '4', label: '4xx', summary: 'Client error' },
  { id: '5', label: '5xx', summary: 'Server error' },
];

/** Filters by class ("all" or "1"–"5") and a search over the number, name and text. */
export function filterCodes(codes: StatusCode[], cls: string, query: string): StatusCode[] {
  const q = query.trim().toLowerCase();
  const words = q.split(/\s+/).filter(Boolean);
  return codes.filter((c) => {
    if (cls !== 'all' && String(c.code)[0] !== cls) return false;
    if (!words.length) return true;
    // "4xx" or "40" searches by number prefix
    if (/^\d[\dx]{0,2}$/.test(q)) return String(c.code).startsWith(q.replace(/x/g, ''));
    const hay = `${c.code} ${c.name} ${c.meaning} ${c.use} ${c.note ?? ''} ${c.unofficial ?? ''}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}

/** "404 Not Found" */
export const codeLine = (c: StatusCode) => `${c.code} ${c.name}`;
