// Tipos das tabelas do banco (espelham supabase/migrations).
// Podem ser regenerados com: npx supabase gen types typescript --project-id <id>

export type UserRole = "admin" | "professor" | "responsavel";
export type AthleteStatus = "ativo" | "inativo" | "suspenso";
export type InvoiceStatus = "pendente" | "pago" | "cancelado";
export type InvoiceEffectiveStatus = InvoiceStatus | "atrasado";
export type PaymentMethod = "dinheiro" | "pix" | "cartao_credito" | "cartao_debito" | "transferencia" | "boleto" | "outro";
export type AttendanceStatus = "presente" | "falta" | "falta_justificada";
export type AnnouncementType = "aviso_geral" | "alteracao_horario" | "cancelamento" | "evento" | "campeonato" | "outro";
export type AnnouncementAudience = "todos" | "turma" | "individual";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Settings {
  id: true;
  school_name: string;
  logo_url: string | null;
  invoice_due_day: number;
}

export interface Guardian {
  id: string;
  profile_id: string | null;
  full_name: string;
  cpf: string | null;
  phone: string;
  phone_secondary: string | null;
  email: string | null;
  address: string | null;
  lgpd_consent_at: string | null;
  notes: string | null;
}

export interface Teacher {
  id: string;
  profile_id: string | null;
  full_name: string;
  phone: string | null;
  email: string | null;
  specialty: string | null;
  active: boolean;
}

export interface Category { id: string; name: string; min_age: number; max_age: number; active: boolean }

export interface Plan {
  id: string;
  name: string;
  sessions_per_week: number;
  monthly_price: number;
  active: boolean;
}

export interface Athlete {
  id: string;
  full_name: string;
  birth_date: string;
  category_id: string | null;
  plan_id: string | null;
  email: string | null;
  address: string | null;
  enrollment_date: string;
  status: AthleteStatus;
  notes: string | null;
  image_consent: boolean;
  archived_at: string | null;
}

export interface AthleteView extends Athlete {
  age: number;
  category_name: string | null;
  plan_name: string | null;
  plan_price: number | null;
}

export interface ClassRow {
  id: string;
  name: string;
  category_id: string | null;
  teacher_id: string | null;
  location: string;
  max_athletes: number;
  active: boolean;
}

export interface ClassSchedule { id: string; class_id: string; weekday: number; start_time: string; end_time: string }

export interface InvoiceView {
  id: string;
  athlete_id: string;
  athlete_name: string;
  plan_id: string | null;
  reference_month: string;
  amount: number;
  discount: number;
  due_date: string;
  status: InvoiceStatus;
  effective_status: InvoiceEffectiveStatus;
  paid_amount: number;
  paid_at: string | null;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  type: AnnouncementType;
  audience: AnnouncementAudience;
  class_id: string | null;
  athlete_id: string | null;
  event_date: string | null;
  published_at: string;
  expires_at: string | null;
}
