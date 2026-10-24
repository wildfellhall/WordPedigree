"""Original vector carvings and procedural surface marks, drawn in local coordinates."""
from math import cos, sin, pi
from random import Random

METAL = '''<defs>
  <linearGradient id="bronze" x1="0" y1="0" x2=".84" y2="1">
    <stop stop-color="#d4c8a5"/><stop offset=".2" stop-color="#a3936b"/>
    <stop offset=".43" stop-color="#c1ac7b"/><stop offset=".58" stop-color="#837454"/>
    <stop offset=".83" stop-color="#a38a5d"/><stop offset="1" stop-color="#564d3f"/>
  </linearGradient>
  <linearGradient id="ridge" x1="0" y1="0" x2="1" y2=".2">
    <stop stop-color="#514d41"/><stop offset=".35" stop-color="#ad9d76"/>
    <stop offset=".52" stop-color="#e0d4ae"/><stop offset=".7" stop-color="#ad9666"/><stop offset="1" stop-color="#6a5b44"/>
  </linearGradient>
  <linearGradient id="fold" x1="0" y1="0" x2="1" y2="1">
    <stop stop-color="#e1d4af"/><stop offset=".4" stop-color="#b39c6f"/><stop offset="1" stop-color="#5c5343"/>
  </linearGradient>
  <radialGradient id="pearl" cx=".32" cy=".22" r=".77">
    <stop stop-color="#eee8cf"/><stop offset=".25" stop-color="#c4b38a"/><stop offset=".7" stop-color="#99835d"/><stop offset="1" stop-color="#61533d"/>
  </radialGradient>
  <filter id="cast" x="-12%" y="-12%" width="130%" height="135%" color-interpolation-filters="sRGB">
    <feDropShadow dx=".65" dy="1.1" stdDeviation=".75" flood-color="#2f2921" flood-opacity=".6"/>
  </filter>
  <filter id="patina" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
    <feTurbulence baseFrequency=".38" numOctaves="3" seed="13" type="fractalNoise" result="noise"/>
    <feColorMatrix in="noise" type="matrix" values="0 0 0 0 .2 0 0 0 0 .19 0 0 0 0 .14 0 0 0 .23 0" result="stain"/>
    <feComposite in="stain" in2="SourceAlpha" operator="in"/>
    <feBlend in="SourceGraphic" mode="multiply"/>
  </filter>
  <g id="acanthus">
    <path d="M0 5C-2-8-19-8-20-20C-20-24-17-28-14-29C-15-22-9-18-6-22C-7-32-27-30-27-42C-27-46-24-50-20-51C-22-44-13-39-9-44C-9-53-25-54-23-64C-23-69-18-74-14-75C-17-67-9-61-5-65C-5-75-13-80-9-89C-7-95-2-98 0-106C2-98 7-95 9-89C13-80 5-75 5-65C9-61 17-67 14-75C18-74 23-69 23-64C25-54 9-53 9-44C13-39 22-44 20-51C24-50 27-46 27-42C27-30 7-32 6-22C9-18 15-22 14-29C17-28 20-24 20-20C19-8 2-8 0 5Z" fill="url(#bronze)" stroke="#665942" stroke-width=".55"/>
    <path d="M0 3C-2-25-3-55 0-102C5-72 4-35 0 3" fill="url(#ridge)"/>
    <g fill="none" stroke-linecap="round">
      <path d="M-1-12C-9-15-18-17-17-23M-2-29C-13-32-24-38-23-44M-2-48C-11-52-20-58-19-66M-1-68C-5-72-10-83-5-90" stroke="#e4d5aa" stroke-width=".85"/>
      <path d="M2-12C9-15 18-17 17-23M3-29C13-32 24-38 23-44M3-48C11-52 20-58 19-66M2-68C5-72 10-83 5-90" stroke="#564d3b" stroke-opacity=".65" stroke-width=".8"/>
      <path d="M0-12C-6-12-18-14-19-21M0-29C-10-29-24-35-25-42M0-48C-8-49-20-54-21-63M0-68C-4-70-11-80-7-89" stroke="#534d3e" stroke-width=".65" stroke-opacity=".65"/>
      <path d="M1-10C7-15 17-13 18-22M2-27C9-33 23-32 24-43M2-46C7-53 19-52 20-64M1-65C4-73 10-78 6-89" stroke="#e5d7b0" stroke-width=".65" stroke-opacity=".65"/>
    </g>
  </g>
  <g id="tendril">
    <path d="M0 0C23-1 36-15 41-35C44-47 62-51 68-42C77-28 60-19 55-29C52-36 59-40 62-35C59-37 56-33 59-30C63-24 73-32 67-40C59-49 46-43 45-34C39-8 23 4 0 3Z" fill="url(#fold)" stroke="#7f6d4c" stroke-width=".4"/>
    <path d="M2 0C24 0 37-16 42-35C47-52 69-48 71-36" fill="none" stroke="#e0d3af" stroke-width=".6"/>
  </g>
</defs>'''

def document(w, h, body, defs=METAL):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">{defs}{body}</svg>'

def build_materials(out):
    # Coherent relief: three separated acanthus leaves meet at a single corner boss.
    corner = '<g filter="url(#cast)"><g filter="url(#patina)">'
    corner += '<use href="#tendril" transform="translate(59 37) rotate(10) scale(.95)"/>'
    corner += '<use href="#tendril" transform="translate(37 59) rotate(80) scale(.95 -0.95)"/>'
    corner += '<use href="#acanthus" transform="translate(35 32) rotate(91) scale(.57 .98)"/>'
    corner += '<use href="#acanthus" transform="translate(32 35) rotate(179) scale(.57 .98)"/>'
    corner += '<use href="#acanthus" transform="translate(34 34) rotate(135) scale(.76 .96)"/>'
    # A restrained rosette, with petal folds instead of overlapping outlined flowers.
    for i in range(8):
        a=i*45
        corner+=f'<path transform="translate(28 28) rotate({a})" d="M0 0C-5-4-6-13-1-15C4-14 6-5 0 0Z" fill="url(#fold)" stroke="#8a7856" stroke-width=".35"/>'
    corner+='<circle cx="28" cy="28" r="4.2" fill="url(#pearl)"/>'
    corner+='</g></g>'
    (out/'corner.svg').write_text(document(180,180,corner))

    # Winged head in the upper rail; each feather has its own separated contour.
    cameo='<g filter="url(#cast)"><g filter="url(#patina)">'
    for side in [-1,1]:
        cameo+=f'<g transform="translate(90 26) scale({side} 1)">'
        cameo+='<path d="M12 5C31-11 50-9 80-19C72-4 56 9 21 22Z" fill="url(#bronze)" stroke="#736347" stroke-width=".7"/>'
        for i in range(7):
            x=29+i*6; y=14-i*3
            cameo+=f'<path d="M18 7Q{x-9} {y-10} {x+12} {y-15}Q{x+4} {y-3} 19 19" fill="url(#fold)" stroke="#77674b" stroke-width=".55"/>'
            cameo+=f'<path d="M22 12Q{x-4} {y-6} {x+8} {y-13}" stroke="#d7c7a0" stroke-width=".45" fill="none"/>'
        cameo+='</g>'
    cameo+='<path d="M75 26C75 9 105 9 105 26L102 40Q99 50 90 52Q81 50 78 40Z" fill="url(#pearl)" stroke="#79684b" stroke-width=".65"/>'
    cameo+='<path d="M77 25Q84 22 87 26M93 26Q99 22 103 25M81 29Q84 27 87 29M94 29Q97 27 100 29M90 27L88 35Q90 37 93 35M86 42Q90 40 94 42M88 44L92 44M79 35Q81 38 83 37M98 37L101 34" stroke="#796748" stroke-width=".55" fill="none"/>'
    for x,y,r in [(77,21,4),(81,16,4),(87,13,4),(94,13,4),(100,17,4),(104,22,3)]:
        cameo+=f'<path d="M{x-3} {y+2}C{x-7} {y-5} {x+5} {y-7} {x+4} {y}Q{x+2} {y+5} {x} {y}" fill="url(#bronze)" stroke="#7d694a" stroke-width=".65"/>'
    cameo+='<path d="M87 52Q77 58 65 52M93 52Q103 58 115 52" fill="none" stroke="url(#bronze)" stroke-width="2"/>'
    cameo+='</g></g>'
    (out/'cartouche.svg').write_text(document(180,64,cameo))

    # Seeded surface detail: irregular short fibres, very faint pores, no tiled stains.
    rng=Random(1804)
    fibers=[]
    for i in range(2400):
        x=rng.uniform(0,720); y=rng.uniform(0,720)
        length=rng.uniform(.6,5); angle=rng.uniform(0,2*pi)
        dx=cos(angle)*length;dy=sin(angle)*length
        color='#6f6760' if i%3 else '#ffffff'
        opacity=rng.uniform(.018,.065)
        fibers.append(f'<path d="M{x:.2f} {y:.2f}q{dx*.45:.2f} {dy*.4+rng.uniform(-1,1):.2f} {dx:.2f} {dy:.2f}" stroke="{color}" stroke-opacity="{opacity:.3f}" stroke-width="{rng.uniform(.25,.65):.2f}" fill="none"/>')
    for i in range(120):
        fibers.append(f'<ellipse cx="{rng.uniform(0,720):.1f}" cy="{rng.uniform(0,720):.1f}" rx="{rng.uniform(.15,.6):.2f}" ry="{rng.uniform(.2,1.1):.2f}" fill="#736759" opacity="{rng.uniform(.03,.12):.3f}"/>')
    (out/'paper-fibres.svg').write_text(document(720,720,''.join(fibers),''))
    (out/'ink-wear.svg').write_text('''<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320"><filter id="ink"><feTurbulence type="fractalNoise" baseFrequency=".72" numOctaves="3" seed="18" stitchTiles="stitch"/><feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 1.1 1.1 1.1 0 -.5"/><feComponentTransfer><feFuncA type="linear" slope=".6" intercept=".4"/></feComponentTransfer></filter><path d="M0 0h320v320H0z" filter="url(#ink)"/></svg>''')
    # Fine directional chasing for the frame rails; clipped to the metallic surfaces.
    marks=[]
    for i in range(150):
        x=rng.uniform(0,256);y=rng.uniform(0,64)
        marks.append(f'<path d="M{x:.2f} {y:.2f}l{rng.uniform(1,12):.2f} {rng.uniform(-.3,.3):.2f}" stroke="{rng.choice(["#f3e6c9","#3d3c31"])}" stroke-opacity=".13" stroke-width=".35"/>')
    (out/'metal-grain.svg').write_text(document(256,64,''.join(marks),''))

if __name__ == '__main__':
    from pathlib import Path
    build_materials(Path(__file__).resolve().parents[1] / 'public' / 'ornaments')
