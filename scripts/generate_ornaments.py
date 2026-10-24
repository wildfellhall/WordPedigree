"""Regenerate original vector ornaments and procedural material textures."""
from pathlib import Path
from generate_materials import build_materials
from generate_lace import build_lace

OUT = Path(__file__).resolve().parents[1] / 'public' / 'ornaments'
OUT.mkdir(parents=True, exist_ok=True)

def svg(w, h, body):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">{body}</svg>'

# Fine botanical copperplate engraving for the pedigree margins.
botanical = '<g fill="none" stroke="#7f7952" stroke-width=".8">'
botanical += '<path d="M91 311C61 231 104 163 83 90S49 37 63 14M90 308C119 243 113 177 154 112M89 300C62 259 40 208 19 178M90 271C112 221 155 226 169 184"/>'
for x,y,a,s in [(79,257,-45,1),(84,226,42,1),(90,193,-43,.9),(89,160,40,.85),(88,126,-52,.7),(80,84,42,.65),(67,54,-28,.5),(104,245,42,.8),(115,210,-30,.7),(122,177,45,.8),(139,142,-35,.65),(58,241,-50,.7),(42,211,18,.65),(127,224,50,.55),(151,210,-30,.55)]:
    botanical+=f'<g transform="translate({x} {y}) rotate({a}) scale({s})"><path d="M0 0C-25-4-29-30-17-50C-5-40 12-20 0 0Z" fill="#9c9b6c" fill-opacity=".15"/><path d="M0 0Q-14-25-17-48M-5-12L-20-20M-8-22L-21-30M-11-32L-20-40M-5-12L2-22M-9-24L-4-34"/></g>'
for x,y in [(63,14),(154,110),(19,177),(169,184)]:
    botanical += f'<g transform="translate({x} {y})">'
    for a in range(0,360,72):
        botanical += f'<path transform="rotate({a})" d="M0 0C-14-3-12-17-4-16C5-20 12-5 0 0Z" fill="#d1a29a" fill-opacity=".24" stroke="#a07c69"/>'
    botanical += '<circle r="3" fill="#c7b582"/></g>'
botanical += '</g>'
(OUT/'botanical.svg').write_text(svg(190,330,botanical))
(OUT/'seal.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path fill="#765a30" d="M32 1 39 7 48 6 51 15 59 20 57 30 62 38 54 45 52 55 42 56 32 63 23 56 12 55 10 45 2 38 7 30 5 20 13 15 16 6 25 7Z"/><circle cx="32" cy="32" r="23" fill="#e9d9b3" stroke="#b69b5b" stroke-width="3"/><path d="M32 47V23M32 34C11 33 14 16 17 14C30 18 32 26 32 34M32 28C33 15 45 12 49 13C49 25 41 29 32 28" fill="none" stroke="#7a633a" stroke-width="2"/></svg>')
(OUT/'quill-cursor.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M3 29Q9 14 27 2C31 16 15 23 9 23L3 29Z" fill="#ece7db" stroke="#594d40"/><path d="M3 29 25 5M12 21 12 16M16 16 22 14" fill="none" stroke="#7e6338"/></svg>')
(OUT/'point-cursor.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M5 2 9 24 13 17 21 19Z" fill="#a59572" stroke="#493a24"/><path d="M7 5 10 19 13 15Z" fill="#d5cbb3"/></svg>')
build_materials(OUT)
build_lace(OUT)
print('Rebuilt original SVG ornaments and material textures.')
