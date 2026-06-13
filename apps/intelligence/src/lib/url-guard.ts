/**
 * SSRF guard for outbound URLs the intelligence service will fetch/scrape.
 *
 * This service runs inside the AWS VPC, so an attacker who can control a scrape
 * target could otherwise pivot the headless browser into internal hosts or the
 * cloud metadata endpoint (169.254.169.254). {@link assertSafeScrapeUrl} rejects
 * non-http(s) schemes and any target that is — or resolves to — a private,
 * loopback, or link-local address.
 *
 * SECURITY: when the Phase-5 Playwright pipeline lands, it must also pin the
 * navigation to the address resolved here (or re-validate after each redirect)
 * to defeat DNS-rebinding between this check and the actual fetch.
 */
import { lookup } from 'node:dns/promises';
import net from 'node:net';

/** Thrown when a URL is unsafe to fetch. Carries a 400 status for the route. */
export class UnsafeUrlError extends Error {
  readonly statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = 'UnsafeUrlError';
  }
}

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return false;
  const [a, b] = parts as [number, number, number, number];
  if (a === 0 || a === 10 || a === 127) return true; // "this" net, private, loopback
  if (a === 169 && b === 254) return true; // link-local incl. 169.254.169.254 metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT (100.64.0.0/10)
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === '::1' || lower === '::') return true; // loopback / unspecified
  if (lower.startsWith('fe80')) return true; // link-local
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique-local
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/); // IPv4-mapped
  if (mapped) return isPrivateIPv4(mapped[1]!);
  return false;
}

function isPrivateAddress(ip: string): boolean {
  const family = net.isIP(ip);
  if (family === 4) return isPrivateIPv4(ip);
  if (family === 6) return isPrivateIPv6(ip);
  return false;
}

/**
 * Validates that `raw` is a public http(s) URL safe to fetch. Throws
 * {@link UnsafeUrlError} otherwise. Resolves DNS for hostname targets.
 */
export async function assertSafeScrapeUrl(raw: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new UnsafeUrlError('Invalid URL.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new UnsafeUrlError(`Unsupported URL scheme: ${parsed.protocol}`);
  }

  const host = parsed.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    throw new UnsafeUrlError('Refusing to fetch an internal hostname.');
  }

  if (net.isIP(host)) {
    if (isPrivateAddress(host)) {
      throw new UnsafeUrlError('Refusing to fetch a private, loopback, or link-local address.');
    }
    return;
  }

  let records: Array<{ address: string }>;
  try {
    records = await lookup(host, { all: true });
  } catch {
    throw new UnsafeUrlError('Could not resolve host.');
  }
  if (records.length === 0 || records.some((r) => isPrivateAddress(r.address))) {
    throw new UnsafeUrlError('Host resolves to a private, loopback, or link-local address.');
  }
}
