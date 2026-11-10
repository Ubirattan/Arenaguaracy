import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";
import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "navy";

const styles: Record<Variant, string> = {
  primary: "bg-pitch-600 text-white hover:bg-pitch-700 shadow-sm",
  navy: "bg-navy-900 text-white hover:bg-navy-800 shadow-sm",
  secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 shadow-sm",
  danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
  ghost: "text-slate-600 hover:bg-slate-100",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  size?: "sm" | "md";
}

export function Button({ variant = "primary", loading, size = "md", className, children, disabled, ...rest }: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
        size === "md" ? "min-h-[44px] px-4 text-sm" : "min-h-[36px] px-3 text-xs",
        styles[variant],
        className,
      )}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}
