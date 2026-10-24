import { useEffect, useRef } from 'react';

const hash = (x: number, y: number) => {
  const value = Math.sin(x * 127.1 + y * 311.7 + 37) * 43758.5453;
  return value - Math.floor(value);
};
const noise = (x: number, y: number) => {
  const ix = Math.floor(x), iy = Math.floor(y);
  let u = x - ix, v = y - iy;
  u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v);
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};

/** The real text remains selectable and accessible. The canvas replaces only
 * its paint, depositing ink into the glyph mask at a consistent paper scale. */
export default function InkText({ children, rose = false }: { children: string; rose?: boolean }) {
  const host = useRef<HTMLSpanElement>(null);
  const letters = useRef<HTMLSpanElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = host.current, text = letters.current, target = canvas.current;
    if (!element || !text || !target) return;
    let cancelled = false, frame = 0;
    const render = () => {
      frame = 0;
      if (cancelled || !text.firstChild) return;
      const style = getComputedStyle(text), bounds = element.getBoundingClientRect();
      const width = element.offsetWidth, height = element.offsetHeight;
      if (!width || !height) return;
      const scale = bounds.width / width;
      // Handwriting descenders can extend beyond the CSS line box. Reserve
      // real canvas space for them instead of cutting the ink at its edge.
      const ratio = Math.min(window.devicePixelRatio || 1, 2), pad = Math.ceil(Math.max(9, parseFloat(style.fontSize) * .45));
      const w = Math.ceil((width + pad * 2) * ratio), h = Math.ceil((height + pad * 2) * ratio);
      const mask = document.createElement('canvas'); mask.width = w; mask.height = h;
      const ctx = mask.getContext('2d', { willReadFrequently: true });
      const output = target.getContext('2d');
      if (!ctx || !output) return;
      ctx.scale(ratio, ratio);
      ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      ctx.letterSpacing = style.letterSpacing === 'normal' ? '0px' : style.letterSpacing;
      ctx.fillStyle = '#000';
      const range = document.createRange();
      const lines: { text: string; x: number; y: number; height: number }[] = [];
      // Browser-measured line breaks also cover long words and resized trees.
      for (let i = 0; i < children.length; i++) {
        range.setStart(text.firstChild, i); range.setEnd(text.firstChild, i + 1);
        const rect = range.getBoundingClientRect();
        const x = (rect.left - bounds.left) / scale, y = (rect.top - bounds.top) / scale;
        const line = lines[lines.length - 1];
        if (line && Math.abs(y - line.y) < 2) line.text += children[i];
        else lines.push({ text: children[i], x, y, height: rect.height / scale });
      }
      for (const line of lines) {
        const metrics = ctx.measureText(line.text);
        const ascent = metrics.fontBoundingBoxAscent, descent = metrics.fontBoundingBoxDescent;
        const baseline = pad + line.y + (line.height - ascent - descent) / 2 + ascent;
        // Preserve the handwriting font's joins inside each word. Tiny changes
        // in baseline and pen angle occur at natural lifts between words, so
        // replacing the font changes the visible ink as well as the DOM text.
        let prefix = '';
        for (const word of line.text.match(/\S+\s*|\s+/g) ?? []) {
          const offset = ctx.measureText(prefix).width;
          const seed = [...word].reduce((sum, character) => sum + character.codePointAt(0)!, prefix.length);
          const size = parseFloat(style.fontSize);
          ctx.save();
          ctx.translate(pad + line.x + offset, baseline + (hash(seed, 8) - .5) * size * .006);
          ctx.rotate((hash(seed, 17) - .5) * .006);
          ctx.fillText(word, 0, 0);
          ctx.restore(); prefix += word;
        }
      }
      const glyphs = ctx.getImageData(0, 0, w, h), pigment = ctx.createImageData(w, h);
      const sampleAlpha = (x: number, y: number) => glyphs.data[(Math.max(0, Math.min(h - 1, y)) * w + Math.max(0, Math.min(w - 1, x))) * 4 + 3] / 255;
      const step = Math.max(1, Math.round(ratio * .8));
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const index = (y * w + x) * 4, coverage = glyphs.data[index + 3] / 255;
        if (!coverage) continue;
        const px = x / ratio, py = y / ratio;
        const edge = 1 - Math.min(sampleAlpha(x - step, y), sampleAlpha(x + step, y), sampleAlpha(x, y - step), sampleAlpha(x, y + step));
        const wash = noise(px * .045, py * .09);
        const grain = noise(px * 1.9, py * 1.3);
        const fibre = noise(px * .38, py * 3.8);
        const dry = Math.max(0, fibre - .66) * .45 + Math.max(0, noise(px * 3.2, py * .48) - .72) * .18;
        const dilution = Math.min(1, Math.max(0, .18 + wash * .65 + grain * .25 - edge * .42));
        // Iron-gall ink pools at stroke margins; the centre holds a translucent
        // warmer wash. Fine undyed fibres break it without uniform white specks.
        pigment.data[index] = (rose ? 91 : 36) + dilution * (rose ? 47 : 64);
        pigment.data[index + 1] = (rose ? 47 : 26) + dilution * 45;
        pigment.data[index + 2] = (rose ? 46 : 23) + dilution * 31;
        pigment.data[index + 3] = coverage * Math.min(1, .91 + edge * .07 - dry - (grain - .5) * .15) * 255;
      }
      ctx.putImageData(pigment, 0, 0);
      target.width = w; target.height = h;
      target.style.width = `${width + pad * 2}px`; target.style.height = `${height + pad * 2}px`;
      target.style.left = `-${pad}px`; target.style.top = `-${pad}px`;
      // A subpixel capillary fringe, with no drop shadow or surface highlight.
      output.filter = `blur(${.32 * ratio}px)`; output.globalAlpha = .24;
      output.drawImage(mask, 0, 0);
      output.filter = 'none'; output.globalAlpha = 1; output.drawImage(mask, 0, 0);
      element.dataset.inkReady = 'true';
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(render); };
    const observer = new ResizeObserver(schedule); observer.observe(element);
    void document.fonts.ready.then(schedule);
    document.fonts.addEventListener('loadingdone', schedule);
    return () => { cancelled = true; cancelAnimationFrame(frame); observer.disconnect(); document.fonts.removeEventListener('loadingdone', schedule); };
  }, [children, rose]);
  return <span className="ink-writing" ref={host}><span className="ink-writing-text" ref={letters}>{children}</span><canvas ref={canvas} aria-hidden="true" /></span>;
}
