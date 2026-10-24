import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { WordEntry, WordNode } from './types';
import { featuredWords, words } from './data/words';
import { lookupWord } from './lexicon';
import Parchment from './components/Parchment';
import GiltFrame from './components/GiltFrame';
import InkText from './components/InkText';
import Pedigree from './components/Pedigree';
import Dialog from './components/Dialog';
import { BookIcon, BookmarkIcon, Flourish, InkFilters } from './components/Ornaments';

type View = 'pedigree' | 'cabinet';
type Modal = 'sources' | 'history' | WordNode | null;

function readSaved(): string[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem('word-pedigree-cabinet') ?? '[]');
    return Array.isArray(stored) ? stored.filter((item): item is string => typeof item === 'string' && item.length <= 80) : [];
  } catch { return []; }
}

export default function App() {
  const initialWord = new URLSearchParams(window.location.search).get('word') ?? 'nostalgia';
  const [entry, setEntry] = useState<WordEntry>(words[initialWord] ?? words.nostalgia);
  const [query, setQuery] = useState(initialWord);
  const [view, setView] = useState<View>('pedigree');
  const [modal, setModal] = useState<Modal>(null);
  const [saved, setSaved] = useState<string[]>(readSaved);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [cabinetFilter, setCabinetFilter] = useState<'all' | 'saved'>('all');
  const request = useRef<AbortController | null>(null);
  const entryHeading = useRef<HTMLHeadingElement>(null);

  async function search(value: string, updateHistory = true) {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true); setError(''); setNotice(''); setQuery(value); setView('pedigree');
    try {
      const result = await lookupWord(value, controller.signal);
      if (controller.signal.aborted) return;
      setEntry(result); setQuery(result.word);
      if (updateHistory) {
        const url = new URL(window.location.href);
        url.searchParams.set('word', result.word);
        window.history.pushState({}, '', url);
      }
    } catch (err) {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'This entry could not be retrieved. Please try again.');
    } finally { if (!controller.signal.aborted) setLoading(false); }
  }

  useEffect(() => {
    if (!words[initialWord]) void search(initialWord, false);
    const onHistory = () => { void search(new URLSearchParams(window.location.search).get('word') ?? 'nostalgia', false); };
    window.addEventListener('popstate', onHistory);
    return () => { window.removeEventListener('popstate', onHistory); request.current?.abort(); };
    // The initial URL is read once; popstate handles later navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { document.title = `${entry.word} · Word Pedigree`; }, [entry.word]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function saveWord() {
    const next = saved.includes(entry.word) ? saved.filter(word => word !== entry.word) : [...saved, entry.word];
    try {
      localStorage.setItem('word-pedigree-cabinet', JSON.stringify(next));
      setSaved(next);
      setNotice(next.includes(entry.word) ? 'Word saved.' : 'Word removed.');
    } catch { setNotice('Unable to save. Local storage is unavailable.'); }
  }

  function submit(event: FormEvent) { event.preventDefault(); void search(query); }
  const cabinetWords = cabinetFilter === 'saved' ? saved : [...new Set([...featuredWords, ...saved])];
  const storyPreview = entry.story.length > 650 ? entry.story.slice(0, 650).replace(/\s+\S*$/, '') + '…' : entry.story;

  return <>
    <InkFilters />
    <a className="skip-link" href="#main">Skip to the pedigree</a>
    <div className="folio">
      <Parchment />
      <div className="lace-edging" aria-hidden="true" />
      <GiltFrame />
      <div className="folio-content">
        <header className="masthead">
          <div className="masthead-center"><h1><InkText>Word Pedigree</InkText></h1></div>
          <button className="saved-navigation" onClick={() => { setCabinetFilter('saved'); setView(view === 'cabinet' ? 'pedigree' : 'cabinet'); }} aria-current={view === 'cabinet' ? 'page' : undefined}>
            {view === 'cabinet' ? 'Pedigree' : `Saved words (${saved.length})`}
          </button>
        </header>

        <section className="search-section" aria-label="Look up a word">
          <form className="search-form" onSubmit={submit}>
            <svg className="search-icon" viewBox="0 0 28 28" aria-hidden="true"><circle cx="11" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.3"/><circle cx="11" cy="10" r="5" fill="none" stroke="currentColor" strokeWidth=".4"/><path d="M16 16L24 25M18 16L26 24" stroke="currentColor" strokeWidth="1.6"/></svg>
            <label className="sr-only" htmlFor="word-search">A word to trace</label>
            <input id="word-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Enter a word" maxLength={80} autoComplete="off" spellCheck={false} required />
            <button className="trace-button" type="submit" disabled={loading}>{loading ? 'Searching…' : 'Search'}<span aria-hidden="true">⟶</span></button>
          </form>
          <div className="suggestions">{['serendipity', 'petrichor', 'companion', 'melancholy'].map(word => <button key={word} onClick={() => void search(word)}>{word}</button>)}</div>
          <div className="search-status" aria-live="polite">{loading && <p>Loading etymology…</p>}{error && <p className="error-message" role="alert">{error}</p>}</div>
        </section>

        <main id="main">
          {view === 'pedigree' ? <article className={`entry ${loading ? 'entry-loading' : ''}`} aria-busy={loading}>
            <div className="entry-heading">
              <div className="word-title"><h2 ref={entryHeading}><InkText>{entry.word}</InkText></h2><div className="pronunciation">{entry.pronunciation}<span className="pronunciation-dot">·</span><em>{entry.partOfSpeech}</em></div></div>
              <button className={`save-word ${saved.includes(entry.word) ? 'is-saved' : ''}`} onClick={saveWord} aria-pressed={saved.includes(entry.word)}><BookmarkIcon filled={saved.includes(entry.word)} /><span>{saved.includes(entry.word) ? 'Saved' : 'Save word'}</span></button>
            </div>
            <p className="definition">{entry.definition}</p>
            <Flourish className="title-flourish" />

            <div className="entry-body">
              <Pedigree key={entry.word} entry={entry} onSelect={setModal} />
              <aside className="field-notes" aria-label="Etymological field notes">
                <div className="notes-heading"><h3>Recorded etymology</h3></div>
                <section className="attestation"><h4>First recorded in English</h4><p className={`date ${entry.date.length > 12 ? 'date-long' : ''}`}>{entry.date}<span>✦</span></p><p>{entry.live ? entry.date === 'Not established' ? 'An attestation date has not been verified for this entry.' : 'Dating of the selected sense, as recorded by Wiktionary.' : entry.word === 'nostalgia' ? 'English use dated by Etymonline; the New Latin term was coined in 1688.' : entry.dateNote}</p></section>
                <section><h4>Language history</h4><p className="language-journey">{entry.origin.split(' → ').map((language, index, languages) => <span key={index}>{language}{index < languages.length - 1 && <i aria-hidden="true"> → </i>}</span>)}</p></section>
                <section className="word-story"><h4>Origin</h4><p>{storyPreview}</p>{entry.story.length > 650 && <button className="history-link" onClick={() => setModal('history')}>Full etymology ⟶</button>}</section>
                <button className="source-link" onClick={() => setModal('sources')}>Sources <span aria-hidden="true">↗</span></button>
              </aside>
            </div>

            <section className="kindred-section" aria-labelledby="kindred-title">
              <div className="section-heading"><span className="section-rule" /><div><h3 id="kindred-title">Related words</h3></div><span className="section-rule" /></div>
              {entry.relatives.length ? <div className="relative-grid">{entry.relatives.map(relative => <button className="relative-card" key={relative.word} onClick={() => void search(relative.word)}><span className={`relation-label relation-${relative.relation.replace(' ', '-')}`}>{relative.relation === 'kindred meaning' ? 'similar meaning' : relative.relation}</span><span className="relative-word">{relative.word}<span aria-hidden="true">↗</span></span><span className="relative-note">{relative.note}</span></button>)}</div> : <p className="empty-note">No related terms are recorded in this entry.</p>}
            </section>
            <div className="entry-source-note">{entry.missing ? <p>No source record located · <a href={entry.sources[0].url} target="_blank" rel="noreferrer">Check the dictionary</a></p> : entry.live ? <p>Live transcription from <a href={entry.sources[0].url} target="_blank" rel="noreferrer">Wiktionary</a> · First English etymology shown · Text available under <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>.</p> : <p>Sources: {entry.sources.map((source, index) => <span key={source.url}>{index > 0 && ' · '}<a href={source.url} target="_blank" rel="noreferrer">{source.name}</a></span>)}</p>}</div>
          </article> : <section className="cabinet">
            <h2>Saved words</h2>
            <div className="cabinet-tabs" aria-label="Saved and prepared entries"><button className={cabinetFilter === 'all' ? 'selected' : ''} onClick={() => setCabinetFilter('all')} aria-pressed={cabinetFilter === 'all'}>All entries</button><span>✦</span><button className={cabinetFilter === 'saved' ? 'selected' : ''} onClick={() => setCabinetFilter('saved')} aria-pressed={cabinetFilter === 'saved'}>Saved ({saved.length})</button></div>
            {cabinetWords.length ? <div className="cabinet-grid">{cabinetWords.map((word, index) => <button className="cabinet-card" key={word} onClick={() => void search(word)}><span className="cabinet-number">{String(index + 1).padStart(2, '0')}</span><BookIcon /><h3>{word}</h3><p>{words[word]?.definition ?? 'View recorded etymology.'}</p><span className="cabinet-open">View etymology ⟶</span>{saved.includes(word) && <span className="cabinet-bookmark"><BookmarkIcon filled /></span>}</button>)}</div> : <p className="cabinet-empty">No saved words. Select “Save word” on an entry to add it here.</p>}
          </section>}
        </main>


      </div>
    </div>
    <div className={`notice ${notice ? 'notice-visible' : ''}`} role="status">{notice}</div>

    {modal && <Dialog title={modal === 'sources' ? 'Sources' : modal === 'history' ? `Etymology: ${entry.word}` : modal.term} onClose={() => setModal(null)}>
      {modal === 'sources' ? <div className="sources-copy"><p>References for <em>{entry.word}</em>:</p><ol>{entry.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.name} ↗</a></li>)}</ol><h3>Attestation</h3><p>{entry.dateNote}</p><h3>Word formation</h3><p>{entry.construction}</p>{entry.live && <p>Wiktionary text is presented under <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">Creative Commons Attribution-ShareAlike 4.0</a>. The diagram reformats the source’s structured etymology; long trees may be abbreviated.</p>}</div> : modal === 'history' ? <div className="full-history"><p>{entry.story}</p><a href={entry.sources[0].url} target="_blank" rel="noreferrer">Source entry ↗</a></div> : <div className="node-detail"><p className="detail-language">{modal.language}{modal.date && ` · ${modal.date}`}</p>{modal.original && <p className="detail-original">{modal.original}</p>}{modal.gloss && <p className="detail-gloss">“{modal.gloss}”</p>}<p>{modal.note ?? `A recorded ${modal.kind === 'root' ? 'root' : 'stage'} in the ancestry of ${entry.word}. See the source for the full etymology.`}</p><a className="ink-link" href={modal.sourceUrl ?? entry.sources[entry.sources.length - 1].url} target="_blank" rel="noreferrer">Source entry ↗</a></div>}
    </Dialog>}
  </>;
}
