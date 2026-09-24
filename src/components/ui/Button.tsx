import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icon } from "./Icon";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "quiet";
  size?: "md" | "sm";
  icon?: string;
  children?: ReactNode;
};

const VARIANTS = {
  primary: "bg-blue text-white hover:brightness-110 disabled:opacity-50",
  secondary: "border border-line-strong bg-white text-ink hover:border-ink disabled:opacity-50",
  danger: "bg-danger text-white hover:brightness-110 disabled:opacity-50",
  quiet: "text-slate hover:bg-black/5 hover:text-ink disabled:opacity-50",
} as const;

const SIZES = { md: "h-10 px-4 text-body gap-2", sm: "h-8 px-3 text-small gap-1.5" } as const;

export function Button({ variant = "primary", size = "md", icon, className = "", children, type = "button", ...props }: Props) {
  return (
    <button
      type={type}
      className={`inline-flex shrink-0 items-center justify-center rounded-field font-semibold transition-[filter,background-color,border-color] ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {icon && <Icon name={icon} size={size === "sm" ? 16 : 18} />}
      {children}
    </button>
  );
}

/** Square icon-only button; always give it an aria-label. */
export function IconButton({ icon, className = "", tone = "default", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: string; tone?: "default" | "danger" }) {
  return (
    <button
      type="button"
      className={`flex size-8 items-center justify-center rounded-field transition-colors disabled:opacity-40 ${
        tone === "danger" ? "text-danger hover:bg-danger-tint" : "text-slate hover:bg-black/5 hover:text-ink"
      } ${className}`}
      {...props}
    >
      <Icon name={icon} size={18} />
    </button>
  );
}
