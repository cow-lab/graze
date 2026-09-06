// The cow, drawn once and used in three places: standing in the page-background scene,
// standing in the Discover landing's horizon strip, and running in the loading animation.
//
// Legs are emitted one <g> per leg rather than as a single group so the running cycle can
// pivot each one at its own hip. Everything else is one static block — the body doesn't
// need to move for a run to read as a run, and keeping it still keeps the animation cheap.

// One entry per leg: the shin and the hoof that caps it. Front pair first (the head end).
const LEGS = [
  { leg: "M5,16 C3,25 4,34 2.5,42 C5,43.5 9,43.5 11,42 C10.5,34 11.5,25 12.5,16 Z", hoof: "M1.5,42 C4.5,40 10,40.5 12,42.5 C12.5,45 10,46.5 6.5,46.5 C3,46.5 1,45 1.5,42 Z" },
  { leg: "M20,18 C19.5,27 19,36 18,43.5 C20.5,45 24,45 26,43.5 C26,36 26.5,27 27.5,18 Z", hoof: "M17,43.5 C20,42 25.5,42 27.5,44 C28,46.5 25,48 22,48 C19,48 16.5,46.5 17,43.5 Z" },
  { leg: "M45,17 C43,26 44.5,35 42.5,42.5 C45,44 49,44 51,42.5 C50,35 51,26 52.5,17 Z", hoof: "M41.5,42.5 C44.5,40.5 50,41 52,43 C52.5,45.5 49.5,47 46.5,47 C43.5,47 41,45.5 41.5,42.5 Z" },
  { leg: "M59,15 C58.5,24 59.5,33 59,41 C61.5,42.5 65.5,42.5 67.5,41 C66,33 66.5,24 66,15 Z", hoof: "M58,41 C61,39.5 66.5,39.5 68.5,41.5 C69,44 66,45.5 63,45.5 C60,45.5 57.5,44 58,41 Z" },
];

export function CowDoodle({
  transform,
  running = false,
}: {
  transform?: string;
  /** Adds the leg-cycle and body-bob classes; the CSS itself is motion-safe. */
  running?: boolean;
}) {
  return (
    <g transform={transform} stroke="#2B2A1F" strokeLinecap="round" strokeLinejoin="round">
      {/* legs — four, none identical: each shin bows a different way and the back pair
          stand a little wider, so they don't read as four copies of one rectangle. When
          running, alternate legs swing in opposite phase, which is what a gait looks like
          at this level of detail. */}
      {LEGS.map((leg, i) => (
        <g
          key={i}
          className={running ? (i % 2 === 0 ? "cow-leg cow-leg-a" : "cow-leg cow-leg-b") : undefined}
        >
          <path d={leg.leg} strokeWidth="2.1" fill="#FFFFFF" />
          <path d={leg.hoof} fill="#2B2A1F" strokeWidth="1" />
        </g>
      ))}

      <g className={running ? "cow-body" : undefined}>
        {/* body — deliberately lumpy: the spine dips behind the shoulder, the hip rises,
            and the belly sags off-centre. A clean oval is what makes a shape stop looking
            hand-drawn, so none of these curves is allowed to be symmetrical. */}
        <path
          d="M-2,-11 C1,-20 10,-26 21,-25 C28,-24 32,-21 38,-22
             C46,-24 58,-22 66,-13 C73,-5 74,8 67,17
             C60,25 48,25 39,26 C29,27 17,30 8,28
             C-1,26 -8,21 -9,11 C-10,1 -6,-5 -2,-11 Z"
          fill="#FFFFFF"
          strokeWidth="2.6"
        />

        {/* tail — a wandering line with a scribbled tuft on the end */}
        <path d="M69,-4 C79,0 85,10 82,21 C81,27 78,30 75,32" fill="none" strokeWidth="2.1" />
        <path
          d="M71,29 C76,31 80,35 77,39 C74,42 70,39 69,35 C68.5,32 69,30 71,29 Z"
          fill="#2B2A1F"
          strokeWidth="1.2"
        />

        {/* spots — lumpy ink blobs with a wobble in the edge, not soft ovals */}
        <g fill="#2B2A1F" stroke="none">
          <path d="M13,-13 C17,-19 26,-21 31,-16 C35,-12 34,-5 28,-3 C22,-1 16,-3 13,-7 C11,-9 11,-11 13,-13 Z" />
          <path d="M46,6 C50,1 59,1 62,7 C64,12 61,18 55,19 C49,20 44,16 44,11 C44,9 44.5,7.5 46,6 Z" />
          <path d="M20,20 C23,17 28,18 28,21 C28,24 24,26 21,24.5 C19,23.5 18.5,21 20,20 Z" />
        </g>

        {/* head — dipped toward the grass. Longer than it is tall, with a bit of jaw, so
            it reads as a cow's head rather than a ball with a face on it. */}
        <path
          d="M-6,-11 C-11,-21 -24,-26 -37,-24 C-49,-22 -57,-13 -56,-2
             C-55,8 -47,16 -35,17 C-24,18 -14,13 -9,5 C-5,-1 -4,-6 -6,-11 Z"
          fill="#FFFFFF"
          strokeWidth="2.4"
        />

        {/* horn nubs — two little stubs on top of the skull, between the ears, one
            shorter than the other */}
        <path d="M-38,-23 C-40,-28 -37,-32 -34,-30 C-32,-28 -33,-25 -35,-22 Z" fill="#FFFFFF" strokeWidth="1.7" />
        <path d="M-27,-23 C-28,-27 -25,-30 -23,-28 C-21,-26 -22,-24 -24,-22 Z" fill="#FFFFFF" strokeWidth="1.7" />

        {/* ears — one out each side, angled down and away from the horns so the three
            don't pile up on the same corner of the head */}
        <path
          d="M-49,-15 C-59,-20 -68,-16 -66,-9 C-64,-3 -55,-6 -49,-10 Z"
          fill="#FFFFFF"
          strokeWidth="2"
        />
        <path
          d="M-17,-17 C-10,-25 -2,-23 -4,-16 C-6,-11 -13,-12 -17,-14 Z"
          fill="#FFFFFF"
          strokeWidth="2"
        />

        {/* muzzle — soft blob, two nostril dashes rather than dots */}
        <path
          d="M-57,-1 C-64,3 -63,13 -54,16 C-45,19 -38,14 -39,6 C-40,-1 -49,-4 -57,-1 Z"
          fill="#F2C9C0"
          strokeWidth="2"
        />
        <path d="M-54,5 C-53,7 -53.5,9 -55,9.5" fill="none" strokeWidth="1.8" />
        <path d="M-46,6 C-45,8 -45.5,10 -47,10.5" fill="none" strokeWidth="1.8" />

        {/* eyes — plain ink dots, uneven on purpose */}
        <circle cx="-41" cy="-8" r="2.8" fill="#2B2A1F" stroke="none" />
        <circle cx="-25" cy="-6" r="2.4" fill="#2B2A1F" stroke="none" />
      </g>
    </g>
  );
}
