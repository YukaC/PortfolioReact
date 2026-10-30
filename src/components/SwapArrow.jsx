const PATHS = {
  r: "M5 12h14M13 6l6 6-6 6",
  d: "M7 17 17 7M8 7h9v9",
};

/**
 * Arrow that leaves on hover and its copy that enters from the opposite side.
 * Two stacked glyphs inside a clipping box — pure CSS, no state.
 */
const SwapArrow = ({ direction = "r", size = 16, className = "" }) => (
  <span
    className={`ar${direction === "d" ? " ar-diag" : ""}${
      className ? ` ${className}` : ""
    }`}
    style={{ width: size, height: size }}
    aria-hidden="true"
  >
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={PATHS[direction]} />
    </svg>
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={PATHS[direction]} />
    </svg>
  </span>
);

export default SwapArrow;
