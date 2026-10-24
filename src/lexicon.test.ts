// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { lookupWord, normalizeWord, parseEntry } from './lexicon';
import { words } from './data/words';

const heading = (level: number, text: string) => `<div class="mw-heading mw-heading${level}"><h${level} id="${text}">${text}</h${level}></div>`;
function fixture(options: { tree?: unknown; date?: string; emptyFirst?: boolean } = {}) {
  return `${heading(2, 'English')}${heading(3, 'Etymology')}
    ${options.tree ? `<ul data-ety-tree-json='${JSON.stringify(options.tree)}'></ul>` : ''}
    <p>Borrowed from a recorded antecedent in 1688.<sup class="reference">[1]</sup></p>
    ${heading(3, 'Pronunciation')}<span class="IPA">/test/</span>
    ${heading(3, 'Noun')}<ol>${options.emptyFirst ? '<li class="mw-empty-elt"></li>' : ''}<li>A sample definition.${options.date ? `<span class="defdate">[from ${options.date}]</span>` : ''}<ul><li>A quotation from 1901.</li></ul></li></ol>
    ${heading(3, 'Derived_terms')}<ul><li><span lang="en"><a>sampled</a></span></li></ul>
    ${heading(3, 'Synonyms')}<ul><li><span lang="en"><a>example</a></span></li></ul>
    ${heading(2, 'French')}${heading(3, 'Noun')}<ol><li>A different-language definition.</li></ol>`;
}

describe('word input', () => {
  it('normalizes case and preserves diacritics and legitimate word separators', () => {
    expect(normalizeWord('  CAFÉ  ')).toBe('café');
    expect(normalizeWord('mother-in-law')).toBe('mother-in-law');
    expect(normalizeWord('old world')).toBe('old world');
  });
  it('rejects empty, excessively long, and non-word input', () => {
    for (const input of ['', ' ', '<script>', '123', 'a'.repeat(81)]) expect(() => normalizeWord(input)).toThrow();
  });
});

describe('dictionary interpretation', () => {
  it('skips empty list items and removes quotations from the definition', () => {
    const entry = parseEntry('sample', fixture({ emptyFirst: true }));
    expect(entry.definition).toBe('A sample definition.');
    expect(entry.pronunciation).toBe('/test/');
    expect(entry.partOfSpeech).toBe('noun');
    expect(entry.definition).not.toContain('different-language');
  });
  it('does not mistake a date in an etymology or quotation for first English use', () => {
    expect(parseEntry('sample', fixture()).date).toBe('Not established');
  });
  it('preserves an explicitly dated sense and explains its scope', () => {
    const entry = parseEntry('sample', fixture({ date: '11th c.' }));
    expect(entry.date).toBe('11th c.');
    expect(entry.dateNote).toContain('not necessarily the modern spelling');
  });
  it('keeps semantic neighbours separate from descendants', () => {
    const { relatives } = parseEntry('sample', fixture());
    expect(relatives).toEqual([
      expect.objectContaining({ word: 'sampled', relation: 'descendant' }),
      expect.objectContaining({ word: 'example', relation: 'kindred meaning' }),
    ]);
  });
  it('preserves uncertain links and translated models in a branching tree', () => {
    const entry = parseEntry('sample', fixture({ tree: {
      term: 'sample', lang_name: 'English', children: [
        { keyword: 'bor', is_uncertain: true, terms: [{ term: 'exemplum', lang_name: 'Latin', children: [] }] },
        { keyword: 'calque', terms: [{ term: 'Vorbild', lang_name: 'German', children: [] }] },
      ],
    } }));
    expect(entry.nodes).toHaveLength(3);
    expect(entry.edges.every(edge => edge.uncertain)).toBe(true);
    expect(entry.edges[0].label).toContain('uncertain');
    expect(entry.edges[1].label).toContain('calque');
    const current = entry.nodes.find(node => node.kind === 'word')!;
    expect(entry.nodes.filter(node => node.id !== current.id).every(node => node.y < current.y)).toBe(true);
  });
  it('marks an unavailable origin as a record gap, never as an ancestor', () => {
    const entry = parseEntry('sample', fixture());
    expect(entry.nodes).toHaveLength(2);
    expect(entry.nodes.find(node => node.kind === 'evidence')?.term).toBe('Origin unrecorded');
    expect(entry.edges[0].uncertain).toBe(true);
    expect(entry.construction).toContain('not supplied');
  });
  it('rejects pages without an English entry', () => {
    expect(() => parseEntry('sample', heading(2, 'French'))).toThrow('No English entry');
  });
  it('marks truncated trees instead of implying the root is complete', () => {
    let tree: object = { term: 'oldest', lang_name: 'Latin' };
    for (let i = 0; i < 14; i++) tree = { term: `stage-${i}`, lang_name: 'English', children: [{ terms: [tree] }] };
    const entry = parseEntry('sample', fixture({ tree }));
    expect(entry.partial).toBe(true);
    expect(entry.nodes).toHaveLength(11);
  });
});

describe('lookup availability', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('serves prepared words without networking', async () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    expect(await lookupWord('nostalgia')).toBe(words.nostalgia);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('provides a recoverable message when the dictionary cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(lookupWord('unprepared')).rejects.toThrow('could not be reached');
  });
  it('gives a missing search its own diagram without inventing ancestry', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ error: { code: 'missingtitle' } }) }));
    const entry = await lookupWord('zxqmissingword');
    expect(entry.missing).toBe(true);
    expect(entry.word).toBe('zxqmissingword');
    expect(entry.nodes.find(node => node.kind === 'evidence')?.term).toBe('No entry found');
    expect(entry.nodes.filter(node => node.kind === 'ancestor' || node.kind === 'root')).toHaveLength(0);
  });
  it('follows the lemma of an inflected form and retains both source records', async () => {
    const formHtml = `${heading(2, 'English')}${heading(3, 'Noun')}<ol><li><span class="form-of-definition">plural of <span class="form-of-definition-link"><i class="mention" lang="en"><a>testbase</a></i></span></span></li></ol>`;
    const baseHtml = fixture({ tree: { term: 'testbase', lang_name: 'English', children: [{ term: 'antecedent', lang_name: 'Latin' }] } });
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => Promise.resolve({ ok: true, json: async () => ({ parse: { text: { '*': url.includes('page=testbases&') ? formHtml : baseHtml } } }) })));
    const entry = await lookupWord('testbases');
    expect(entry.nodes.map(node => node.term)).toEqual(['testbases', 'testbase', 'antecedent']);
    expect(entry.sources).toHaveLength(2);
    expect(entry.edges).toHaveLength(2);
    expect(entry.nodes.filter(node => node.kind === 'word')).toHaveLength(1);
  });
});

const mention = (term: string, lang = 'en') => `<i class="mention" lang="${lang}"><a href="/wiki/${term}#${lang === 'en' ? 'English' : 'Latin'}">${term}</a></i>`;
const prose = (text: string) => `${heading(2, 'English')}${heading(3, 'Etymology')}<p>${text}</p>${heading(3, 'Noun')}<ol><li>A definition.</li></ol>`;

describe('prose and form-of ancestry', () => {
  it('connects explicit from-clauses in order without a prebuilt tree', () => {
    const entry = parseEntry('sample', prose(`From ${mention('exemple', 'fr')}, from ${mention('exemplum', 'la')}. Compare ${mention('example')}.`));
    expect(entry.nodes.map(node => node.term)).toEqual(['sample', 'exemple', 'exemplum']);
    expect(entry.edges).toEqual([expect.objectContaining({ from: 'narrative-1', to: 'word' }), expect.objectContaining({ from: 'narrative-2', to: 'narrative-1' })]);
    expect(entry.nodes.every(node => node.kind === 'word' || node.sourceUrl)).toBe(true);
  });
  it('keeps parallel components separate instead of chaining them', () => {
    const entry = parseEntry('quixotic', prose(`Derived from ${mention('Quixote', 'es')}, the name of a character, + ${mention('-ic')}.`));
    expect(entry.edges.every(edge => edge.to === 'word')).toBe(true);
    expect(entry.nodes.map(node => node.term)).toContain('-ic');
  });
  it('preserves uncertainty and excludes cognates and displaced terms', () => {
    const entry = parseEntry('sample', prose(`Possibly from ${mention('oldword')}, from ${mention('olderword')}. Cognate with ${mention('cognate', 'la')}, from ${mention('not-an-ancestor', 'la')}.`));
    expect(entry.edges).toHaveLength(2);
    expect(entry.edges.every(edge => edge.uncertain)).toBe(true);
    expect(entry.nodes.some(node => node.term === 'cognate')).toBe(false);
  });
  it('does not interpret negated derivation or a plain comparison as ancestry', () => {
    for (const text of [`Not from ${mention('fiction')}.`, `Compare ${mention('fiction')}.`, `Cognate with ${mention('fiction')}.`]) {
      expect(parseEntry('sample', prose(text)).nodes.some(node => node.kind === 'ancestor' || node.kind === 'root')).toBe(false);
    }
  });
  it('preserves native spelling alongside a source-supplied transliteration', () => {
    const entry = parseEntry('mystery', prose(`From ${mention('μύω', 'grc')} (<span class="mention-tr">múō</span>, <span class="mention-gloss">to shut</span>).`));
    expect(entry.nodes[1]).toMatchObject({ term: 'múō', original: 'μύω', gloss: 'to shut', language: 'Ancient Greek' });
  });
  it('does not take a second sense’s tree for the first etymology', () => {
    const first = prose('Origin unknown.');
    const other = { term: 'sample', lang_name: 'English', children: [{ term: 'unrelated', lang_name: 'Latin' }] };
    const entry = parseEntry('sample', `${first}${heading(3, 'Etymology_2')}<ul data-ety-tree-json='${JSON.stringify(other)}'></ul>`);
    expect(entry.nodes.some(node => node.term === 'unrelated')).toBe(false);
    expect(entry.definition).toBe('A definition.');
  });
  it('does not splice competing later prose into the selected derivation', () => {
    const html = prose(`From ${mention('earlier')}.`).replace('</p>', `</p><p>Another account calls it a variant of ${mention('different')}, from ${mention('unrelated')}.</p>`);
    expect(parseEntry('sample', html).nodes.map(node => node.term)).toEqual(['sample', 'earlier']);
  });
  it('connects an inflected form to its recorded lemma', () => {
    const entry = parseEntry('dogs', `${heading(2, 'English')}${heading(3, 'Noun')}<ol><li><span class="form-of-definition">plural of <span class="form-of-definition-link">${mention('dog')}</span></span></li></ol>`);
    expect(entry.lemma).toBe('dog');
    expect(entry.edges[0].label).toBe('plural');
    expect(entry.nodes.map(node => node.term)).toEqual(['dogs', 'dog']);
  });
});

describe('prepared plates', () => {
  it('connects existing nodes in chronological display order and supplies sources', () => {
    for (const entry of Object.values(words)) {
      expect(entry.sources.length).toBeGreaterThan(0);
      for (const edge of entry.edges) {
        const parent = entry.nodes.find(node => node.id === edge.from);
        const child = entry.nodes.find(node => node.id === edge.to);
        expect(parent).toBeDefined(); expect(child).toBeDefined();
        expect(parent!.y).toBeLessThan(child!.y);
      }
    }
  });
});
