import type { CSSProperties } from "react";

export function Icon({ name, fill = false, size = 20, className = "", style }: { name: string; fill?: boolean; size?: number; className?: string; style?: CSSProperties }) {
  return (
    <span aria-hidden="true" className={`material-symbols-outlined ${className}`} style={{ fontSize: size, fontVariationSettings: `"FILL" ${fill ? 1 : 0}`, ...style }}>
      {name}
    </span>
  );
}
