import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Search, ShieldCheck, UserPlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, friendlyError } from "@/lib/supabase";
import { ROLE_LABEL, formatDate } from "@/lib/format";
import { fieldErrors, inviteUserSchema } from "@/lib/validation";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { Alert, Badge, EmptyState, PageHeader } from "@/components/ui/Feedback";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { LoadingBlock } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import type { Guardian, Profile, Teacher, UserRole } from "@/types/database";

/** Chama a Edge Function admin-users (executa com a chave de serviço, no servidor) */
async function adminUsers(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("admin-users", { body });
  if (error) {
    // tenta extrair a mensagem enviada pela função
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      const j = await ctx.json().catch(() => null);
      if (j?.error) throw new Error(j.error);
    }
    if (/Failed to send|FunctionsFetchError/i.test(error.message))
      throw new Error("A função de servidor 'admin-users' não está publicada no Supabase. Veja o README (etapa de deploy).");
    throw error;
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

const roleTone: Record<UserRole, "navy" | "green" | "amber"> = { admin: "navy", professor: "green", responsavel: "amber" };

export function UsersPage() {
  const { profile: me } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState<Profile[] | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<"" | UserRole>("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [confirm, setConfirm] = useState<null | { kind: "active" | "role"; user: Profile; role?: UserRole }>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("profiles").select("*").order("full_name");
    if (error) setError(friendlyError(error));
    else setUsers(data as Profile[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (users ?? []).filter((u) =>
      (!roleFilter || u.role === roleFilter) &&
      (!term || u.full_name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)));
  }, [users, q, roleFilter]);

  async function runConfirm() {
    if (!confirm) return;
    setBusy(true);
    try {
      if (confirm.kind === "active") {
        await adminUsers({ action: "set_active", user_id: confirm.user.id, active: !confirm.user.active });
        toast.success(confirm.user.active ? "Acesso desativado." : "Acesso reativado.");
      } else {
        await adminUsers({ action: "set_role", user_id: confirm.user.id, role: confirm.role });
        toast.success("Perfil de acesso alterado.");
      }
      setConfirm(null);
      await load();
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Usuários e acessos"
        subtitle="Crie contas para professores e responsáveis e controle as permissões."
        actions={<Button onClick={() => setInviteOpen(true)}><UserPlus className="h-4 w-4" /> Convidar usuário</Button>}
      />

      <div className="card mb-4 grid gap-3 p-4 sm:grid-cols-[1fr_200px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Buscar por nome ou e-mail" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" />
        </div>
        <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as UserRole | "")} aria-label="Filtrar por perfil">
          <option value="">Todos os perfis</option>
          {(Object.keys(ROLE_LABEL) as UserRole[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </Select>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {!users && !error && <LoadingBlock />}
      {users && (
        <div className="card overflow-hidden">
          {filtered.length === 0 ? (
            <EmptyState icon={ShieldCheck} title="Nenhum usuário encontrado" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {filtered.map((u) => (
                <li key={u.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold text-slate-800">{u.full_name || "(sem nome)"}</p>
                      <Badge tone={roleTone[u.role]}>{ROLE_LABEL[u.role]}</Badge>
                      {!u.active && <Badge tone="red">Desativado</Badge>}
                      {u.id === me?.id && <Badge>Você</Badge>}
                    </div>
                    <p className="truncate text-sm text-slate-500">{u.email} · desde {formatDate(u.created_at)}</p>
                  </div>
                  {u.id !== me?.id && (
                    <div className="flex gap-2">
                      <Select
                        className="!py-1.5 !text-sm"
                        value={u.role}
                        aria-label={`Perfil de ${u.full_name}`}
                        onChange={(e) => setConfirm({ kind: "role", user: u, role: e.target.value as UserRole })}
                      >
                        {(Object.keys(ROLE_LABEL) as UserRole[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                      </Select>
                      <Button size="sm" variant={u.active ? "secondary" : "primary"} onClick={() => setConfirm({ kind: "active", user: u })}>
                        {u.active ? "Desativar" : "Reativar"}
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} onDone={load} />

      <ConfirmDialog
        open={!!confirm}
        loading={busy}
        danger={confirm?.kind === "active" && confirm.user.active}
        title={confirm?.kind === "role" ? "Alterar perfil de acesso" : confirm?.user.active ? "Desativar acesso" : "Reativar acesso"}
        confirmLabel="Confirmar"
        message={
          confirm?.kind === "role"
            ? <>Alterar o perfil de <b>{confirm.user.full_name}</b> para <b>{ROLE_LABEL[confirm.role!]}</b>? As permissões mudam imediatamente.</>
            : confirm?.user.active
              ? <>Desativar o acesso de <b>{confirm?.user.full_name}</b>? A pessoa não conseguirá mais entrar no aplicativo.</>
              : <>Reativar o acesso de <b>{confirm?.user.full_name}</b>?</>
        }
        onConfirm={runConfirm}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}

function InviteModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState({ full_name: "", email: "", role: "responsavel" as UserRole, link_id: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [guardians, setGuardians] = useState<Pick<Guardian, "id" | "full_name" | "email">[]>([]);
  const [teachers, setTeachers] = useState<Pick<Teacher, "id" | "full_name" | "email">[]>([]);

  useEffect(() => {
    if (!open) return;
    setForm({ full_name: "", email: "", role: "responsavel", link_id: "" });
    setErrors({});
    supabase.from("guardians").select("id, full_name, email").is("profile_id", null).order("full_name").then(({ data }) => setGuardians(data ?? []));
    supabase.from("teachers").select("id, full_name, email").is("profile_id", null).order("full_name").then(({ data }) => setTeachers(data ?? []));
  }, [open]);

  const linkOptions = form.role === "responsavel" ? guardians : form.role === "professor" ? teachers : [];

  function pickLink(id: string) {
    const rec = linkOptions.find((o) => o.id === id);
    setForm((f) => ({ ...f, link_id: id, full_name: rec?.full_name ?? f.full_name, email: rec?.email ?? f.email }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = inviteUserSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setBusy(true);
    try {
      await adminUsers({
        action: "invite",
        ...parsed.data,
        guardian_id: form.role === "responsavel" && form.link_id ? form.link_id : undefined,
        teacher_id: form.role === "professor" && form.link_id ? form.link_id : undefined,
        redirect_to: `${window.location.origin}/redefinir-senha`,
      });
      toast.success(`Convite enviado para ${parsed.data.email}.`);
      onDone();
      onClose();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Convidar usuário"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button type="submit" form="invite-form" loading={busy}>Enviar convite</Button>
        </>
      }
    >
      <form id="invite-form" onSubmit={onSubmit} className="space-y-4" noValidate>
        <Alert tone="info">A pessoa receberá um e-mail com um link para criar a própria senha.</Alert>
        <Field label="Perfil de acesso" htmlFor="inv-role" required error={errors.role}>
          <Select id="inv-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole, link_id: "" })}>
            <option value="responsavel">Responsável</option>
            <option value="professor">Professor</option>
            <option value="admin">Administrador</option>
          </Select>
        </Field>
        {form.role !== "admin" && (
          <Field
            label={form.role === "responsavel" ? "Vincular ao cadastro de responsável" : "Vincular ao cadastro de professor"}
            htmlFor="inv-link"
            hint={linkOptions.length === 0 ? "Nenhum cadastro sem conta disponível. O vínculo pode ser feito depois." : "Recomendado: liga a conta aos dados já cadastrados."}
          >
            <Select id="inv-link" value={form.link_id} onChange={(e) => pickLink(e.target.value)} disabled={linkOptions.length === 0}>
              <option value="">— Não vincular agora —</option>
              {linkOptions.map((o) => <option key={o.id} value={o.id}>{o.full_name}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Nome completo" htmlFor="inv-name" required error={errors.full_name}>
          <Input id="inv-name" value={form.full_name} invalid={!!errors.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </Field>
        <Field label="E-mail" htmlFor="inv-email" required error={errors.email}>
          <Input id="inv-email" type="email" value={form.email} invalid={!!errors.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
      </form>
    </Modal>
  );
}
