import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.WORD_PEDIGREE_URL ?? 'http://127.0.0.1:5173';
await mkdir('test-results', { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const heading = () => page.locator('.word-title h2');
const waitForWord = word => page.waitForFunction(value => document.querySelector('.word-title h2')?.textContent === value && !document.querySelector('.entry-loading'), word);

try {
  await page.goto(base, { waitUntil: 'networkidle' });
  assert.equal(await heading().textContent(), 'nostalgia');
  assert.equal(await page.locator('.word-node').count(), 4);
  await page.getByRole('button', { name: 'Read about nóstos, Ancient Greek', exact: true }).click();
  assert.match(await page.getByRole('dialog').innerText(), /Greek noun for a homecoming/);
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('dialog').count(), 0);

  await page.getByRole('button', { name: 'Sources', exact: false }).click();
  assert.equal(await page.getByRole('dialog').locator('a').count(), 2);
  await page.getByRole('button', { name: 'Close notes' }).click();

  await page.getByRole('button', { name: 'Save word', exact: true }).click();
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.getByRole('button', { name: 'Saved', exact: true }).getAttribute('aria-pressed'), 'true');
  await page.getByRole('button', { name: 'Saved words (1)', exact: true }).click();
  await page.getByRole('button', { name: 'Saved (1)', exact: true }).click();
  assert.equal(await page.locator('.cabinet-card').count(), 1);
  await page.getByRole('button', { name: 'All entries', exact: true }).click();
  assert.equal(await page.locator('.cabinet-card').count(), 5);
  await page.screenshot({ path: 'test-results/cabinet.png', fullPage: true });

  await page.getByRole('button', { name: 'petrichor', exact: true }).click();
  await waitForWord('petrichor');
  assert.match(await page.locator('.date').innerText(), /1964/);
  await page.getByRole('button', { name: 'Increase diagram magnification' }).click();
  assert.equal(await page.getByRole('button', { name: 'Reset diagram magnification' }).textContent(), '115%');
  await page.getByRole('button', { name: 'Reset diagram magnification' }).click();
  await page.getByRole('button', { name: 'companion', exact: true }).click();
  await waitForWord('companion');
  await page.goBack(); await waitForWord('petrichor');
  await page.goForward(); await waitForWord('companion');

  await page.getByLabel('A word to trace', { exact: true }).fill('butterfly');
  await page.locator('.search-form button[type="submit"]').click();
  await waitForWord('butterfly');
  assert.match(await page.locator('.definition').innerText(), /flying insect/i);
  assert.ok(await page.locator('.word-node').count() > 3);
  assert.match(await page.locator('.entry-source-note').innerText(), /CC BY-SA/);
  await page.screenshot({ path: 'test-results/live-entry.png', fullPage: true });

  await page.route('**/en.wiktionary.org/w/api.php**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ error: { code: 'missingtitle' } }) }));
  await page.getByLabel('A word to trace', { exact: true }).fill('zxqmissingword');
  await page.locator('.search-form button[type="submit"]').click();
  await waitForWord('zxqmissingword');
  assert.match(await page.locator('.definition').innerText(), /No English dictionary entry/);
  assert.equal(await page.locator('.word-node-evidence').count(), 1);
  assert.equal(await page.locator('.word-node-selected').textContent().then(text => text.includes('zxqmissingword')), true);

  await page.unroute('**/en.wiktionary.org/w/api.php**');
  await page.route('**/en.wiktionary.org/w/api.php**', route => route.abort());
  await page.getByLabel('A word to trace', { exact: true }).fill('unreachable');
  await page.locator('.search-form button[type="submit"]').click();
  await page.waitForFunction(() => document.querySelector('[role="alert"]')?.textContent.includes('could not be reached'));
  await page.getByRole('button', { name: 'serendipity', exact: true }).click();
  await waitForWord('serendipity');
  assert.equal(await page.getByRole('alert').count(), 0);

  await page.goto(`${base}/?word=nostalgia`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Saved', exact: true }).click();
  await page.waitForFunction(() => !document.querySelector('.notice-visible'));
  await page.screenshot({ path: 'test-results/desktop-final.png', fullPage: true });
  for (const width of [390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.waitForFunction(() => document.querySelector('.parchment-light canvas')?.getBoundingClientRect().width <= window.innerWidth);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `No page overflow at ${width}px`);
    await page.screenshot({ path: `test-results/viewport-${width}.png`, fullPage: true });
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await heading().textContent(), 'nostalgia');
  assert.deepEqual(errors, []);
  console.log('Passed: root/source dialogs, persisted cabinet, curated search, live search, zoom, history, missing entries, network recovery, reduced motion, and responsive layouts.');
} finally { await browser.close(); }
