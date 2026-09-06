import FieldScene from "@/components/FieldScene";

// The repeating field. The flowers used to carry the same heavy ink outline as the
// foreground cow, which at tile scale read as scattered confetti rather than ground
// texture — especially in the gutters between opaque cards. They keep their shape but
// lose the outline and sit closer to the grass in value, so the field reads as a surface
// behind the content instead of competing with it.
const FIELD_TILE_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'>
  <rect width='240' height='240' fill='#5E7A3B'/>
  <g stroke='#557034' stroke-width='2' stroke-linecap='round'>
    <line x1='20' y1='210' x2='16' y2='196'/>
    <line x1='30' y1='215' x2='27' y2='199'/>
    <line x1='130' y1='40' x2='126' y2='26'/>
    <line x1='140' y1='45' x2='137' y2='29'/>
    <line x1='190' y1='150' x2='186' y2='136'/>
    <line x1='60' y1='110' x2='56' y2='96'/>
    <line x1='96' y1='168' x2='92' y2='154'/>
    <line x1='214' y1='72' x2='210' y2='58'/>
  </g>
  <g opacity='0.5'>
    <g transform='translate(70,60)'>
      <g fill='#EBD98C'>
        <circle cx='0' cy='-3.6' r='2.4'/><circle cx='3.2' cy='-1.1' r='2.4'/>
        <circle cx='2' cy='3' r='2.4'/><circle cx='-2' cy='3' r='2.4'/>
        <circle cx='-3.2' cy='-1.1' r='2.4'/>
      </g>
      <circle cx='0' cy='0' r='1.5' fill='#C7A94E'/>
    </g>
    <g transform='translate(195,190)'>
      <g fill='#F0EEDC'>
        <circle cx='0' cy='-3.6' r='2.4'/><circle cx='3.2' cy='-1.1' r='2.4'/>
        <circle cx='2' cy='3' r='2.4'/><circle cx='-2' cy='3' r='2.4'/>
        <circle cx='-3.2' cy='-1.1' r='2.4'/>
      </g>
      <circle cx='0' cy='0' r='1.5' fill='#D8C87A'/>
    </g>
  </g>
</svg>`;

const FIELD_TILE_URL = `url("data:image/svg+xml,${encodeURIComponent(FIELD_TILE_SVG)}")`;

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
      {/* A sky-and-hills band behind the top of every inner page. The cow is left out here
          (see FieldScene's showCow): it sits low enough in the artwork that the first
          content panel cut straight across it. The homepage's own hero still leads with it. */}
      <div
        className="absolute top-0 left-0 right-0 z-[1] overflow-hidden"
        style={{ height: "clamp(96px, 24vw, 330px)" }}
      >
          <FieldScene variant="full" showCow={false} />
      </div>
    </>
  );
}
