import { useEffect, useRef, useState } from 'react';
import type { WordEntry, WordNode } from '../types';
import { Leaf, NodeFrame } from './Ornaments';
import InkText from './InkText';

export default function Pedigree({ entry, onSelect }: { entry: WordEntry; onSelect: (node: WordNode) => void }) {
  const [zoom, setZoom] = useState(1);
  const [viewportWidth, setViewportWidth] = useState(840);
  const viewport = useRef<HTMLDivElement>(null);
  const width = entry.width ?? 840;
  const height = entry.height ?? 550;
  const compact = width <= 950 && viewportWidth < 550;
  const diagramWidth = compact ? 440 : width;
  const fit = Math.min(1, Math.max(.66, viewportWidth / diagramWidth));
  const scale = fit * zoom;
  const nodes = entry.nodes.map(node => ({ ...node, x: node.x * diagramWidth / width }));
  useEffect(() => {
    const element = viewport.current!;
    const observer = new ResizeObserver(([size]) => setViewportWidth(size.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, [width]);
  useEffect(() => {
    const element = viewport.current!;
    element.scrollLeft = Math.max(0, (diagramWidth * scale - viewportWidth) / 2);
  }, [diagramWidth, scale, viewportWidth]);
  return <div className="pedigree-shell">
    <div className="plate-topline"><span>Ancestry</span></div>
    <div ref={viewport} className="tree-viewport" tabIndex={0} aria-label="Word ancestry diagram; scroll horizontally to explore wide trees">
      <div className="tree-size" style={{ width: diagramWidth * scale, height: height * scale }}>
        <div className={`tree ${compact ? 'tree-compact' : ''}`} style={{ width: diagramWidth, height, transform: `scale(${scale})` }}>
          <img className="botanical botanical-left" src="/ornaments/botanical.svg" alt="" />
          <img className="botanical botanical-right" src="/ornaments/botanical.svg" alt="" />
          <svg className="tree-branches" viewBox={`0 0 ${diagramWidth} ${height}`} aria-hidden="true">
            <defs><linearGradient id="branch-ink" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#8a7954" /><stop offset=".5" stopColor="#a49465" /><stop offset="1" stopColor="#736245" /></linearGradient></defs>
            {entry.edges.map((edge, index) => {
              const from = nodes.find(node => node.id === edge.from)!;
              const to = nodes.find(node => node.id === edge.to)!;
              const startY = from.y + 56;
              const endY = to.y - 57;
              const midpoint = (startY + endY) / 2;
              const d = `M${from.x} ${startY} C${from.x} ${midpoint + 12},${to.x} ${midpoint - 12},${to.x} ${endY}`;
              const diverges = Math.abs(from.x - to.x) > 20;
              return <g key={`${edge.from}-${edge.to}`}>
                <path d={d} fill="none" stroke="url(#branch-ink)" strokeWidth={edge.uncertain ? 1.2 : 2.4} strokeDasharray={edge.uncertain ? '4 5' : undefined} />
                {!edge.uncertain && <path d={d} transform="translate(1.6 0)" fill="none" stroke="#c9ba8e" strokeWidth=".7" />}
                {from.kind !== 'evidence' && <><Leaf x={from.x + (to.x - from.x) * .16} y={startY + (endY - startY) * .27} angle={diverges ? (from.x < to.x ? -30 : 65) : -35} size={.8} />
                <Leaf x={from.x + (to.x - from.x) * .78} y={startY + (endY - startY) * .75} angle={diverges ? (from.x < to.x ? 80 : -35) : 75} size={.7} /></>}
                {edge.label && (!diverges || index === entry.edges.length - 1) && <text x={diverges ? (from.x + to.x) / 2 + 20 : to.x + 26} y={midpoint + 2} className="branch-label">{edge.label}</text>}
              </g>;
            })}
            {nodes.filter(n => n.kind === 'word').map(node => <g key={node.id} stroke="#a68c58" fill="none" strokeWidth=".9">
              <path d={`M${node.x} ${node.y + 58}v18m-45 10q28-19 45-10q17-9 45 10m-68-4q-12 10-18 4m63-4q12 10 18 4`} />
              <path d={`M${node.x - 4} ${node.y + 76}l4 8 4-8`} />
            </g>)}
          </svg>
          {nodes.map(node => <button key={node.id} className={`word-node ${node.kind === 'word' ? 'word-node-selected' : ''} ${node.kind === 'evidence' ? 'word-node-evidence' : ''}`} style={{ left: node.x, top: node.y }} onClick={() => onSelect(node)} aria-label={`Read about ${node.term}, ${node.language}`}>
            <NodeFrame />
            <span className="node-language">{node.language}{node.date && <> <span className="node-dot">·</span> {node.date}</>}</span>
            <span className={`node-word ${node.term.length > 17 ? 'long-word' : ''}`}><InkText rose={node.kind === 'word'}>{node.term}</InkText></span>
            <span className="node-gloss">{node.original && <span className="original-script">{node.original} · </span>}{node.gloss ? `“${node.gloss}”` : ''}</span>
          </button>)}
        </div>
      </div>
    </div>
    <div className="plate-bottomline">
      <span className="diagram-hint"></span>
      <div className="zoom-controls" aria-label="Diagram magnification">
        <button aria-label="Reduce diagram magnification" disabled={zoom <= .7} onClick={() => setZoom(z => Math.max(.7, +(z - .15).toFixed(2)))}>−</button>
        <button className="zoom-reset" aria-label="Reset diagram magnification" onClick={() => setZoom(1)}>{Math.round(zoom * 100)}%</button>
        <button aria-label="Increase diagram magnification" disabled={zoom >= 1.45} onClick={() => setZoom(z => Math.min(1.45, +(z + .15).toFixed(2)))}>+</button>
      </div>
    </div>
    {entry.partial && <p className="partial-note">A selected branch of the recorded ancestry is shown. Consult the source for the complete tree and alternative accounts.</p>}
    {entry.diagramNote && <p className="partial-note">{entry.diagramNote}</p>}
  </div>;
}
