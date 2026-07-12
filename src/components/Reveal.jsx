import { useInView } from "@/hooks/useInView";

/**
 * Fade/slide-up when scrolled into view. Children stay in the tree (SSR-safe).
 */
const Reveal = ({
  children,
  className = "",
  delayMs = 0,
  as: Tag = "div",
  ...rest
}) => {
  const [ref, isVisible] = useInView();
  const { style: restStyle, ...restProps } = rest;

  return (
    <Tag
      ref={ref}
      className={`reveal ${isVisible ? "reveal-visible" : ""} ${className}`.trim()}
      {...restProps}
      style={{
        ...restStyle,
        ...(delayMs ? { transitionDelay: `${delayMs}ms` } : null),
      }}
    >
      {children}
    </Tag>
  );
};

export default Reveal;
