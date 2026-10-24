import type { WordEntry, WordNode, WordEdge, Relation } from './types';
import { words } from './data/words';
import { addRecordStatus, layoutAncestry, readNarrative } from './ancestry';

interface EtymologyTerm {
  term?: string;
  lang_name?: string;
  children?: EtymologyTerm[];
  terms?: EtymologyTerm[];
  keyword?: string;
  is_uncertain?: boolean;
  gloss?: string;
  status?: string;
}

const clean = (text: string) => text.replace(/\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/g, '$1').replace(/\[\d+\]/g, '').replace(/\s+/g, ' ').trim();

export function normalizeWord(value: string): string {
  const word = value.trim().normalize('NFC').toLocaleLowerCase('en');
  if (!word || word.length > 80 || !/^[\p{L}\p{M}][\p{L}\p{M}\s'’\-]*$/u.test(word)) {
    throw new Error('Enter a word using letters, spaces, apostrophes, or hyphens.');
  }
  return word;
}

export function parseEntry(word: string, html: string): WordEntry {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const englishHeading = doc.querySelector('h2#English');
  if (!englishHeading) throw new Error(`No English entry was found for “${word}”. Try another word.`);
  const english = doc.createElement('div');
  let sibling = (englishHeading.closest('.mw-heading') ?? englishHeading).nextElementSibling;
  while (sibling && !sibling.matches('h2, .mw-heading2')) {
    english.append(sibling.cloneNode(true));
    sibling = sibling.nextElementSibling;
  }
  english.querySelectorAll('sup.reference, .mw-editsection, style, script').forEach(el => el.remove());
  const etymologyHeading = english.querySelector('h3[id^="Etymology"]');
  const etymology = doc.createElement('div');
  const paragraphs: string[] = [];
  let next = (etymologyHeading?.closest('.mw-heading') ?? etymologyHeading)?.nextElementSibling;
  while (next && !next.matches('h3, h4, .mw-heading')) {
    if (next.matches('p')) paragraphs.push(clean(next.textContent ?? ''));
    etymology.append(next.cloneNode(true));
    next = next.nextElementSibling;
  }
  // Restrict definitions and tree data to the same English etymology.
  const sense = doc.createElement('div');
  let senseBlock = (etymologyHeading?.closest('.mw-heading') ?? etymologyHeading)?.nextElementSibling ?? english.firstElementChild;
  while (senseBlock && !senseBlock.querySelector('h3[id^="Etymology"]') && !senseBlock.matches('h3[id^="Etymology"]')) {
    sense.append(senseBlock.cloneNode(true)); senseBlock = senseBlock.nextElementSibling;
  }
  const definition = [...sense.querySelectorAll('ol:not(.references) > li')].find(el => !el.closest('[data-ety-tree-json]') && el.textContent?.trim())?.cloneNode(true) as HTMLElement | undefined;
  const recordedDate = definition?.querySelector('.defdate')?.textContent?.replace(/^\[|\]$/g, '').trim();
  definition?.querySelectorAll('ul, dl, ol, .quotation, .citation, .HQToggle, .synonym, .nyms-toggle').forEach(el => el.remove());
  const structured = etymology.querySelector('[data-ety-tree-json]')?.getAttribute('data-ety-tree-json');
  const sourceUrl = `https://en.wiktionary.org/wiki/${encodeURIComponent(word)}#English`;
  const nodes: WordNode[] = [];
  const edges: WordEdge[] = [];
  let partial = false;

  function flatten(term: EtymologyTerm, uncertain = false, label = ''): { term: EtymologyTerm; uncertain: boolean; label: string }[] {
    const isUncertain = uncertain || !!term.is_uncertain;
    const relation = term.keyword === 'calque' ? 'calque · translated model' : /bor$/.test(term.keyword ?? '') ? 'borrowed' : term.keyword === 'inherited' ? 'inherited' : term.keyword === 'affix' ? 'component' : label;
    if (term.term) return [{ term, uncertain: isUncertain, label: relation }];
    return (term.terms ?? term.children ?? []).flatMap(item => flatten(item, isUncertain, relation));
  }
  function visit(term: EtymologyTerm, depth: number): WordNode {
    const node: WordNode = {
      id: `node-${nodes.length}`, term: clean(term.term ?? word), language: term.lang_name ?? 'Language not specified',
      x: 0, y: depth, kind: depth === 0 ? 'word' : 'ancestor', gloss: term.gloss ? clean(term.gloss) : undefined,
      note: 'This relationship is transcribed from Wiktionary’s structured etymology. Follow the source to see alternate analyses, citations, and the full entry.',
      sourceUrl,
    };
    nodes.push(node);
    const ancestors = (term.children ?? []).flatMap(item => flatten(item));
    if (ancestors.length > 5 || (depth >= 10 && ancestors.length > 0) || nodes.length > 48) partial = true;
    const parents = depth < 10 && nodes.length <= 48 ? ancestors.slice(0, 5).map(({ term: parent, uncertain, label }) => {
      const source = visit(parent, depth + 1);
      edges.push({ from: source.id, to: node.id, label: uncertain ? `${label || 'derivation'} · uncertain` : label, uncertain: uncertain || label.startsWith('calque') });
      return source;
    }) : [];
    if (!parents.length && depth) node.kind = 'root';
    return node;
  }

  if (structured) {
    try { visit(JSON.parse(structured), 0); }
    catch { nodes.length = 0; edges.length = 0; partial = true; }
  }
  let narrative = false, lemma: string | undefined;
  if (!edges.length) {
    const prose = readNarrative(word, etymology, sourceUrl);
    nodes.splice(0, nodes.length, ...prose.nodes); edges.splice(0, edges.length, ...prose.edges);
    narrative = prose.edges.length > 0;
  }
  const form = definition?.querySelector('.form-of-definition');
  const base = form?.querySelector('.form-of-definition-link .mention[lang="en"]');
  if (!edges.length && base?.textContent) {
    lemma = clean(base.textContent);
    const current = nodes.find(node => node.kind === 'word')!;
    nodes.push({ id: 'lemma', term: lemma, language: 'English', kind: 'ancestor', x: 0, y: 0, sourceUrl, note: clean(form?.textContent ?? '') });
    edges.push({ from: 'lemma', to: current.id, label: clean(form?.textContent ?? '').replace(/\s+of\s+.*/i, '') });
  }
  const unknown = !edges.length;
  if (unknown) addRecordStatus(nodes, edges, false, paragraphs.join('\n\n') || undefined);
  const dimensions = layoutAncestry(nodes, edges);
  const relatives: WordEntry['relatives'] = [];
  for (const [section, relation] of [['Derived_terms', 'descendant'], ['Related_terms', 'related term'], ['Synonyms', 'kindred meaning']] as [string, Relation][]) {
    const heading = sense.querySelector(`[id="${section}"], [id="${section}_2"]`);
    let block = (heading?.closest('.mw-heading') ?? heading)?.nextElementSibling;
    let count = 0;
    while (block && !block.matches('.mw-heading, h3, h4') && count < 4) {
      block.querySelectorAll('[lang="en"] a').forEach(anchor => {
        const term = clean(anchor.textContent ?? '');
        if (term && term !== word && count < 4 && !relatives.some(item => item.word === term)) {
          relatives.push({ word: term, relation, note: `Listed under ${section.replace('_', ' ').toLowerCase()} in the English Wiktionary entry.` });
          count++;
        }
      });
      block = block.nextElementSibling;
    }
  }
  const partOfSpeech = [...sense.querySelectorAll('h3, h4')].find(el => /^(Noun|Verb|Adjective|Adverb|Interjection|Preposition|Pronoun|Conjunction|Determiner|Proper noun|Prefix|Suffix)$/.test(el.textContent ?? ''))?.textContent?.toLowerCase() ?? 'English word';
  const languagePath = [...new Set([...nodes].filter(node => node.kind !== 'evidence').sort((a, b) => a.y - b.y).map(node => node.language))];
  return {
    word, pronunciation: english.querySelector('.IPA')?.textContent ?? '', partOfSpeech,
    definition: clean(definition?.textContent ?? '') || 'Consult the source entry for the senses of this word.',
    date: recordedDate?.replace(/^from\s+/i, '') ?? 'Not established',
    dateNote: recordedDate ? `Wiktionary dates the selected English sense “${recordedDate}”. This dates the sense, not necessarily the modern spelling or the word’s first spoken use.` : 'A verified earliest English attestation is not supplied here. Dates in the source’s narrative may refer to other languages or later quotations.',
    origin: languagePath.join(' → '),
    story: paragraphs.join('\n\n') || 'No separate etymology is recorded for this sense in the source. Open the full dictionary entry for available usage notes and related forms.',
    construction: unknown ? 'Ancestry not supplied by the source' : lemma ? 'Recorded inflected form' : narrative ? 'Explicit derivations in the recorded etymology' : 'Recorded ancestry · first English etymology',
    nodes, edges, relatives: relatives.slice(0, 8),
    sources: [{ name: 'Wiktionary · English entry', url: sourceUrl }],
    live: true, partial, ...dimensions, lemma,
    diagramNote: unknown ? 'No ancestral forms are established in this source. The dotted branch marks a gap in the record.' : narrative ? 'Branches follow explicit derivations in the source prose. Comparisons and cognates are not shown as ancestors.' : undefined,
  };
}

const cache = new Map<string, WordEntry>();

export function unrecordedEntry(word: string, message: string): WordEntry {
  const nodes: WordNode[] = [{ id: 'word', term: word, language: 'Search term', kind: 'word', x: 0, y: 0 }];
  const edges: WordEdge[] = [];
  addRecordStatus(nodes, edges, true, message);
  return { word, pronunciation: '', partOfSpeech: 'Unverified entry', definition: message, date: 'Not established', dateNote: 'No attestation is available in the selected source.',
    origin: 'Not established', story: message, construction: 'No ancestry established', nodes, edges, relatives: [], sources: [{ name: 'Wiktionary search', url: `https://en.wiktionary.org/w/index.php?search=${encodeURIComponent(word)}` }],
    live: true, missing: true, ...layoutAncestry(nodes, edges), diagramNote: 'The dotted branch represents a missing source record, not a historical derivation.' };
}

export async function lookupWord(value: string, signal?: AbortSignal, following = new Set<string>()): Promise<WordEntry> {
  const word = normalizeWord(value);
  if (words[word]) return words[word];
  if (cache.has(word)) return cache.get(word)!;
  const timeout = AbortSignal.timeout(18000);
  let response: Response;
  try {
    response = await fetch(`https://en.wiktionary.org/w/api.php?action=parse&page=${encodeURIComponent(word)}&prop=text&format=json&origin=*&redirects=1`, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error('The dictionary could not be reached. Please try again.');
  }
  if (!response.ok) throw new Error('The dictionary is temporarily unavailable. Prepared entries remain available.');
  const data = await response.json();
  if (!data.parse?.text?.['*']) {
    if (data.error?.code && data.error.code !== 'missingtitle') throw new Error('The dictionary is temporarily unavailable. Please try again.');
    return unrecordedEntry(word, `No English dictionary entry was found for “${word}”. Check the spelling or consult another source.`);
  }
  let entry: WordEntry;
  try { entry = parseEntry(word, data.parse.text['*']); }
  catch (error) {
    if (error instanceof Error && error.message.startsWith('No English entry')) return unrecordedEntry(word, error.message);
    throw error;
  }
  if (entry.lemma && !following.has(entry.lemma) && following.size < 3) {
    try {
      const base = await lookupWord(entry.lemma, signal, new Set([...following, word]));
      if (!base.missing) {
        const baseWord = base.nodes.find(node => node.kind === 'word')!;
        entry.nodes = entry.nodes.filter(node => node.id !== 'lemma');
        entry.edges = entry.edges.map(edge => edge.from === 'lemma' ? { ...edge, from: `base-${baseWord.id}` } : edge);
        entry.nodes.push(...base.nodes.map(node => ({ ...node, id: `base-${node.id}`, kind: node.kind === 'word' ? 'ancestor' as const : node.kind })));
        entry.edges.push(...base.edges.map(edge => ({ ...edge, from: `base-${edge.from}`, to: `base-${edge.to}` })));
        entry.sources.push(...base.sources.filter(source => !entry.sources.some(item => item.url === source.url)));
        Object.assign(entry, layoutAncestry(entry.nodes, entry.edges));
        entry.origin = [...new Set([...entry.nodes].filter(node => node.kind !== 'evidence').sort((a, b) => a.y - b.y).map(node => node.language))].join(' → ');
      }
    } catch (error) { if (signal?.aborted) throw error; /* The verified form-of branch remains usable. */ }
  }
  cache.set(word, entry);
  return entry;
}
