import FieldScene from "@/components/FieldScene";

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
          <FieldScene variant="full" />
      </div>
    </>
  );
}
