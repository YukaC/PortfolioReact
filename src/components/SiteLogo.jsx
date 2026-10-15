import Image from "next/image";

/**
 * Signature mark — original raster, never redrawn or morphed.
 */
const SiteLogo = ({ className = "h-12 w-auto", priority = false, showStroke = false }) => (
  <span className="relative inline-flex items-end">
    <Image
      src="/logo-white.webp"
      alt="Agustin Ciucani"
      width={233}
      height={188}
      priority={priority}
      loading={priority ? "eager" : "lazy"}
      className={`${className} object-contain`}
      style={{ width: "auto" }}
    />
    {showStroke ? (
      <svg
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2.5 w-full text-ice/70"
        viewBox="0 0 233 12"
        fill="none"
        aria-hidden="true"
      >
        <path
          data-logo-stroke
          d="M8 8 C 56 2, 176 2, 225 8"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ) : null}
  </span>
);

export default SiteLogo;
