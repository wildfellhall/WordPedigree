"""Original needle-lace edging: mesh ground, satin-stitch flowers, and picot loops."""
from math import cos, sin, pi
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / 'public' / 'ornaments'

def thread(d, width=1.0, rose=False):
    color='#ecd7d6' if rose else '#f8f5ed'
    return f'<g fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="{d}" stroke="#b9a19a" stroke-opacity=".42" stroke-width="{width+.55}" transform="translate(.18 .35)"/><path d="{d}" stroke="{color}" stroke-width="{width}"/><path d="{d}" stroke="#fffef7" stroke-width="{width*.25}" transform="translate(-.12 -.2)"/><path d="{d}" stroke="#bbaaa0" stroke-opacity=".28" stroke-width="{width*.6}" stroke-dasharray=".24 .9"/></g>'

DEFS='''<defs>
<pattern id="mesh" width="4" height="5" patternUnits="userSpaceOnUse">
  <path d="M0 1.25L2 0 4 1.25V3.75L2 5 0 3.75ZM2 0V-1M2 5V6" fill="none" stroke="#bca39a" stroke-opacity=".35" stroke-width=".48" transform="translate(.12 .18)"/>
  <path d="M0 1.25L2 0 4 1.25V3.75L2 5 0 3.75ZM2 0V-1M2 5V6" fill="none" stroke="#fcf8f0" stroke-width=".3"/>
</pattern>
<pattern id="stitch" width="2.4" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(25)">
  <path d="M0 0H2.4M0 1.5H2.4" stroke="#fcf9f0" stroke-width="1.05"/>
  <path d="M0 .5H2.4M0 2H2.4" stroke="#c5b5a3" stroke-width=".3" stroke-opacity=".65"/>
  <path d="M.5 0V3" stroke="#fffdf6" stroke-width=".35"/>
</pattern>
<clipPath id="edge"><path d="M0 100V32Q30 5 60 24Q90 37 120 7Q150 37 180 24Q210 5 240 32V100Z"/></clipPath>
<filter id="cloth"><feTurbulence type="fractalNoise" baseFrequency=".6" numOctaves="2" seed="24" stitchTiles="stitch" result="grain"/><feColorMatrix type="matrix" values="0 0 0 0 .45 0 0 0 0 .35 0 0 0 0 .33 0 0 0 .08 0"/><feComposite in2="SourceAlpha" operator="in"/><feBlend in="SourceGraphic" mode="multiply"/></filter>
</defs>'''

def flower(cx,cy,radius,petals=8,rose=False):
    result=f'<g transform="translate({cx} {cy})">'
    for i in range(petals):
        angle=i*360/petals
        d=f'M0 0C{-radius*.65:.2f} {-radius*.25:.2f} {-radius*.5:.2f} {-radius:.2f} 0 {-radius:.2f}C{radius*.5:.2f} {-radius:.2f} {radius*.65:.2f} {-radius*.25:.2f} 0 0Z'
        result+=f'<g transform="rotate({angle})"><path d="{d}" fill="url(#stitch)"/>'+thread(d,1.4,rose)
        result+=thread(f'M0-3Q{-radius*.22:.2f} {-radius*.5:.2f} 0 {-radius*.86:.2f}Q{radius*.22:.2f} {-radius*.5:.2f} 0-3',.65)
        for j in range(4):
            y= -radius*.32 - j*radius*.13
            w=radius*(.22-.02*j)
            result+=thread(f'M{-w:.2f} {y:.2f}Q0 {y-2:.2f} {w:.2f} {y:.2f}',.4)
        result+='</g>'
    for r in [4,5.8,7.2]:
        d=f'M{r} 0A{r} {r} 0 1 0 {-r} 0A{r} {r} 0 1 0 {r} 0'
        result+=thread(d,.75,rose)
    for i in range(12):
        angle=i*pi/6
        result+=thread(f'M{cos(angle)*2:.2f} {sin(angle)*2:.2f}L{cos(angle)*4:.2f} {sin(angle)*4:.2f}',.65)
    return result+'</g>'

def leaf(x,y,angle,length=21):
    d=f'M0 0Q{-length*.5} {-length*.55} 0 {-length}Q{length*.5} {-length*.55} 0 0Z'
    result=f'<g transform="translate({x} {y}) rotate({angle})"><path d="{d}" fill="url(#stitch)"/>'+thread(d,1.2)
    result+=thread(f'M0 0L0 {-length}',.8)
    for j in range(1,7):
        yy=-length*j/8;ww=length*.25*sin(pi*j/8)
        result+=thread(f'M{-ww:.2f} {yy-3:.2f}L0 {yy:.2f} {ww:.2f} {yy-3:.2f}',.5)
    return result+'</g>'

def build_lace(out):
    lace='<g filter="url(#cloth)"><path d="M0 0H240V100H0Z" fill="url(#mesh)" clip-path="url(#edge)"/>'
    border='M0 32Q30 5 60 24Q90 37 120 7Q150 37 180 24Q210 5 240 32'
    lace+=thread(border,2.3)
    lace+=thread('M0 38Q30 11 60 30Q90 43 120 13Q150 43 180 30Q210 11 240 38',.9)
    # Picots follow the actual quadratic boundary, rather than a generic dotted edge.
    segments=[((0,32),(30,5),(60,24)),((60,24),(90,37),(120,7)),((120,7),(150,37),(180,24)),((180,24),(210,5),(240,32))]
    for a,b,c in segments:
        for j in range(1,11):
            t=j/11;x=(1-t)**2*a[0]+2*t*(1-t)*b[0]+t*t*c[0];y=(1-t)**2*a[1]+2*t*(1-t)*b[1]+t*t*c[1]
            lace+=thread(f'M{x-1.4:.2f} {y:.2f}C{x-3:.2f} {y-7:.2f} {x+3:.2f} {y-7:.2f} {x+1.4:.2f} {y:.2f}',.65)
    lace+=thread('M0 91C25 91 34 56 61 57C84 58 81 87 120 84C159 87 156 58 179 57C206 56 215 91 240 91',2.1)
    lace+=thread('M0 96C25 96 34 61 61 62C84 63 81 92 120 89C159 92 156 63 179 62C206 61 215 96 240 96',.85,True)
    lace+=flower(120,55,25,8,True)+flower(22,58,13,6)+flower(218,58,13,6)
    for x,y,a,l in [(55,69,-40,24),(66,68,35,23),(78,80,65,21),(162,80,-65,21),(174,68,-35,23),(185,69,40,24),(100,85,-35,14),(140,85,35,14)]:lace+=leaf(x,y,a,l)
    for x in [45,84,156,195]:
        lace+=thread(f'M{x} 40C{x-10} 30 {x+12} 25 {x+10} 37C{x+9} 45 {x+1} 43 {x+3} 37',1.1)
    for y in [96,98.6]:lace+=thread(f'M0 {y}H240',.85)
    lace+='</g>'
    body=DEFS+lace
    (out/'lace-edge.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="240" height="100" viewBox="0 0 240 100">{body}</svg>')
    (out/'lace-edge-vertical.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="240" viewBox="0 0 100 240">{DEFS}<g transform="translate(0 240) rotate(-90)">{lace}</g></svg>')
    # One nine-slice border, with dedicated turning panels. No horizontal or
    # vertical length is painted over a corner; the open ground has one layer.
    turn='M120 32C102 14 87 9 72 16C40 14 14 40 16 72C9 87 14 102 32 120'
    turn_shape=turn+'H120Z'
    corner=f'<path d="{turn_shape}" fill="url(#mesh)"/>'
    corner+=thread(turn,2.3)
    corner+=thread('M120 38C102 20 87 15 73 22C44 20 20 44 22 73C15 87 20 102 38 120',.9)
    # The floral spray turns on the diagonal, like a worked handkerchief corner.
    spray=thread('M120 91C93 95 82 83 68 67C53 50 41 54 36 44M91 120C95 93 83 82 67 68',2.1)
    spray+=flower(49,49,20,8)+flower(91,40,11,6)+flower(40,91,11,6)
    for x,y,a,l in [(69,70,-45,24),(76,79,120,23),(90,86,60,20),(86,90,-150,20),(41,67,-73,17),(67,41,-17,17)]:spray+=leaf(x,y,a,l)
    corner+=f'<g clip-path="url(#turn-clip)">{spray}</g>'
    turn_segments=[((120,32),(102,14),(87,9),(72,16)),((72,16),(40,14),(14,40),(16,72)),((16,72),(9,87),(14,102),(32,120))]
    for a,b,c,d in turn_segments:
        for j in range(1,13):
            t=j/13;q=1-t
            x=q**3*a[0]+3*q*q*t*b[0]+3*q*t*t*c[0]+t**3*d[0]
            y=q**3*a[1]+3*q*q*t*b[1]+3*q*t*t*c[1]+t**3*d[1]
            dx=3*q*q*(b[0]-a[0])+6*q*t*(c[0]-b[0])+3*t*t*(d[0]-c[0])
            dy=3*q*q*(b[1]-a[1])+6*q*t*(c[1]-b[1])+3*t*t*(d[1]-c[1])
            norm=(dx*dx+dy*dy)**.5;tx=dx/norm;ty=dy/norm;nx=-ty;ny=tx
            corner+=thread(f'M{x-tx*1.2:.2f} {y-ty*1.2:.2f}C{x+nx*5-tx*2:.2f} {y+ny*5-ty*2:.2f} {x+nx*5+tx*2:.2f} {y+ny*5+ty*2:.2f} {x+tx*1.2:.2f} {y+ty*1.2:.2f}',.6)
    for i in [96,98.6]:
        corner+=thread(f'M120 {i}Q{i} {i} {i} 120',.85)
    frame_defs=DEFS+f'<defs><clipPath id="turn-clip"><path d="{turn_shape}"/></clipPath><g id="lace-length">{lace}</g><g id="lace-turn">{corner}</g></defs>'
    frame=frame_defs+'''<use href="#lace-length" x="120"/>
<use href="#lace-length" transform="translate(480 480) rotate(180) translate(120 0)"/>
<use href="#lace-length" transform="translate(0 360) rotate(-90)"/>
<use href="#lace-length" transform="translate(480 120) rotate(90)"/>
<use href="#lace-turn"/><use href="#lace-turn" transform="translate(480 0) scale(-1 1)"/>
<use href="#lace-turn" transform="translate(0 480) scale(1 -1)"/><use href="#lace-turn" transform="translate(480 480) scale(-1 -1)"/>'''
    (out/'lace-frame.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480" viewBox="0 0 480 480">{frame}</svg>')
    weave='''<defs><pattern id="linen" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#e8d9d7"/><path d="M1 0V6M4 0V6" stroke="#cfb8b6" stroke-width="1.1"/><path d="M0 1H6M0 4H6" stroke="#f8edeb" stroke-width="1.5"/><path d="M1 0V2.5M4 3V5.5" stroke="#f7ebe7" stroke-width="1.35"/><path d="M1.5 0V2.5M4.5 3V5.5" stroke="#c7ada9" stroke-opacity=".5" stroke-width=".3"/><path d="M0 1.5H3M3 4.5H6" stroke="#bca6a0" stroke-opacity=".3" stroke-width=".35"/></pattern><filter id="grain"><feTurbulence baseFrequency=".8" numOctaves="2" seed="8" stitchTiles="stitch"/><feColorMatrix type="matrix" values="0 0 0 0 .5 0 0 0 0 .4 0 0 0 0 .4 0 0 0 .08 0"/></filter></defs><path d="M0 0H240V240H0Z" fill="url(#linen)"/><path d="M0 0H240V240H0Z" filter="url(#grain)"/>'''
    (out/'linen-weave.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240">{weave}</svg>')

if __name__=='__main__':build_lace(OUT)
