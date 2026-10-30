/**
 * Label that rolls on hover: the visible text leaves upward and its copy
 * enters. The copy is `data-t`, painted by CSS `content: attr(data-t)`, so the
 * roll costs no extra DOM and the label stays a single string for readers.
 */
const RollingLabel = ({ children, className = "" }) => (
  <span className={`lb${className ? ` ${className}` : ""}`}>
    <span data-t={children}>{children}</span>
  </span>
);

export default RollingLabel;
