import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CalendarDays, CheckCircle2, Clock, Users, Wallet, type LucideIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, friendlyError } from "@/lib/supabase";
import { WEEKDAYS, formatCurrency, ageFromBirth } from "@/lib/format";
import { Alert, EmptyState, PageHeader } from "@/components/ui/Feedback";
import { LoadingBlock } from "@/components/ui/Spinner";

function StatCard({ label, value, icon: Icon, tone = "navy", to }: {
  label: string; value: string | number; icon: LucideIcon; tone?: "navy" | "green" | "amber" | "red"; to?: string;
}) {
  const tones = {
    navy: "bg-navy-50 text-navy-700", green: "bg-pitch-50 text-pitch-700",
    amber: "bg-amber-50 text-amber-700", red: "bg-red-50 text-red-700",
  };
  const body = (
    <div className="card flex items-center gap-4 p-4 transition hover:shadow-md">
      <div className={`rounded-xl p-3 ${tones[tone]}`}><Icon className="h-6 w-6" /></div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-navy-900">{value}</p>
        <p className="truncate text-sm text-slate-500">{label}</p>
      </div>
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

function firstOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function AdminDashboard() {
  const [data, setData] = useState<null | {
    athletes: number; classes: number; paid: number; paidValue: number; pending: number; overdue: number; overdueValue: number;
  }>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const month = firstOfMonth();
        const [a, c, inv, overdue] = await Promise.all([
          supabase.from("athletes").select("id", { count: "exact", head: true }).eq("status", "ativo").is("archived_at", null),
          supabase.from("classes").select("id", { count: "exact", head: true }).eq("active", true),
          supabase.from("v_invoices").select("effective_status, amount, discount, paid_amount").eq("reference_month", month),
          supabase.from("v_invoices").select("amount, discount, paid_amount").eq("effective_status", "atrasado"),
        ]);
        const err = a.error || c.error || inv.error || overdue.error;
        if (err) throw err;
        const rows = inv.data ?? [];
        setData({
          athletes: a.count ?? 0,
          classes: c.count ?? 0,
          paid: rows.filter((r) => r.effective_status === "pago").length,
          paidValue: rows.reduce((s, r) => s + Number(r.paid_amount), 0),
          pending: rows.filter((r) => r.effective_status === "pendente").length,
          overdue: overdue.data?.length ?? 0,
          overdueValue: (overdue.data ?? []).reduce((s, r) => s + Number(r.amount) - Number(r.discount) - Number(r.paid_amount), 0),
        });
      } catch (e) {
        setError(friendlyError(e));
      }
    })();
  }, []);

  if (error) return <Alert tone="error" title="Não foi possível carregar os indicadores">{error}</Alert>;
  if (!data) return <LoadingBlock />;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Atletas ativos" value={data.athletes} icon={Users} to="/atletas" />
        <StatCard label="Turmas ativas" value={data.classes} icon={CalendarDays} to="/turmas" />
        <StatCard label="Recebido no mês" value={formatCurrency(data.paidValue)} icon={Wallet} tone="green" to="/financeiro" />
        <StatCard label="Mensalidades pagas no mês" value={data.paid} icon={CheckCircle2} tone="green" to="/financeiro" />
        <StatCard label="Pendentes no mês" value={data.pending} icon={Clock} tone="amber" to="/financeiro" />
        <StatCard label={`Atrasadas (${formatCurrency(data.overdueValue)})`} value={data.overdue} icon={AlertTriangle} tone="red" to="/financeiro" />
      </div>
      {data.athletes === 0 && (
        <Alert tone="info" title="Banco de dados pronto">
          Ainda não há atletas cadastrados. Os módulos de cadastro serão liberados nas próximas etapas.
        </Alert>
      )}
    </div>
  );
}

interface ClassWithSchedules {
  id: string; name: string; location: string;
  class_schedules: { weekday: number; start_time: string; end_time: string }[];
}

function TeacherDashboard() {
  const [classes, setClasses] = useState<ClassWithSchedules[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    supabase.from("classes").select("id, name, location, class_schedules(weekday, start_time, end_time)").eq("active", true).order("name")
      .then(({ data, error }) => (error ? setError(friendlyError(error)) : setClasses((data as ClassWithSchedules[]) ?? [])));
  }, []);
  if (error) return <Alert tone="error">{error}</Alert>;
  if (!classes) return <LoadingBlock />;
  return (
    <div className="card">
      <h2 className="border-b border-slate-100 px-5 py-4 font-semibold text-navy-900">Minhas turmas</h2>
      {classes.length === 0 ? (
        <EmptyState icon={CalendarDays} title="Nenhuma turma vinculada">
          Quando a administração vincular turmas a você, elas aparecerão aqui.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-slate-100">
          {classes.map((c) => (
            <li key={c.id} className="px-5 py-3">
              <p className="font-semibold text-slate-800">{c.name}</p>
              <p className="text-sm text-slate-500">
                {c.location} ·{" "}
                {c.class_schedules
                  .sort((a, b) => a.weekday - b.weekday)
                  .map((s) => `${WEEKDAYS[s.weekday]} ${s.start_time.slice(0, 5)}–${s.end_time.slice(0, 5)}`)
                  .join(", ") || "sem horário"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function GuardianDashboard() {
  const [kids, setKids] = useState<{ id: string; full_name: string; birth_date: string; status: string }[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    supabase.from("athletes").select("id, full_name, birth_date, status").order("full_name")
      .then(({ data, error }) => (error ? setError(friendlyError(error)) : setKids(data ?? [])));
  }, []);
  if (error) return <Alert tone="error">{error}</Alert>;
  if (!kids) return <LoadingBlock />;
  return (
    <div className="card">
      <h2 className="border-b border-slate-100 px-5 py-4 font-semibold text-navy-900">Meus atletas</h2>
      {kids.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum atleta vinculado">
          Seu cadastro ainda não foi vinculado a um atleta. Procure a administração da Arena Guaracy.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-slate-100">
          {kids.map((k) => (
            <li key={k.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="font-semibold text-slate-800">{k.full_name}</p>
                <p className="text-sm text-slate-500">{ageFromBirth(k.birth_date)} anos</p>
              </div>
              <span className="text-xs font-semibold uppercase text-pitch-700">{k.status}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function DashboardPage() {
  const { profile } = useAuth();
  if (!profile) return null;
  const firstName = profile.full_name.split(" ")[0] || "";
  return (
    <>
      <PageHeader title={`Olá${firstName ? `, ${firstName}` : ""}!`} subtitle="Bem-vindo(a) à Arena Guaracy." />
      {profile.role === "admin" && <AdminDashboard />}
      {profile.role === "professor" && <TeacherDashboard />}
      {profile.role === "responsavel" && <GuardianDashboard />}
    </>
  );
}
