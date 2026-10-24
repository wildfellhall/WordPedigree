import type { WordEntry } from '../types';

const sources = (word: string) => [
  { name: 'Online Etymology Dictionary', url: `https://www.etymonline.com/word/${word}` },
  { name: 'Wiktionary · English entry', url: `https://en.wiktionary.org/wiki/${word}#English` },
];

export const words: Record<string, WordEntry> = {
  nostalgia: {
    word: 'nostalgia', pronunciation: '/nɒˈstæl.dʒə/', partOfSpeech: 'noun',
    definition: 'A sentimental longing for the past; originally, homesickness.',
    date: '1726', dateNote: 'Earliest English use dated by the Online Etymology Dictionary. The New Latin coinage is from 1688; dates vary between dictionaries.',
    origin: 'Ancient Greek → New Latin → English',
    story: 'Coined in New Latin by Johannes Hofer in his 1688 medical dissertation at Basel. Formed from Greek nóstos, “return home,” and álgos, “pain,” as a translation of German Heimweh. Originally a medical term for homesickness; the later sense extends to a longing for the past.',
    construction: 'nóstos (homecoming) + álgos (pain)',
    nodes: [
      { id: 'nostos', term: 'nóstos', original: 'νόστος', language: 'Ancient Greek', gloss: 'a return home', x: 235, y: 78, kind: 'root', note: 'The Greek noun for a homecoming or return. Its older ancestry is commonly connected with the reconstructed Indo-European root *nes-, “to return safely.”' },
      { id: 'algos', term: 'álgos', original: 'ἄλγος', language: 'Ancient Greek', gloss: 'pain, grief', x: 605, y: 78, kind: 'root', note: 'The Greek noun for pain. It also survives in the medical combining form -algia. Neuralgia and analgesic belong to this wider root family.' },
      { id: 'latin', term: 'nostalgia', language: 'New Latin', gloss: 'homesickness', date: '1688', x: 420, y: 252, kind: 'ancestor', note: 'Coined by Johannes Hofer at Basel in 1688, combining two Greek roots as a translation of German Heimweh (“homesickness”). This is a New Latin formation, not an attested ancient Greek word.' },
      { id: 'english', term: 'nostalgia', language: 'English', gloss: 'a longing for things past', date: '1726', x: 420, y: 437, kind: 'word', note: 'Borrowed from New Latin. The Online Etymology Dictionary dates English use to 1726. The later, broader sense turns from homesickness toward an affection for the past.' },
    ],
    edges: [{ from: 'nostos', to: 'latin' }, { from: 'algos', to: 'latin' }, { from: 'latin', to: 'english', label: 'borrowed into English' }],
    relatives: [
      { word: 'nostalgic', relation: 'descendant', note: 'The adjective formed from nostalgia.' },
      { word: 'neuralgia', relation: 'shared root', note: 'Shares Greek álgos, “pain”; specifically, pain along a nerve.' },
      { word: 'analgesic', relation: 'shared root', note: 'Also draws on álgos, with a prefix expressing absence.' },
      { word: 'homesickness', relation: 'kindred meaning', note: 'The original sense; not an etymological descendant.' },
    ], sources: sources('nostalgia'),
  },
  serendipity: {
    word: 'serendipity', pronunciation: '/ˌsɛɹ.ənˈdɪp.ɪ.ti/', partOfSpeech: 'noun',
    definition: 'The occurrence of an unexpected, fortunate discovery.',
    date: '1754', dateNote: 'Coined in Horace Walpole’s letter to Horace Mann, 28 January 1754. The letter was published later.',
    origin: 'Sanskrit → Arabic → English',
    story: 'Coined by Horace Walpole in a letter to Horace Mann dated 28 January 1754. The name refers to The Three Princes of Serendip, whose protagonists make discoveries by accident and deduction. Serendip is a former name for Sri Lanka, derived through Arabic from Sanskrit.',
    construction: 'Serendip (a name for Sri Lanka) + -ity',
    height: 660,
    nodes: [
      { id: 'sanskrit', term: 'Siṃhaladvīpa', language: 'Sanskrit', gloss: 'island of the Sinhalese', x: 420, y: 67, kind: 'root', note: 'A Sanskrit name associated with Sri Lanka, ultimately the source of Arabic Sarandīb. The traditional “island of lions” gloss reflects the name’s underlying elements.' },
      { id: 'arabic', term: 'Sarandīb', original: 'سرنديب', language: 'Arabic', gloss: 'Sri Lanka', x: 420, y: 229, kind: 'ancestor' },
      { id: 'serendip', term: 'Serendip', language: 'English', gloss: 'an old name for Ceylon', date: 'by 1708', x: 420, y: 393, kind: 'ancestor', note: 'The name used in the tale that inspired Walpole. Ceylon is now Sri Lanka.' },
      { id: 'english', term: 'serendipity', language: 'English', gloss: 'a fortunate discovery', date: '1754', x: 420, y: 565, kind: 'word' },
    ],
    edges: [{ from: 'sanskrit', to: 'arabic' }, { from: 'arabic', to: 'serendip' }, { from: 'serendip', to: 'english', label: 'coined by Horace Walpole' }],
    relatives: [
      { word: 'serendipitous', relation: 'descendant', note: 'Describes a fortunate, unexpected discovery.' },
      { word: 'serendipitously', relation: 'descendant', note: 'An adverb formed through serendipitous.' },
      { word: 'chance', relation: 'kindred meaning', note: 'An association of meaning, not a shared root.' },
      { word: 'fortune', relation: 'kindred meaning', note: 'A neighbouring idea with a separate Latin ancestry.' },
    ], sources: sources('serendipity'),
  },
  petrichor: {
    word: 'petrichor', pronunciation: '/ˈpɛt.ɹɪ.kɔː/', partOfSpeech: 'noun',
    definition: 'The characteristic smell produced by rain falling on dry earth.',
    date: '1964', dateNote: 'Introduced by I. J. Bear and R. G. Thomas in Nature, 7 March 1964.',
    origin: 'Ancient Greek → English',
    story: 'Introduced by Isabel Joy Bear and Richard Grenfell Thomas in their 1964 Nature paper, “Nature of Argillaceous Odour.” Formed from Greek pétra, “stone,” and ikhṓr, the fluid described as flowing in the veins of the gods.',
    construction: 'pétra (stone) + ikhṓr (the fluid of the gods)',
    nodes: [
      { id: 'petra', term: 'pétra', original: 'πέτρα', language: 'Ancient Greek', gloss: 'rock, stone', x: 235, y: 78, kind: 'root' },
      { id: 'ichor', term: 'ikhṓr', original: 'ἰχώρ', language: 'Ancient Greek', gloss: 'the fluid of the gods', x: 605, y: 78, kind: 'root', note: 'In Greek mythology, ichor flows in the veins of the gods. Its use here is a metaphor for the essence of stone.' },
      { id: 'english', term: 'petrichor', language: 'English', gloss: 'the fragrance of rain on earth', date: '1964', x: 420, y: 337, kind: 'word' },
    ], edges: [{ from: 'petra', to: 'english' }, { from: 'ichor', to: 'english', label: 'a modern scientific coinage' }],
    relatives: [
      { word: 'petrology', relation: 'shared root', note: 'The study of rocks; shares the Greek stone root.' },
      { word: 'petrify', relation: 'shared root', note: 'To turn to stone; from the same stone family.' },
      { word: 'ichor', relation: 'shared root', note: 'The second element, also an English word in its own right.' },
      { word: 'earthiness', relation: 'kindred meaning', note: 'A sensory association, not a descendant.' },
    ], sources: [{ name: 'Bear & Thomas · Nature (1964)', url: 'https://doi.org/10.1038/201993a0' }, { name: 'Wiktionary · English entry', url: 'https://en.wiktionary.org/wiki/petrichor#English' }],
  },
  companion: {
    word: 'companion', pronunciation: '/kəmˈpæn.jən/', partOfSpeech: 'noun',
    definition: 'A person who accompanies or associates with another.',
    date: 'c. 1300', dateNote: 'The Online Etymology Dictionary places the English noun around 1300.',
    origin: 'Latin → Late Latin → Old French → English',
    story: 'From Old French compaignon, from Late Latin compāniō, literally a person who shares bread. Formed from com-, “together,” and pānis, “bread.” The Latin form is attested in the Lex Salica and is probably a translation of a Germanic term for a messmate.',
    construction: 'com- (together) + pānis (bread)', height: 660,
    nodes: [
      { id: 'com', term: 'com-', language: 'Latin', gloss: 'with, together', x: 235, y: 67, kind: 'root' },
      { id: 'panis', term: 'pānis', language: 'Latin', gloss: 'bread', x: 605, y: 67, kind: 'root' },
      { id: 'latin', term: 'compāniō', language: 'Late Latin', gloss: 'one who shares bread', x: 420, y: 229, kind: 'ancestor' },
      { id: 'french', term: 'compaignon', language: 'Old French', gloss: 'fellow, friend', x: 420, y: 393, kind: 'ancestor' },
      { id: 'english', term: 'companion', language: 'English', gloss: 'one who accompanies', date: 'c. 1300', x: 420, y: 565, kind: 'word' },
    ], edges: [{ from: 'com', to: 'latin' }, { from: 'panis', to: 'latin' }, { from: 'latin', to: 'french' }, { from: 'french', to: 'english' }],
    relatives: [
      { word: 'companionship', relation: 'descendant', note: 'The state of being companions.' },
      { word: 'company', relation: 'shared root', note: 'Also belongs to the Latin bread-and-fellowship family.' },
      { word: 'pantry', relation: 'shared root', note: 'Shares Latin pānis, “bread.”' },
      { word: 'friend', relation: 'kindred meaning', note: 'A related meaning with a Germanic ancestry.' },
    ], sources: sources('companion'),
  },
  melancholy: {
    word: 'melancholy', pronunciation: '/ˈmɛl.ən.kɒl.i/', partOfSpeech: 'noun · adjective',
    definition: 'A state of prolonged sadness or dejection; also, expressing such sadness.',
    date: '14th century', dateNote: 'Middle English forms are attested in the fourteenth century. Dates depend on the sense being traced.',
    origin: 'Ancient Greek → Old French → Middle English',
    story: 'From Middle English malencolie, through Old French melancolie, ultimately from Greek melankholía. Formed from mélas, “black,” and kholḗ, “bile.” The name reflects the historical theory that an excess of black bile caused a depressed disposition.',
    construction: 'mélas (black) + kholḗ (bile)', height: 660,
    nodes: [
      { id: 'melas', term: 'mélas', original: 'μέλας', language: 'Ancient Greek', gloss: 'black, dark', x: 235, y: 67, kind: 'root' },
      { id: 'khole', term: 'kholḗ', original: 'χολή', language: 'Ancient Greek', gloss: 'bile', x: 605, y: 67, kind: 'root' },
      { id: 'greek', term: 'melankholía', language: 'Ancient Greek', gloss: 'black bile; a sombre disposition', x: 420, y: 229, kind: 'ancestor' },
      { id: 'french', term: 'melancolie', language: 'Old French', gloss: 'melancholy', x: 420, y: 393, kind: 'ancestor', note: 'The French stage in the selected Wiktionary lineage. Some dictionaries also identify an intervening Late Latin stage.' },
      { id: 'english', term: 'melancholy', language: 'English', gloss: 'a pensive sadness', date: '14th century', x: 420, y: 565, kind: 'word', note: 'Entered as Middle English malencolie; the modern spelling is shown on this plate.' },
    ], edges: [{ from: 'melas', to: 'greek' }, { from: 'khole', to: 'greek' }, { from: 'greek', to: 'french' }, { from: 'french', to: 'english' }],
    relatives: [
      { word: 'melancholic', relation: 'shared root', note: 'A parallel formation through Greek melankholikos.' },
      { word: 'melanin', relation: 'shared root', note: 'Shares Greek mélas, “black.”' },
      { word: 'choleric', relation: 'shared root', note: 'Shares Greek kholḗ, “bile.”' },
      { word: 'sorrow', relation: 'kindred meaning', note: 'A related feeling, with a different Germanic history.' },
    ], sources: sources('melancholy'),
  },
};

export const featuredWords = Object.keys(words);
