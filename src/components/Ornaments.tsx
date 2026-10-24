export function InkFilters() {
  return <svg className="material-filters" aria-hidden="true" width="0" height="0">
    <defs>
      <filter id="ink-absorption" x="-3%" y="-8%" width="106%" height="116%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency=".035 .07" numOctaves="3" seed="23" result="pigment" />
        <feColorMatrix in="pigment" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  .4 .4 .4 0 .3" result="density" />
        <feTurbulence type="fractalNoise" baseFrequency=".75 .62" numOctaves="2" seed="41" result="fibre" />
        <feColorMatrix in="fibre" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  .4 .4 .4 0 .3" result="absorption" />
        <feDisplacementMap in="SourceGraphic" in2="fibre" scale=".38" xChannelSelector="R" yChannelSelector="G" result="brokenEdge" />
        <feComposite in="brokenEdge" in2="density" operator="in" result="unevenInk" />
        <feComposite in="unevenInk" in2="absorption" operator="in" result="ink" />
        <feGaussianBlur in="SourceAlpha" stdDeviation=".28" result="wicking" />
        <feFlood floodColor="#695145" floodOpacity=".24" result="bleedColor" />
        <feComposite in="bleedColor" in2="wicking" operator="in" result="bleed" />
        <feMerge><feMergeNode in="bleed" /><feMergeNode in="ink" /></feMerge>
      </filter>
    </defs>
  </svg>;
}

export function Flourish({ className = '' }: { className?: string }) {
  return <svg className={`flourish ${className}`} viewBox="0 0 220 32" fill="none" aria-hidden="true">
    <path d="M110 24C94 11 73 34 54 17S22 13 2 16M110 24C126 11 147 34 166 17S198 13 218 16" />
    <path d="M110 24C99 18 92 4 101 4S112 17 110 24C112 17 110 4 119 4S121 18 110 24M75 23C53 31 41 4 26 7M145 23C167 31 179 4 194 7M63 21C52 16 62 6 68 12S66 20 63 21M157 21C168 16 158 6 152 12S154 20 157 21" />
    <path d="M108 25L110 29 112 25" /><circle cx="15" cy="15" r="1.5" /><circle cx="205" cy="15" r="1.5" />
  </svg>;
}

export function BookIcon({ className = '' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 48 40" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><path d="M24 34V9Q14 2 3 7V30Q14 26 24 34Q34 26 45 30V7Q34 2 24 9M7 12Q14 9 20 13M7 17Q14 14 20 18M7 22Q14 19 20 23M28 13Q35 9 41 12M28 18Q35 14 41 17M28 23Q35 19 41 22M1 9V34Q15 29 24 37Q33 29 47 34V9" /></svg>;
}

export function BookmarkIcon({ filled = false }: { filled?: boolean }) {
  return <svg viewBox="0 0 20 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.1" aria-hidden="true"><path d="M4 2H16V21L10 17 4 21Z" /><path d="M7 6H13M7 9H13" stroke={filled ? '#eee1c5' : 'currentColor'} /></svg>;
}

export function NodeFrame() {
  return <svg className="node-frame" viewBox="0 0 244 116" preserveAspectRatio="none" fill="none" aria-hidden="true">
    <path d="M22 6H100L122 1 144 6H222Q222 22 238 22V94Q222 94 222 110H144L122 115 100 110H22Q22 94 6 94V22Q22 22 22 6Z" />
    <path d="M27 11H99L122 6 145 11H217Q217 27 233 27V89Q217 89 217 105H145L122 110 99 105H27Q27 89 11 89V27Q27 27 27 11Z" />
    <path d="M18 7C1 6 2 26 13 24S19 11 14 14M226 7C243 6 242 26 231 24S225 11 230 14M18 109C1 110 2 90 13 92S19 105 14 102M226 109C243 110 242 90 231 92S225 105 230 102" />
    <path d="M113 6L122 11 131 6M113 110L122 105 131 110M5 50L1 58 5 66M239 50L243 58 239 66" />
  </svg>;
}

export function Leaf({ x, y, angle = 0, size = 1 }: { x: number; y: number; angle?: number; size?: number }) {
  return <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${size})`}>
    <path d="M0 0C-12-2-19-14-14-27C-2-25 8-14 0 0Z" fill="#a39b6b" fillOpacity=".3" stroke="#878260" strokeWidth=".8" />
    <path d="M0 0Q-9-12-14-25M-4-8L-13-11M-8-15L-16-19M-5-10L-3-18" fill="none" stroke="#878260" strokeWidth=".65" />
  </g>;
}
