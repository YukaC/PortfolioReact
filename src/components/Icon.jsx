const icons = {
  menu: (
    <path
      d="M4 7h16M4 12h16M4 17h16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  ),
  close: (
    <path
      d="M6 6l12 12M18 6L6 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  ),
  arrow_forward: (
    <path
      d="M5 12h14M13 6l6 6-6 6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  auto_stories: (
    <>
      <path
        d="M4 5.5C4 4.67 4.67 4 5.5 4H11v14.5H5.5A1.5 1.5 0 0 1 4 17V5.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M20 5.5C20 4.67 19.33 4 18.5 4H13v14.5h5.5a1.5 1.5 0 0 0 1.5-1.5V5.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M13 4v14.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </>
  ),
  html: (
    <path
      d="M4.5 3.5h15l-1.4 15.5L12 21.5l-6.1-2.5L4.5 3.5zm3.2 4h8.6l-.2 2.2H9.3l.15 1.6h6.4l-.55 5.9L12 18.5l-3.3-1.15-.2-2.2h2.1l.1 1.05L12 16.5l1.35-.45.2-2.15H8.4L7.7 7.5z"
      fill="currentColor"
    />
  ),
  css: (
    <path
      d="M4.5 3.5h15l-1.4 15.5L12 21.5l-6.1-2.5L4.5 3.5zm3.2 4h8.6l-.2 2.2h-6.05l.15 1.6h5.75l-.55 5.9L12 18.5l-3.3-1.15-.2-2.2h2.1l.1 1.05L12 16.5l1.35-.45.15-1.55H8.55L7.7 7.5z"
      fill="currentColor"
    />
  ),
  javascript: (
    <>
      <rect
        x="3.5"
        y="3.5"
        width="17"
        height="17"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M10 15.5c0 1.2-.7 2-1.9 2-1 0-1.6-.5-2-1.2l1.15-.7c.2.35.4.55.75.55.4 0 .65-.25.65-.7V10.5H10v5zm4.1 2c-1.35 0-2.2-.7-2.5-1.6l1.2-.7c.15.45.55.75 1.15.75.5 0 .85-.25.85-.6 0-.35-.2-.5-.95-.75l-.35-.15c-1.15-.5-1.9-1.1-1.9-2.4 0-1.2.9-2.1 2.35-2.1 1.05 0 1.8.35 2.35 1.3l-1.15.75c-.25-.4-.55-.55-.95-.55-.4 0-.65.25-.65.55 0 .35.2.5.95.8l.35.15c1.35.6 2.1 1.2 2.1 2.5 0 1.4-1.1 2.25-2.6 2.25z"
        fill="currentColor"
      />
    </>
  ),
  deployed_code: (
    <>
      <path
        d="M12 3.5l7.5 4.25v8.5L12 20.5l-7.5-4.25v-8.5L12 3.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M12 12l7.5-4.25M12 12v8.5M12 12L4.5 7.75"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  style: (
    <path
      d="M12 3.5c-2.5 3.5-6.5 6.2-6.5 10.2a6.5 6.5 0 0 0 13 0c0-4-4-6.7-6.5-10.2z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinejoin="round"
    />
  ),
  code: (
    <path
      d="M8.5 7.5L3.5 12l5 4.5M15.5 7.5l5 4.5-5 4.5M13.5 5.5l-3 13"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  database: (
    <>
      <ellipse
        cx="12"
        cy="6"
        rx="7"
        ry="2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M5 6v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6M5 12v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
      />
    </>
  ),
  account_tree: (
    <path
      d="M8 5.5h8v4H8v-4zm0 9h4v4H8v-4zm8 0h4v4h-4v-4zM12 9.5v3M10 14.5v-2h8v2"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinejoin="round"
    />
  ),
  /** Social — ready for Footer: `github` | `linkedin` | `instagram` */
  github: (
    <path
      d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
      fill="currentColor"
    />
  ),
  linkedin: (
    <path
      d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"
      fill="currentColor"
    />
  ),
  instagram: (
    <path
      d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
      fill="currentColor"
    />
  ),
};

/**
 * Inline SVG icon by name.
 *
 * Valid `name` values:
 * `"menu"` | `"close"` | `"arrow_forward"` | `"auto_stories"` | `"html"` | `"css"` |
 * `"javascript"` | `"deployed_code"` | `"style"` | `"code"` | `"database"` | `"account_tree"` |
 * `"github"` | `"linkedin"` | `"instagram"`
 *
 * Social icons (`github` | `linkedin` | `instagram`) are ready for Footer to consume.
 *
 * @param {object} props
 * @param {"menu"|"close"|"arrow_forward"|"auto_stories"|"html"|"css"|"javascript"|"deployed_code"|"style"|"code"|"database"|"account_tree"|"github"|"linkedin"|"instagram"} props.name
 * @param {string} [props.className]
 * @param {number} [props.size=24]
 */
export default function Icon({ name, className, size = 24, ...props }) {
  const content = icons[name];
  if (!content) {
    if (process.env.NODE_ENV === "development") {
      console.warn(`[Icon] Unknown icon name: "${name}"`);
    }
    return null;
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {content}
    </svg>
  );
}
