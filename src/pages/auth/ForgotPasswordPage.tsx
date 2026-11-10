import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { supabase, friendlyError } from "@/lib/supabase";
import { emailSchema } from "@/lib/validation";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";
import { AuthShell } from "./AuthShell";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) return setFieldError(parsed.error.issues[0]!.message);
    setFieldError("");
    setError("");
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    setBusy(false);
    // Mensagem neutra: não revela se o e-mail existe (privacidade)
    if (error && !/not found/i.test(error.message)) setError(friendlyError(error));
    else setSent(true);
  }

  return (
    <AuthShell title="Recuperar senha" subtitle="Enviaremos um link para você criar uma nova senha.">
      {sent ? (
        <div className="space-y-4">
          <Alert tone="success" title="Verifique seu e-mail">
            Se houver uma conta com este e-mail, você receberá um link para redefinir a senha em instantes.
          </Alert>
          <Link to="/login" className="block text-center text-sm font-semibold text-pitch-700 hover:underline">Voltar ao login</Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {error && <Alert tone="error">{error}</Alert>}
          <Field label="E-mail" htmlFor="email" error={fieldError}>
            <Input id="email" type="email" autoComplete="email" value={email} invalid={!!fieldError}
              onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Button type="submit" className="w-full" loading={busy}>Enviar link</Button>
          <Link to="/login" className="block text-center text-sm font-semibold text-pitch-700 hover:underline">Voltar ao login</Link>
        </form>
      )}
    </AuthShell>
  );
}
