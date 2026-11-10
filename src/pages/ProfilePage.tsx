import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, friendlyError } from "@/lib/supabase";
import { ROLE_LABEL } from "@/lib/format";
import { fieldErrors, guardianContactSchema, newPasswordSchema, profileSchema } from "@/lib/validation";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Badge, PageHeader } from "@/components/ui/Feedback";
import { LoadingBlock } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import type { Guardian } from "@/types/database";

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <h2 className="font-semibold text-navy-900">{title}</h2>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function PersonalData() {
  const { profile, refreshProfile } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ full_name: profile?.full_name ?? "", phone: profile?.phone ?? "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = profileSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setBusy(true);
    const { error } = await supabase.from("profiles")
      .update({ full_name: parsed.data.full_name, phone: parsed.data.phone || null }).eq("id", profile!.id);
    setBusy(false);
    if (error) return toast.error(friendlyError(error));
    await refreshProfile();
    toast.success("Dados atualizados com sucesso.");
  }

  return (
    <Section title="Dados de acesso">
      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Field label="Nome completo" htmlFor="pf-name" required error={errors.full_name}>
          <Input id="pf-name" value={form.full_name} invalid={!!errors.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </Field>
        <Field label="Telefone" htmlFor="pf-phone" error={errors.phone}>
          <Input id="pf-phone" type="tel" inputMode="tel" placeholder="(00) 00000-0000" value={form.phone}
            invalid={!!errors.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
        <Field label="E-mail" hint="Para alterar o e-mail, fale com a administração.">
          <Input value={profile?.email ?? ""} disabled />
        </Field>
        <div className="flex items-end">
          <Button type="submit" loading={busy} className="w-full sm:w-auto">Salvar dados</Button>
        </div>
      </form>
    </Section>
  );
}

function GuardianContact() {
  const toast = useToast();
  const [guardian, setGuardian] = useState<Guardian | null | undefined>(undefined);
  const [form, setForm] = useState({ phone: "", phone_secondary: "", email: "", address: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("guardians").select("*").maybeSingle().then(({ data }) => {
      const g = data as Guardian | null;
      setGuardian(g);
      if (g) setForm({ phone: g.phone, phone_secondary: g.phone_secondary ?? "", email: g.email ?? "", address: g.address ?? "" });
    });
  }, []);

  if (guardian === undefined) return <LoadingBlock />;
  if (guardian === null) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = guardianContactSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setBusy(true);
    const { error } = await supabase.rpc("update_my_contact", {
      p_phone: parsed.data.phone, p_phone_secondary: parsed.data.phone_secondary,
      p_email: parsed.data.email, p_address: parsed.data.address,
    });
    setBusy(false);
    if (error) return toast.error(friendlyError(error));
    toast.success("Contato atualizado com sucesso.");
  }

  return (
    <Section title="Contato do responsável" description="Estes dados são usados pela escola para falar com você.">
      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Field label="Telefone principal" htmlFor="g-phone" required error={errors.phone}>
          <Input id="g-phone" type="tel" inputMode="tel" value={form.phone} invalid={!!errors.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
        <Field label="Telefone secundário" htmlFor="g-phone2" error={errors.phone_secondary}>
          <Input id="g-phone2" type="tel" inputMode="tel" value={form.phone_secondary} invalid={!!errors.phone_secondary} onChange={(e) => setForm({ ...form, phone_secondary: e.target.value })} />
        </Field>
        <Field label="E-mail de contato" htmlFor="g-email" error={errors.email}>
          <Input id="g-email" type="email" value={form.email} invalid={!!errors.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Endereço" htmlFor="g-addr" error={errors.address}>
          <Input id="g-addr" value={form.address} invalid={!!errors.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </Field>
        <div><Button type="submit" loading={busy}>Salvar contato</Button></div>
      </form>
    </Section>
  );
}

function ChangePassword() {
  const toast = useToast();
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = newPasswordSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    setBusy(false);
    if (error) return toast.error(friendlyError(error));
    setForm({ password: "", confirm: "" });
    toast.success("Senha alterada com sucesso.");
  }

  return (
    <Section title="Alterar senha" description="Mínimo de 8 caracteres, com letras e números.">
      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Field label="Nova senha" htmlFor="np" error={errors.password}>
          <Input id="np" type="password" autoComplete="new-password" value={form.password} invalid={!!errors.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        <Field label="Confirme a nova senha" htmlFor="npc" error={errors.confirm}>
          <Input id="npc" type="password" autoComplete="new-password" value={form.confirm} invalid={!!errors.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
        </Field>
        <div><Button type="submit" variant="navy" loading={busy}>Alterar senha</Button></div>
      </form>
    </Section>
  );
}

export function ProfilePage() {
  const { profile } = useAuth();
  if (!profile) return null;
  return (
    <>
      <PageHeader title="Meu perfil" actions={<Badge tone="navy">{ROLE_LABEL[profile.role]}</Badge>} />
      <div className="space-y-6">
        <PersonalData />
        {profile.role === "responsavel" && <GuardianContact />}
        <ChangePassword />
      </div>
    </>
  );
}
