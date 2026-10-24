import type { WordEdge, WordNode } from './types';

const clean = (text: string) => text.replace(/\s+/g, ' ').trim();
const languages: Record<string, string> = { en: 'English', enm: 'Middle English', ang: 'Old English', la: 'Latin', grc: 'Ancient Greek', fr: 'French', fro: 'Old French', xno: 'Anglo-Norman', de: 'German', es: 'Spanish', it: 'Italian', ar: 'Arabic', sa: 'Sanskrit', 'ine-pro': 'Proto-Indo-European', 'gem-pro': 'Proto-Germanic' };

/** Read explicit derivation clauses in the published etymology. Mere mentions,
 * cognates, displaced words and comparisons are never treated as ancestors. */
export function readNarrative(word: string, section: HTMLElement, sourceUrl: string) {
  const current: WordNode = { id: 'word', term: word, language: 'English', kind: 'word', x: 0, y: 0 };
  const nodes: WordNode[] = [current], edges: WordEdge[] = [];
  for (const paragraph of section.querySelectorAll('p')) {
    if (paragraph.closest('.etymology-tree, .etymology-tree-list')) continue;
    // Later paragraphs often discuss competing analyses or usage history. Only
    // an explicit continuation of the origin can extend the selected account.
    if (edges.length && !/^\s*(?:ultimately|further|originally|earlier)\s+(?:derived\s+)?from\b/i.test(paragraph.textContent ?? '')) continue;
    const mentions = [...paragraph.querySelectorAll<HTMLElement>('.mention[lang]')];
    let previous: Element | null = null, chain = current.id, parallelTarget = current.id;
    let excluded = false, uncertain = false, components = false;
    const knownLanguages = new Map<string, string>();
    for (let i = 0; i < mentions.length; i++) {
      const mention = mentions[i], range = paragraph.ownerDocument.createRange();
      if (previous) range.setStartAfter(previous); else range.setStart(paragraph, 0);
      range.setEndBefore(mention);
      const fragment = range.cloneContents();
      fragment.querySelectorAll('.mention-gloss, .mention-tr').forEach(el => el.remove());
      const prefix = clean(fragment.textContent ?? '');
      const languageLabel = [...fragment.querySelectorAll('.etyl')].pop()?.textContent;
      const code = mention.lang;
      if (languageLabel) knownLanguages.set(code, clean(languageLabel));
      previous = mention;
      if (/\b(?:cognate|compare|akin|doublet|displaced|eclipsed|unrelated|not (?:derived )?from)\b/i.test(prefix)) excluded = true;
      if (excluded) continue;
      const direct = /\bfrom\b/i.test(prefix);
      const variant = /\b(?:variant|alteration|modification|spelling|shortening|abbreviation|contraction|clipping|inflection|plural|past tense|participle) of\b/i.test(prefix);
      const compound = /\b(?:compound|combination|blend) of\b/i.test(prefix) || /\+/.test(prefix);
      const continuation = edges.length > 0 && /^(?:\s|[,;]|and\b|or\b|\u200e|\u200f)*$/i.test(prefix);
      if (!direct && !variant && !compound && !continuation) continue;
      uncertain ||= /\b(?:possibly|perhaps|probably|uncertain|may|might|apparently|presumably)\b/i.test(prefix);
      const ultimate = /\bultimately\b/i.test(prefix);
      const equivalent = /\bequivalent\b/i.test(prefix);
      if (compound) components = true;
      let target = direct && !ultimate ? chain : variant || ultimate || compound ? current.id : parallelTarget;
      if (components) target = current.id;
      const term = clean(mention.textContent ?? '');
      if (!term || term === word && (code === 'en' || !code)) continue;
      const anchor = mention.querySelector('a');
      const fragmentLanguage = anchor?.getAttribute('href')?.split('#')[1]?.split(':')[0];
      let language = knownLanguages.get(code) ?? languages[code];
      if (!language && fragmentLanguage) { try { language = decodeURIComponent(fragmentLanguage).replaceAll('_', ' '); } catch { /* Keep the source language code. */ } }
      const suffix = paragraph.ownerDocument.createRange(); suffix.setStartAfter(mention);
      if (mentions[i + 1]) suffix.setEndBefore(mentions[i + 1]); else suffix.setEnd(paragraph, paragraph.childNodes.length);
      const annotation = suffix.cloneContents();
      const gloss = annotation.querySelector('.mention-gloss')?.textContent;
      const transliteration = annotation.querySelector('.mention-tr')?.textContent;
      const romanized = transliteration && /[^\p{Script=Latin}\p{M}\d\s*'’\-]/u.test(term) ? clean(transliteration) : undefined;
      const node: WordNode = { id: `narrative-${nodes.length}`, term: romanized ?? term, original: romanized ? term : undefined, language: language ?? code, gloss: gloss ? clean(gloss) : undefined, kind: 'ancestor', x: 0, y: 0, sourceUrl,
        note: `Recorded etymology: ${clean(paragraph.textContent ?? '')}` };
      nodes.push(node);
      const label = equivalent ? 'equivalent formation' : compound ? 'component' : variant ? 'recorded variant' : ultimate ? 'ultimately from' : /borrow/i.test(prefix) ? 'borrowed' : direct ? 'from' : components ? 'component' : 'recorded variant';
      edges.push({ from: node.id, to: target, label: uncertain ? `${label} · uncertain` : label, uncertain });
      parallelTarget = target;
      if (!components) chain = node.id;
      if (nodes.length >= 40) break;
    }
  }
  return { nodes, edges };
}

export function addRecordStatus(nodes: WordNode[], edges: WordEdge[], missing = false, note?: string) {
  const word = nodes.find(node => node.kind === 'word')!;
  nodes.push({ id: 'record-status', term: missing ? 'No entry found' : 'Origin unrecorded', language: 'Source record', kind: 'evidence', x: 0, y: 0,
    note: note ?? 'No ancestral form is established in the selected source. This is a record status, not an ancestor.' });
  edges.push({ from: 'record-status', to: word.id, label: 'record unavailable', uncertain: true });
}

/** Lay out both source trees and prose-derived graphs in chronological rows. */
export function layoutAncestry(nodes: WordNode[], edges: WordEdge[]) {
  const children = new Map<string, string[]>();
  for (const edge of edges) children.set(edge.to, [...children.get(edge.to) ?? [], edge.from]);
  const depths = new Map<string, number>();
  const assignDepth = (id: string, depth: number, path = new Set<string>()) => {
    if (path.has(id) || depth > 16) return;
    depths.set(id, Math.max(depth, depths.get(id) ?? 0));
    for (const parent of children.get(id) ?? []) assignDepth(parent, depth + 1, new Set([...path, id]));
  };
  const current = nodes.find(node => node.kind === 'word')!;
  assignDepth(current.id, 0);
  let leaf = 0;
  const placed = new Set<string>();
  const place = (id: string): number => {
    const node = nodes.find(item => item.id === id)!;
    if (placed.has(id)) return node.x;
    placed.add(id);
    const parents = children.get(id) ?? [];
    node.x = parents.length ? parents.map(place).reduce((a, b) => a + b, 0) / parents.length : leaf++ * 274;
    if (!parents.length && node.kind === 'ancestor') node.kind = 'root';
    return node.x;
  };
  place(current.id);
  const depth = Math.max(0, ...depths.values()), width = Math.max(840, leaf * 274 + 44);
  const offset = (width - Math.max(0, leaf - 1) * 274) / 2;
  nodes.forEach(node => { node.x += offset; node.y = (depth - (depths.get(node.id) ?? 0)) * 156 + 85; });
  return { width, height: Math.max(390, depth * 156 + 190) };
}
