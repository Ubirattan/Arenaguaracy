import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { friendlyError } from "@/lib/supabase";
import { fieldErrors, loginSchema } from "@/lib/validation";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";
import { AuthShell } from "./AuthShell";

export function LoginPage() {
  const { signIn, session, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  if (!loading && session) return <Navigate to={from} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const parsed = loginSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setBusy(true);
    try {
      await signIn(parsed.data.email, parsed.data.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Entrar" subtitle="Acesse com o e-mail e a senha cadastrados.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && <Alert tone="error">{error}</Alert>}
        <Field label="E-mail" htmlFor="email" error={errors.email}>
          <Input id="email" type="email" autoComplete="email" inputMode="email" value={form.email}
            invalid={!!errors.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Senha" htmlFor="password" error={errors.password}>
          <div className="relative">
            <Input id="password" type={show ? "text" : "password"} autoComplete="current-password" value={form.password}
              invalid={!!errors.password} className="pr-11" onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Ocultar senha" : "Mostrar senha"}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 hover:text-slate-600">
              {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </Field>
        <Button type="submit" className="w-full" loading={busy}>Entrar</Button>
        <div className="text-center">
          <Link to="/esqueci-senha" className="text-sm font-semibold text-pitch-700 hover:underline">Esqueci minha senha</Link>
        </div>
        <p className="pt-2 text-center text-xs text-slate-500">
          Não tem acesso? As contas são criadas pela administração da Arena Guaracy.
        </p>
      </form>
    </AuthShell>
  );
}
