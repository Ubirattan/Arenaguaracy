import clsx from "clsx";
import { AlertTriangle, CheckCircle2, Info, XCircle, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type Tone = "info" | "success" | "warning" | "error";
const tones: Record<Tone, { cls: string; Icon: LucideIcon }> = {
  info: { cls: "border-navy-200 bg-navy-50 text-navy-800", Icon: Info },
  success: { cls: "border-pitch-200 bg-pitch-50 text-pitch-800", Icon: CheckCircle2 },
  warning: { cls: "border-amber-200 bg-amber-50 text-amber-800", Icon: AlertTriangle },
  error: { cls: "border-red-200 bg-red-50 text-red-800", Icon: XCircle },
};

export function Alert({ tone = "info", title, children }: { tone?: Tone; title?: string; children?: ReactNode }) {
  const { cls, Icon } = tones[tone];
  return (
    <div className={clsx("flex gap-3 rounded-lg border p-3 text-sm", cls)} role={tone === "error" ? "alert" : "status"}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div>{children}</div>}
      </div>
    </div>
  );
}

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "green" | "red" | "amber" | "navy"; children: ReactNode }) {
  const map = {
    neutral: "bg-slate-100 text-slate-700",
    green: "bg-pitch-100 text-pitch-800",
    red: "bg-red-100 text-red-700",
    amber: "bg-amber-100 text-amber-800",
    navy: "bg-navy-100 text-navy-800",
  };
  return <span className={clsx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", map[tone])}>{children}</span>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <div className="rounded-full bg-navy-50 p-3 text-navy-600"><Icon className="h-6 w-6" /></div>
      <p className="font-semibold text-slate-700">{title}</p>
      {children && <div className="max-w-sm text-sm text-slate-500">{children}</div>}
    </div>
  );
}
