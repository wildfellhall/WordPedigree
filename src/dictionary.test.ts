import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchDictionaryPage } from './dictionary';

const html = '<h2 id="English">English</h2><p>A recorded entry.</p>';
const success = () => new Response(JSON.stringify({ parse: { text: { '*': html } } }));
const apiError = (code: string) => new Response(JSON.stringify({ error: { code } }));

describe('dictionary connection', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it.each([408, 500, 502, 503, 504])('recovers from a temporary HTTP %i without another search', async status => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response('', { status })).mockResolvedValueOnce(success());
    vi.stubGlobal('fetch', fetchMock);
    const result = fetchDictionaryPage('butterfly');
    await vi.runAllTimersAsync();
    expect(await result).toBe(html);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('recovers from an interrupted connection', async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(success());
    vi.stubGlobal('fetch', fetchMock);
    const result = fetchDictionaryPage('butterfly');
    await vi.runAllTimersAsync();
    expect(await result).toBe(html);
  });

  it.each(['maxlag', 'ratelimited', 'readonly'])('recovers from a %s error inside an HTTP 200 response', async code => {
    const fetchMock = vi.fn().mockResolvedValueOnce(apiError(code)).mockResolvedValueOnce(success());
    vi.stubGlobal('fetch', fetchMock);
    const result = fetchDictionaryPage('butterfly');
    await vi.advanceTimersByTimeAsync(4999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(await result).toBe(html);
  });

  it.each(['8', 'date'])('respects Retry-After expressed as %s', async value => {
    const retryAfter = value === 'date' ? new Date(Date.now() + 8000).toUTCString() : value;
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response('', { status: 429, headers: { 'Retry-After': retryAfter } })).mockResolvedValueOnce(success());
    vi.stubGlobal('fetch', fetchMock);
    const result = fetchDictionaryPage('butterfly');
    await vi.advanceTimersByTimeAsync(7000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(await result).toBe(html);
  });

  it('stops when the requested cooldown exceeds the search deadline', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 429, headers: { 'Retry-After': '120' } }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchDictionaryPage('butterfly')).rejects.toThrow('dictionary is busy');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([403, 404])('does not retry a permanent HTTP %i response or treat it as a missing word', async status => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchDictionaryPage('butterfly')).rejects.toThrow(`HTTP ${status}`);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns a missing record only when the API explicitly reports missingtitle', async () => {
    const fetchMock = vi.fn().mockResolvedValue(apiError('missingtitle'));
    vi.stubGlobal('fetch', fetchMock);
    expect(await fetchDictionaryPage('unknown')).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each(['{}', 'null', '{"parse":{"text":{"*":42}}}', '<html>Service unavailable</html>'])('never turns an invalid response into invented absence: %s', async body => {
    const fetchMock = vi.fn().mockImplementation(async () => new Response(body));
    vi.stubGlobal('fetch', fetchMock);
    const assertion = expect(fetchDictionaryPage('butterfly')).rejects.toThrow('incomplete response');
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('stops after three attempts when the network remains unavailable', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);
    const assertion = expect(fetchDictionaryPage('butterfly')).rejects.toThrow('could not be reached');
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('cancels a pending retry when another word is selected', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();
    const assertion = expect(fetchDictionaryPage('butterfly', controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    await vi.advanceTimersByTimeAsync(500);
    controller.abort();
    await assertion;
    await vi.runAllTimersAsync();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('bounds slow connection attempts to a total of thirty seconds', async () => {
    vi.spyOn(AbortSignal, 'timeout').mockImplementation(delay => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(new DOMException('Timed out', 'TimeoutError')), delay);
      return controller.signal;
    });
    const fetchMock = vi.fn().mockImplementation((_url, { signal }: RequestInit) => new Promise((_resolve, reject) => {
      signal!.addEventListener('abort', () => reject(signal!.reason), { once: true });
    }));
    vi.stubGlobal('fetch', fetchMock);
    const assertion = expect(fetchDictionaryPage('butterfly')).rejects.toThrow('could not be reached');
    await vi.advanceTimersByTimeAsync(29999);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not start a request that has already been cancelled', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchDictionaryPage('butterfly', AbortSignal.abort())).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('cancels an active request without retrying', async () => {
    const fetchMock = vi.fn().mockImplementation((_url, { signal }: RequestInit) => new Promise((_resolve, reject) => {
      signal!.addEventListener('abort', () => reject(signal!.reason), { once: true });
    }));
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();
    const assertion = expect(fetchDictionaryPage('butterfly', controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort();
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('identifies the application and safely encodes the word in a cacheable, anonymous request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(success());
    vi.stubGlobal('fetch', fetchMock);
    await fetchDictionaryPage('café');
    const [url, options] = fetchMock.mock.calls[0];
    expect(new URL(url).searchParams.get('page')).toBe('café');
    expect(new URL(url).searchParams.get('maxage')).toBe('300');
    expect(options.credentials).toBe('omit');
    expect(options.headers['Api-User-Agent']).toContain('wildfellhall/WordPedigree');
  });
});
