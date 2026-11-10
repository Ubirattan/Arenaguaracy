import { CheckCircle2, X, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import clsx from "clsx";

type ToastItem = { id: number; tone: "success" | "error"; message: string };
const ToastContext = createContext<{ success: (m: string) => void; error: (m: string) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const remove = (id: number) => setItems((l) => l.filter((t) => t.id !== id));
  const push = useCallback((tone: ToastItem["tone"], message: string) => {
    const id = Date.now() + Math.random();
    setItems((l) => [...l, { id, tone, message }]);
    setTimeout(() => remove(id), 5000);
  }, []);
  const api = { success: (m: string) => push("success", m), error: (m: string) => push("error", m) };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-center gap-2 p-4 pt-safe sm:items-end">
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={clsx(
              "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border bg-white p-3 text-sm shadow-lg",
              t.tone === "success" ? "border-pitch-200" : "border-red-200",
            )}
          >
            {t.tone === "success" ? <CheckCircle2 className="h-5 w-5 text-pitch-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
            <p className="flex-1 text-slate-700">{t.message}</p>
            <button onClick={() => remove(t.id)} aria-label="Fechar" className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast deve ser usado dentro de <ToastProvider>");
  return ctx;
}
