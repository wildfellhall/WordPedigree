export type Relation = 'descendant' | 'shared root' | 'kindred meaning' | 'related term';
export interface WordNode {
  id: string;
  term: string;
  language: string;
  gloss?: string;
  date?: string;
  original?: string;
  x: number;
  y: number;
  kind?: 'root' | 'ancestor' | 'word' | 'descendant' | 'evidence';
  note?: string;
  sourceUrl?: string;
}
export interface WordEdge {
  from: string;
  to: string;
  label?: string;
  uncertain?: boolean;
}
export interface WordEntry {
  word: string;
  pronunciation: string;
  partOfSpeech: string;
  definition: string;
  date: string;
  dateNote: string;
  origin: string;
  story: string;
  construction: string;
  nodes: WordNode[];
  edges: WordEdge[];
  relatives: { word: string; relation: Relation; note: string }[];
  sources: { name: string; url: string }[];
  live?: boolean;
  partial?: boolean;
  width?: number;
  height?: number;
  diagramNote?: string;
  lemma?: string;
  missing?: boolean;
}
