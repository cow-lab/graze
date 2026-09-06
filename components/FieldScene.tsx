import { CowDoodle } from "@/components/CowDoodle";

const FLOWER_POSITIONS: [number, number][] = [
  [210, 290],
  [340, 300],
  [520, 305],
  [120, 295],
  [600, 298],
];

// The illustrated scene itself — sky, sun, clouds, hills, fence, cow, flowers — drawn once
// and framed two ways:
//
//   "full"    the page background's top band: the whole 980x340 scene, sky included.
//   "horizon" the Discover landing hero: the same drawing cropped to its lower strip, so it
//             reads as a distant horizon at the bottom of the screen rather than a backdrop
//             filling the page behind a centred search box.
//
// One drawing, two crops — the alternative (a second, simplified scene for the hero) would
// be two illustrations to keep in sync every time the hills or the cow change.
const FRAMES = {
  full: { viewBox: "0 0 980 340", preserveAspectRatio: "xMidYMin slice" },
  // Framed to start above the hilltops so the strip opens with the hills' wobbly edge
  // against the same cream the hero is painted in, rather than a flat green band with a
  // ruler-straight top. `slice` (not `meet`) because a container whose aspect ratio drifts
  // from the viewBox's should crop, not letterbox — letterboxing leaves cream gutters down
  // both sides of a full-bleed strip.
  horizon: { viewBox: "0 100 980 240", preserveAspectRatio: "xMidYMax slice" },
} as const;

export default function FieldScene({
  variant = "full",
  className = "",
  showCow = true,
}: {
  variant?: keyof typeof FRAMES;
  className?: string;
  /**
   * The cow's drawing extends ~68 units above its origin at y=205, so any crop that shows
   * the hills also catches the top of the cow. On inner pages the first content panel then
   * lands across it and slices it in half, which reads as a broken image. Those pages opt
   * out and keep the landscape; the homepage frames the cow deliberately.
   */
  showCow?: boolean;
}) {
  const frame = FRAMES[variant];
  // The horizon crop starts just above the hilltops, which puts the bottom edge of the sun
  // right on the strip's top border — it reads as a clipped shape rather than a sun. Sky
  // furniture belongs to the full framing only.
  const showSky = variant === "full";
  return (
    <svg
      viewBox={frame.viewBox}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio={frame.preserveAspectRatio}
      className={`block w-full h-full ${className}`}
      // Purely decorative scenery — it carries no information a reader needs, so it's
      // hidden from assistive tech rather than described. Announcing "sun, cow, hills"
      // before every page's actual content would be noise.
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="980" height="340" fill="#F6ECC9" />
      {showSky && (
        <>
        {/* doodle sun — wobbly hand-drawn blob, thin squiggly rays. Shifted 45 units left
            of its original position so it stays inside the visible slice at phone widths
            (see the height-floor comment above) instead of falling off the right edge. */}
        <g transform="translate(-25,0)">
          <g stroke="#2B2A1F" strokeWidth="2" strokeLinecap="round" fill="none">
            <path d="M912,70 Q921,66 927,71" />
            <path d="M898,101 Q905,108 903,116" />
            <path d="M862,116 Q861,126 866,134" />
            <path d="M826,102 Q819,109 812,115" />
            <path d="M812,71 Q803,68 794,72" />
            <path d="M826,39 Q820,32 813,26" />
            <path d="M861,25 Q862,15 857,7" />
            <path d="M897,39 Q904,33 911,27" />
          </g>
          <path
            d="M816,68 Q812,42 840,30 Q862,18 886,32 Q908,44 904,70 Q902,96 878,108 Q856,118 834,106 Q814,96 816,68 Z"
            fill="#F4C84E"
            stroke="#2B2A1F"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <path d="M840,63 Q845,58 850,63" stroke="#2B2A1F" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <path d="M868,63 Q873,58 878,63" stroke="#2B2A1F" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <circle cx="838" cy="76" r="5" fill="#F2A38A" opacity="0.5" />
          <circle cx="882" cy="76" r="5" fill="#F2A38A" opacity="0.5" />
          <path d="M843,80 Q860,92 877,79" stroke="#2B2A1F" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        </g>

        {/* doodle clouds — single loose scribble outline, no hard geometry */}
        <path
          d="M108,66 Q104,50 122,48 Q126,36 142,38 Q152,26 168,34 Q184,30 188,44 Q204,44 200,60 Q206,72 190,74 L118,74 Q100,74 108,66 Z"
          fill="#FFFFFF"
          stroke="#2B2A1F"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M452,42 Q449,30 462,29 Q466,20 478,24 Q488,16 498,24 Q510,24 507,36 Q516,42 505,48 L458,48 Q446,48 452,42 Z"
          fill="#FFFFFF"
          stroke="#2B2A1F"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        </>
      )}

      {/* rolling hills, loose hand-drawn wobble, blending into the tiled field's green at the bottom edge */}
      <path
        d="M0,150 Q90,128 170,138 Q260,105 350,140 Q430,118 500,128 Q590,102 680,125 Q800,112 870,132 Q930,120 980,145 L980,340 L0,340 Z"
        fill="#C9DA9E"
        stroke="#2B2A1F"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M0,210 Q110,182 220,195 Q320,165 420,198 Q520,178 620,193 Q740,168 860,190 Q920,178 980,205 L980,340 L0,340 Z"
        fill="#8CA555"
        stroke="#2B2A1F"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M0,270 Q140,242 260,258 Q380,232 500,262 Q640,240 760,258 Q880,238 980,255 L980,340 L0,340 Z"
        fill="#5E7A3B"
        stroke="#2B2A1F"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />

      {/* fence, cartoon-thick */}
      <g stroke="#7A5A3A" strokeWidth="2.4" strokeLinecap="round">
        <line x1="70" y1="225" x2="66" y2="270" />
        <line x1="120" y1="220" x2="117" y2="265" />
        <line x1="170" y1="217" x2="168" y2="262" />
        <line x1="58" y1="236" x2="182" y2="228" />
        <line x1="60" y1="253" x2="180" y2="245" />
      </g>

      {/* A grazing cow drawn in a loose ink-doodle idiom: wobbly single-weight outlines,
          flat fills, blob spots, dot eyes, no gradients or highlights. The wobble is
          deliberate and hand-placed — every curve is slightly off-symmetric, the legs
          differ from each other, and the pen "overshoots" in a couple of places, because
          a doodle that's geometrically perfect stops reading as hand-drawn.

          Draw order matters for the seamless joins: legs first (the body covers their
          tops), then the body, then the head over the body's neck end, then the details
          that sit on the head. Positioned to stay clear of the sun, the logo, and the
          translucent header's footprint at every viewport width. */}
      {/* the grazing cow — see components/CowDoodle.tsx */}
      {showCow && <CowDoodle transform="translate(610,205) rotate(-1.5)" />}

      {/* whimsical hand-doodled flowers along the horizon */}
      {FLOWER_POSITIONS.map(([fx, fy], i) => (
        <g
          key={i}
          transform={`translate(${fx},${fy})`}
          stroke="#2B2A1F"
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
        >
          <path d="M0,10 Q-1,2 0,-4" />
          <path
            d="M0,-4 Q-6,-8 -3,-13 Q2,-14 3,-9 Q7,-6 3,-2 Q7,1 3,4 Q6,8 1,9 Q-3,8 0,-4 Z"
            fill="#F4C84E"
          />
          <circle cx="0" cy="-3" r="2" fill="#C24F3D" stroke="none" />
        </g>
      ))}
    </svg>
  );
}
