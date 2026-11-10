import type { ReactNode } from "react";
import { Logo } from "@/components/ui/Logo";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-navy-900 lg:flex-row">
      <div className="relative flex flex-col items-center justify-center gap-4 overflow-hidden px-6 pb-10 pt-14 text-center lg:w-1/2 lg:pb-14">
        <div aria-hidden className="absolute -right-24 -top-24 h-72 w-72 rounded-full border-[24px] border-pitch-500/15" />
        <div aria-hidden className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full border-[24px] border-navy-700/60" />
        <div className="relative z-10"><Logo size={88} /></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-white lg:text-4xl">Arena Guaracy</h1>
          <p className="mt-1 text-sm font-semibold uppercase tracking-[0.25em] text-pitch-400">Escola de Futebol</p>
        </div>
        <p className="relative z-10 hidden max-w-sm text-sm text-navy-200 lg:block">
          Gestão de atletas, turmas, presença, mensalidades e comunicados em um só lugar.
        </p>
      </div>
      <div className="flex flex-1 items-start justify-center rounded-t-3xl bg-slate-50 px-4 py-8 lg:items-center lg:rounded-none">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold text-navy-900">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
