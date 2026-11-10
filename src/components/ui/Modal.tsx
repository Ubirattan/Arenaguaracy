import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { Button } from "./Button";

export function Modal({ open, title, onClose, children, footer }: {
  open: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/60 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:max-w-lg sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-bold text-navy-900">{title}</h2>
          <button onClick={onClose} aria-label="Fechar" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 pb-safe sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = "Confirmar", danger, loading, onConfirm, onCancel }: {
  open: boolean; title: string; message: ReactNode; confirmLabel?: string; danger?: boolean;
  loading?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>Cancelar</Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </>
      }
    >
      <div className="text-sm text-slate-600">{message}</div>
    </Modal>
  );
}
