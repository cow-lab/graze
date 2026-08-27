const FIELD_TILE_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'>
  <rect width='240' height='240' fill='#5E7A3B'/>
  <g stroke='#4E6930' stroke-width='2' stroke-linecap='round'>
    <line x1='20' y1='210' x2='16' y2='196'/>
    <line x1='30' y1='215' x2='27' y2='199'/>
    <line x1='130' y1='40' x2='126' y2='26'/>
    <line x1='140' y1='45' x2='137' y2='29'/>
    <line x1='190' y1='150' x2='186' y2='136'/>
    <line x1='60' y1='110' x2='56' y2='96'/>
  </g>
  <g transform='translate(70,60)'>
    <g fill='#F4C84E' stroke='#2B2A1F' stroke-width='1.2'>
      <circle cx='0' cy='-5' r='3.4'/><circle cx='4.5' cy='-1.5' r='3.4'/>
      <circle cx='2.7' cy='4.3' r='3.4'/><circle cx='-2.7' cy='4.3' r='3.4'/>
      <circle cx='-4.5' cy='-1.5' r='3.4'/>
    </g>
    <circle cx='0' cy='0' r='2.4' fill='#C24F3D'/>
  </g>
  <g transform='translate(195,190)'>
    <g fill='#FFFFFF' stroke='#2B2A1F' stroke-width='1.2'>
      <circle cx='0' cy='-5' r='3.4'/><circle cx='4.5' cy='-1.5' r='3.4'/>
      <circle cx='2.7' cy='4.3' r='3.4'/><circle cx='-2.7' cy='4.3' r='3.4'/>
      <circle cx='-4.5' cy='-1.5' r='3.4'/>
    </g>
    <circle cx='0' cy='0' r='2.4' fill='#F4C84E'/>
  </g>
</svg>`;

const FIELD_TILE_URL = `url("data:image/svg+xml,${encodeURIComponent(FIELD_TILE_SVG)}")`;

const FLOWER_POSITIONS: [number, number][] = [
  [210, 290],
  [340, 300],
  [520, 305],
  [120, 295],
  [600, 298],
];

export default function GrazeBackground() {
  return (
    <>
      {/* infinitely repeating grass field. Fixed to the viewport (not absolutely positioned relative to
          page content) so it always covers the full screen with zero dependency on any ancestor's computed
          height — a repeating tile looks identical whether it scrolls with the page or stays put, so `fixed`
          is both simpler and more robust than trying to stretch an `absolute inset-0` to match content height. */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundColor: "#5E7A3B",
          backgroundImage: FIELD_TILE_URL,
          backgroundRepeat: "repeat",
          backgroundSize: "240px 240px",
        }}
      />

      {/* cartoon sky — sits at the very top of the page only; scrolling past it leaves just the tiled field above.
          Height tracks viewport width (340/980 ≈ 34.7vw) so wide viewports don't stretch the artwork vertically
          and clip the hills/fence/cow, clamped to a sane min/max range. Plain vw-based clamp() instead of
          aspect-ratio, since aspect-ratio's sizing algorithm interacts unreliably with an absolutely positioned
          element whose width is itself resolved from left/right:0 rather than stated directly. */}
      {/* The 220px floor this used to have works fine down to ~tablet width, but below
          that `xMidYMin slice` starts cropping real width off both edges (the container's
          aspect ratio gets much taller/narrower than the viewBox's, so `slice` zooms in to
          cover it) — the sun in particular fell completely outside the visible slice on a
          375px-wide screen. Lowering the floor to 150px keeps the whole 980-wide scene in
          frame (just shorter) instead of a fixed-height band cropping it sideways. */}
      <div
        className="absolute top-0 left-0 right-0 z-[1] overflow-hidden"
        style={{ height: "clamp(145px, 34.7vw, 480px)" }}
      >
        <svg
          viewBox="0 0 980 340"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMin slice"
          className="block w-full h-full"
        >
          <rect width="980" height="340" fill="#F6ECC9" />
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

          {/* a detailed, coherent grazing cow — one continuous body overlapping a correctly-sized
              head at the neck, sturdy legs with real width and small hooves, floppy ears, nub horns,
              a pink snout with nostrils, eyes with a highlight dot, a blush, a tail with a tuft, and
              two organic spots sitting inside the body outline. Sits in the open hillside, clear of
              the sun/clouds/logo and well below the translucent header's footprint at every viewport
              width. Draw order matters for the seamless joins: legs first (so the body covers their
              tops), then body, then the head on top of the body (covering the neck junction), then
              the head-mounted details on top of the head. */}
          <g transform="translate(610,205)" stroke="#2B2A1F" strokeLinecap="round" strokeLinejoin="round">
            {/* legs — sturdy tapered capsules with small hoof caps, not thin single-stroke lines */}
            {[8, 20, 46, 58].map((x) => (
              <g key={x}>
                <path
                  d={`M${x - 4},18 Q${x - 5},32 ${x - 4},42 Q${x - 3.5},46 ${x},46 Q${x + 3.5},46 ${x + 4},42 Q${x + 5},32 ${x + 4},18 Q${x + 2},15 ${x},15 Q${x - 2},15 ${x - 4},18 Z`}
                  fill="#FFFFFF"
                  strokeWidth="2"
                />
                <ellipse cx={x} cy="47" rx="5" ry="3" fill="#2B2A1F" strokeWidth="1" />
              </g>
            ))}

            {/* body — one continuous barrel torso */}
            <path
              d="M0,-14 Q15,-24 35,-20 Q58,-16 68,-2 Q75,10 66,20 Q56,28 36,26 Q16,30 -2,24 Q-10,18 -8,4 Q-9,-8 0,-14 Z"
              fill="#FFFFFF"
              strokeWidth="2.3"
            />

            {/* tail with a tuft */}
            <path d="M68,6 Q82,10 85,26 Q86,36 80,42" fill="none" strokeWidth="2" />
            <path
              d="M75,40 Q80,49 85,41 Q90,36 83,39 Q77,42 75,40 Z"
              fill="#2B2A1F"
              strokeWidth="1.4"
            />

            {/* organic spot markings, sitting cleanly inside the body outline — deliberately
                small and irregular (uneven curve handles) rather than neat circles */}
            <path
              d="M14,-10 Q17,-16 24,-14 Q29,-12 27,-6 Q26,-1 20,-2 Q13,-3 14,-10 Z"
              fill="#2B2A1F"
              opacity="0.85"
              stroke="none"
            />
            <path
              d="M45,10 Q50,6 55,9 Q59,12 56,17 Q53,21 47,18 Q42,14 45,10 Z"
              fill="#2B2A1F"
              opacity="0.85"
              stroke="none"
            />

            {/* head — a correctly-sized shape overlapping the body at the neck, no gap */}
            <path
              d="M-14,-16 Q-28,-28 -44,-24 Q-58,-20 -60,-4 Q-62,12 -48,20 Q-35,26 -20,19 Q-8,13 -8,0 Q-8,-9 -14,-16 Z"
              fill="#FFFFFF"
              strokeWidth="2.3"
            />

            {/* small nub horns — short filled wedges (not bare lines), so they read as solid
                nubs rather than whiskers */}
            <path
              d="M-41,-22 Q-42,-28 -38,-33 Q-35,-30 -36,-24 Q-37,-21 -41,-22 Z"
              fill="#FFFFFF"
              strokeWidth="1.6"
            />
            <path
              d="M-31,-23 Q-31,-29 -26,-34 Q-22,-31 -24,-25 Q-26,-22 -31,-23 Z"
              fill="#FFFFFF"
              strokeWidth="1.6"
            />

            {/* floppy ears — attached near the top of the head, hanging well past its silhouette
                (down over the jaw/neck) so they read as distinct flaps, not lines lost inside the
                head's own outline */}
            <path
              d="M-20,-22 Q-15,-16 -16,-2 Q-17,12 -15,22 Q-14,28 -18,29 Q-22,28 -22,20 Q-23,6 -22,-8 Q-21,-18 -20,-22 Z"
              fill="#FFFFFF"
              strokeWidth="2"
            />
            <path
              d="M-43,-23 Q-49,-17 -49,-3 Q-49,11 -47,21 Q-46,27 -41,26 Q-38,24 -39,16 Q-40,2 -40,-10 Q-41,-19 -43,-23 Z"
              fill="#FFFFFF"
              strokeWidth="2"
            />

            {/* pink snout with nostrils */}
            <path
              d="M-62,0 Q-67,6 -62,13 Q-56,18 -49,13 Q-45,9 -47,0 Q-51,-6 -58,-4 Z"
              fill="#F2C9C0"
              strokeWidth="1.8"
            />
            <ellipse cx="-58" cy="4" rx="1.6" ry="2.2" fill="#2B2A1F" stroke="none" />
            <ellipse cx="-51" cy="6" rx="1.6" ry="2.2" fill="#2B2A1F" stroke="none" />

            {/* eyes with a highlight dot */}
            <circle cx="-42" cy="-10" r="3.2" fill="#2B2A1F" stroke="none" />
            <circle cx="-43.2" cy="-11.5" r="1.1" fill="#FFFFFF" stroke="none" />
            <circle cx="-28" cy="-7" r="3.2" fill="#2B2A1F" stroke="none" />
            <circle cx="-29.2" cy="-8.5" r="1.1" fill="#FFFFFF" stroke="none" />

            {/* blush */}
            <circle cx="-48" cy="3" r="4.5" fill="#F2A38A" opacity="0.45" stroke="none" />
            <circle cx="-22" cy="1" r="3.5" fill="#F2A38A" opacity="0.35" stroke="none" />
          </g>

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
      </div>
    </>
  );
}
