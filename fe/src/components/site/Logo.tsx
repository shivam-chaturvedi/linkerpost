import { Link } from "@tanstack/react-router";
import logoUrl from "@/assets/logo.png";

type LogoProps = {
  className?: string;
  size?: "compact" | "default" | "large";
  markOnly?: boolean;
  lightSurface?: boolean;
};

const logoSizes = {
  compact: "h-10 w-[150px]",
  default: "h-12 w-[190px]",
  large: "h-16 w-[250px]",
} as const;

export function Logo({
  className = "",
  size = "default",
  markOnly = false,
  lightSurface = false,
}: LogoProps) {
  return (
    <Link to="/" aria-label="Linker Post home" className={`inline-flex shrink-0 ${className}`}>
      <span
        className={`relative block overflow-hidden ${
          markOnly ? "h-11 w-12" : logoSizes[size]
        } ${lightSurface ? "rounded-xl bg-white" : ""}`}
      >
        <img
          src={logoUrl}
          alt=""
          aria-hidden="true"
          className={`absolute top-1/2 block max-w-none -translate-y-1/2 ${
            markOnly ? "left-0 w-[150px]" : "left-1/2 w-full -translate-x-1/2"
          }`}
        />
      </span>
    </Link>
  );
}
