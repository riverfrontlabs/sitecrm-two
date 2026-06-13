/**
 * URL helpers for rendering user-supplied links safely.
 *
 * Lead `website` values originate from scraping / manual entry, so they must
 * never be trusted as hrefs directly — a `javascript:` or `data:` URL would
 * execute in the user's session when clicked. {@link safeExternalHref} returns
 * the URL only when it parses as http(s); otherwise `undefined` so callers can
 * render plain text instead of a link.
 */

/** Returns `url` if it is a valid http(s) URL, otherwise `undefined`. */
export function safeExternalHref(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? url : undefined;
  } catch {
    return undefined;
  }
}

/** Strips the protocol for compact display (e.g. `https://acme.com/x` → `acme.com/x`). */
export function displayHost(url: string): string {
  return url.replace(/^https?:\/\//, '');
}
