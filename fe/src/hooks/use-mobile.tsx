import * as React from "react";

const MOBILE_BREAKPOINT = 768;
const COMPACT_BREAKPOINT = 1024;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

export function useIsCompactScreen() {
  const [isCompact, setIsCompact] = React.useState(() =>
    typeof window !== "undefined" ? window.innerWidth < COMPACT_BREAKPOINT : true,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${COMPACT_BREAKPOINT - 1}px)`);
    const onChange = () => setIsCompact(mql.matches);
    mql.addEventListener("change", onChange);
    setIsCompact(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isCompact;
}
