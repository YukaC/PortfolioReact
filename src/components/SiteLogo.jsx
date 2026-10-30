import Image from "next/image";

/**
 * Signature mark — original raster, never redrawn or morphed.
 *
 * The dash under it belongs to the same language as the footer's social links:
 * hidden at rest, drawn left to right in white over 0.6s on hover or keyboard
 * focus, and the mark itself takes an ice glow at the same time. `pathLength`
 * normalises the curve to 1 so the reveal needs no measured length.
 */
const SiteLogo = ({
  className = "h-12 w-auto",
  priority = false,
  showStroke = false,
}) => (
  <span className="site-logo relative inline-flex items-end">
    <Image
      src="/logo-white.webp"
      alt="Agustin Ciucani"
      width={233}
      height={188}
      priority={priority}
      loading={priority ? "eager" : "lazy"}
      className={`site-logo-mark ${className} object-contain`}
      style={{ width: "auto" }}
    />
    {showStroke ? (
      <svg
        className="site-logo-dash pointer-events-none absolute inset-x-0 bottom-0 h-2.5 w-full"
        viewBox="0 0 233 12"
        fill="none"
        aria-hidden="true"
      >
        <path
          data-logo-stroke
          d="M8 8 C 56 2, 176 2, 225 8"
          pathLength="1"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ) : null}
  </span>
);

export default SiteLogo;
