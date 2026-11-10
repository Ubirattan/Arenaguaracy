import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, friendlyError } from "@/lib/supabase";
import { fieldErrors, newPasswordSchema } from "@/lib/validation";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";
import { LoadingScreen } from "@/components/ui/Spinner";
import { AuthShell } from "./AuthShell";

/** Usada tanto no primeiro acesso (convite) quanto na recuperação de senha */
export function ResetPasswordPage() {
  const { session, loading, clearRecovery } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return <LoadingScreen />;

  if (!session) {
    return (
      <AuthShell title="Link inválido ou expirado">
        <div className="space-y-4">
          <Alert tone="warning">Este link não é mais válido. Solicite um novo link de recuperação.</Alert>
          <Link to="/esqueci-senha" className="block text-center text-sm font-semibold text-pitch-700 hover:underline">
            Solicitar novo link
          </Link>
        </div>
      </AuthShell>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = newPasswordSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setError("");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    setBusy(false);
    if (error) return setError(friendlyError(error));
    clearRecovery();
    window.history.replaceState(null, "", "/");
    navigate("/", { replace: true });
  }

  return (
    <AuthShell title="Definir nova senha" subtitle="Use pelo menos 8 caracteres, com letras e números.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && <Alert tone="error">{error}</Alert>}
        <Field label="Nova senha" htmlFor="password" error={errors.password}>
          <Input id="password" type="password" autoComplete="new-password" value={form.password}
            invalid={!!errors.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        <Field label="Confirme a nova senha" htmlFor="confirm" error={errors.confirm}>
          <Input id="confirm" type="password" autoComplete="new-password" value={form.confirm}
            invalid={!!errors.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
        </Field>
        <Button type="submit" className="w-full" loading={busy}>Salvar senha</Button>
      </form>
    </AuthShell>
  );
}
