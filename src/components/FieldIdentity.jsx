import { FIELD_FLARES } from "@/lib/field-flares";

/**
 * The field's identity layer: the coral lattice and its 36 strikes.
 *
 * Plain markup with no hooks and no `"use client"`, so it renders the same in
 * the live field (`AppBackground`) and in the documents that bypass the app tree
 * (`global-not-found`, `global-error`), where no script is guaranteed to run.
 *
 * The strikes come from the pre-generated table (docs/audit.md §18.4, §19.2):
 * integer cell coordinates in `--cx`/`--cy` — the stylesheet turns them into
 * `calc(var(--cx) * 48px + 24px)` so every flare lands on a dot centre, which a
 * viewport percentage cannot do (§19.3) — plus the phase, as a whole slot of the
 * breath (`calc(<slot> * var(--grid))`). The cycle is `--breath` in the
 * stylesheet, one value for the whole field.
 */
const FLARE_ELEMENTS = FIELD_FLARES.map((flare) => (
  <i
    key={`${flare.cx}x${flare.cy}`}
    className="flare"
    style={{
      "--cx": String(flare.cx),
      "--cy": String(flare.cy),
      "--delay": `calc(${flare.slot} * var(--grid))`,
    }}
  />
));

const FieldIdentity = () => (
  <>
    <div className="bocanada-lattice" />
    <div className="bocanada-flares">{FLARE_ELEMENTS}</div>
  </>
);

export default FieldIdentity;
