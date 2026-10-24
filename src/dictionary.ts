const endpoint = 'https://en.wiktionary.org/w/api.php';
const retryableStatus = new Set([408, 429, 500, 502, 503, 504]);
const retryableCodes = new Set(['maxlag', 'ratelimited', 'readonly']);

class DictionaryError extends Error {
  constructor(message: string, readonly retryable = true, readonly retryAfter = 0) { super(message); }
}

function retryDelay(response: Response): number {
  const value = response.headers.get('Retry-After');
  if (!value) return 0;
  const seconds = Number(value);
  const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(value) - Date.now();
  return Number.isFinite(delay) ? Math.max(0, delay) : 0;
}

function wait(delay: number, signal?: AbortSignal): Promise<void> {
  signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(signal?.reason); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, delay);
    signal?.addEventListener('abort', abort, { once: true });
  });
}

async function requestPage(url: string, signal: AbortSignal): Promise<string | null> {
  const response = await fetch(url, {
    signal,
    credentials: 'omit',
    headers: { 'Api-User-Agent': 'WordPedigree/0.1 (https://github.com/wildfellhall/WordPedigree)' },
  });
  const delay = retryDelay(response);
  if (!response.ok) {
    const message = response.status === 429
      ? 'The dictionary is busy. Please try again shortly.'
      : `The dictionary request failed (HTTP ${response.status}). Please try again.`;
    throw new DictionaryError(message, retryableStatus.has(response.status), Math.max(delay, response.status === 429 ? 5000 : 0));
  }
  let data: { parse?: { text?: { '*'?: unknown } }; error?: { code?: string } } | null;
  try { data = await response.json(); }
  catch (error) {
    if (signal.aborted) throw error;
    throw new DictionaryError('The dictionary returned an incomplete response. Please try again.', true, delay);
  }
  // MediaWiki can return service errors with HTTP 200. Only missingtitle proves absence.
  const code = data?.error?.code;
  if (code === 'missingtitle') return null;
  if (code) {
    throw new DictionaryError('The dictionary could not complete the request. Please try again.', retryableCodes.has(code), Math.max(delay, 5000));
  }
  const html = data?.parse?.text?.['*'];
  if (typeof html !== 'string' || !html.trim()) {
    throw new DictionaryError('The dictionary returned an incomplete response. Please try again.', true, delay);
  }
  return html;
}

export async function fetchDictionaryPage(word: string, signal?: AbortSignal): Promise<string | null> {
  // A short public cache reduces repeated parsing; entries still retain their source links.
  const url = `${endpoint}?action=parse&page=${encodeURIComponent(word)}&prop=text&format=json&origin=*&redirects=1&maxage=300&smaxage=300`;
  const deadline = Date.now() + 30000;
  for (let attempt = 0; attempt < 3; attempt++) {
    signal?.throwIfAborted();
    const timeout = AbortSignal.timeout(Math.max(1, Math.min(18000, deadline - Date.now())));
    try {
      return await requestPage(url, signal ? AbortSignal.any([signal, timeout]) : timeout);
    } catch (error) {
      signal?.throwIfAborted();
      const failure = error instanceof DictionaryError ? error
        : new DictionaryError('The dictionary could not be reached. Please try again.');
      const delay = Math.max(1000 * 2 ** attempt, failure.retryAfter);
      if (!failure.retryable || attempt === 2 || Date.now() + delay >= deadline) throw failure;
      await wait(delay, signal);
    }
  }
  throw new Error('The dictionary could not be reached. Please try again.');
}
