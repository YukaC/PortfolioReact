/**
 * Reveal marker. The animation itself lives in CSS (`[data-r]`) and the trigger
 * is the page-wide observer in `useRevealOnEnter` — a component here only
 * declares where a beat starts and how late it lands.
 */
const Reveal = ({
  children,
  className = "",
  delayMs = 0,
  as: Tag = "div",
  ...rest
}) => (
  <Tag data-r="" style={{ "--d": `${delayMs}ms` }} className={className} {...rest}>
    {children}
  </Tag>
);

export default Reveal;
