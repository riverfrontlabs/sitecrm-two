import { describe, expect, it } from 'vitest';
import { UnsafeUrlError, assertSafeScrapeUrl } from './url-guard.js';

/**
 * These cover the cases that resolve synchronously (no DNS) — bad schemes,
 * internal hostnames, and literal private/loopback/link-local IPs — plus a
 * public literal IP that must pass. Hostname-resolution paths aren't exercised
 * here to keep the suite network-free.
 */
describe('assertSafeScrapeUrl', () => {
  it('rejects non-http(s) schemes', async () => {
    for (const url of ['javascript:alert(1)', 'file:///etc/passwd', 'ftp://example.com', 'data:text/html,x']) {
      await expect(assertSafeScrapeUrl(url)).rejects.toBeInstanceOf(UnsafeUrlError);
    }
  });

  it('rejects malformed URLs', async () => {
    await expect(assertSafeScrapeUrl('not a url')).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it('rejects internal hostnames', async () => {
    for (const url of ['http://localhost/x', 'http://db.local', 'http://api.internal/health']) {
      await expect(assertSafeScrapeUrl(url)).rejects.toBeInstanceOf(UnsafeUrlError);
    }
  });

  it('rejects private, loopback, and link-local IPv4 literals', async () => {
    for (const host of ['10.0.0.5', '127.0.0.1', '169.254.169.254', '172.16.0.1', '192.168.1.1', '100.64.0.1']) {
      await expect(assertSafeScrapeUrl(`http://${host}/`)).rejects.toBeInstanceOf(UnsafeUrlError);
    }
  });

  it('rejects the IPv6 loopback', async () => {
    await expect(assertSafeScrapeUrl('http://[::1]/')).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it('allows a public IP literal', async () => {
    await expect(assertSafeScrapeUrl('https://8.8.8.8/')).resolves.toBeUndefined();
  });
});
