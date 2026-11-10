import clsx from "clsx";
import { Logo } from "./Logo";

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={clsx("animate-spin", className ?? "h-5 w-5")} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function LoadingScreen({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-navy-900 text-white">
      <Logo size={64} />
      <div className="flex items-center gap-2 text-sm text-navy-100">
        <Spinner className="h-4 w-4" /> {label}
      </div>
    </div>
  );
}

export function LoadingBlock({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500" role="status">
      <Spinner className="h-5 w-5 text-pitch-600" /> {label}
    </div>
  );
}
