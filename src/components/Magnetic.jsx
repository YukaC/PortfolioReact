import { useRef } from "react";
import { useMagnetic } from "@/hooks/useMagnetic";

const Magnetic = ({ children, className = "", strength }) => {
  const ref = useRef(null);
  useMagnetic(ref, { strength });

  return (
    <span ref={ref} className={`inline-flex ${className}`.trim()}>
      {children}
    </span>
  );
};

export default Magnetic;
