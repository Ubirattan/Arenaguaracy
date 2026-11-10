import clsx from "clsx";
import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  htmlFor?: string;
}

export function Field({ label, error, hint, required, children, htmlFor }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-red-600" role="alert">{error}</p>
      ) : hint ? (
        <p className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ invalid, className, ...rest }, ref) {
    return <input ref={ref} {...rest} aria-invalid={invalid} className={clsx("input", invalid && "input-error", className)} />;
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(
  function Select({ invalid, className, children, ...rest }, ref) {
    return (
      <select ref={ref} {...rest} aria-invalid={invalid} className={clsx("input", invalid && "input-error", className)}>
        {children}
      </select>
    );
  },
);
