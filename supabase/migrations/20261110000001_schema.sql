-- =====================================================================
-- ARENA GUARACY — Esquema principal do banco de dados
-- Etapa 1: estrutura relacional
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Tipos enumerados
-- ---------------------------------------------------------------------
create type public.user_role         as enum ('admin', 'professor', 'responsavel');
create type public.athlete_status    as enum ('ativo', 'inativo', 'suspenso');
create type public.invoice_status    as enum ('pendente', 'pago', 'cancelado');
create type public.payment_method    as enum ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'transferencia', 'boleto', 'outro');
create type public.attendance_status as enum ('presente', 'falta', 'falta_justificada');
create type public.announcement_type as enum ('aviso_geral', 'alteracao_horario', 'cancelamento', 'evento', 'campeonato', 'outro');
create type public.announcement_audience as enum ('todos', 'turma', 'individual');

-- ---------------------------------------------------------------------
-- Função utilitária: updated_at automático
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- Configurações gerais (linha única)
-- ---------------------------------------------------------------------
create table public.settings (
  id            boolean primary key default true check (id),
  school_name   text not null default 'Arena Guaracy',
  logo_url      text,
  invoice_due_day smallint not null default 10 check (invoice_due_day between 1 and 28),
  updated_at    timestamptz not null default now()
);
insert into public.settings (id) values (true);

-- ---------------------------------------------------------------------
-- Perfis de usuário (1:1 com auth.users)
-- ---------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  email       text not null,
  phone       text,
  role        public.user_role not null default 'responsavel',
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index profiles_role_idx on public.profiles(role);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Responsáveis (podem existir sem conta de acesso)
-- ---------------------------------------------------------------------
create table public.guardians (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid unique references public.profiles(id) on delete set null,
  full_name       text not null check (length(trim(full_name)) >= 3),
  cpf             text unique,
  phone           text not null,
  phone_secondary text,
  email           text,
  address         text,
  lgpd_consent_at timestamptz,          -- data do aceite do termo LGPD
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index guardians_name_idx on public.guardians using btree (lower(full_name));
create trigger guardians_updated_at before update on public.guardians
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Professores
-- ---------------------------------------------------------------------
create table public.teachers (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid unique references public.profiles(id) on delete set null,
  full_name   text not null check (length(trim(full_name)) >= 3),
  phone       text,
  email       text,
  specialty   text,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger teachers_updated_at before update on public.teachers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Categorias por idade (ex.: Sub-9). Definidas pela escola.
-- ---------------------------------------------------------------------
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  min_age     smallint not null check (min_age >= 0),
  max_age     smallint not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  check (max_age >= min_age)
);

-- ---------------------------------------------------------------------
-- Planos
-- ---------------------------------------------------------------------
create table public.plans (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null unique,
  sessions_per_week  smallint not null check (sessions_per_week between 1 and 7),
  monthly_price      numeric(10,2) not null check (monthly_price >= 0),
  active             boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create trigger plans_updated_at before update on public.plans
  for each row execute function public.set_updated_at();

-- Planos oficiais da Arena Guaracy
insert into public.plans (name, sessions_per_week, monthly_price) values
  ('Plano 1', 1, 50.00),
  ('Plano 2', 2, 75.00),
  ('Plano 3', 3, 90.00);

-- ---------------------------------------------------------------------
-- Atletas
-- ---------------------------------------------------------------------
create table public.athletes (
  id               uuid primary key default gen_random_uuid(),
  full_name        text not null check (length(trim(full_name)) >= 3),
  birth_date       date not null check (birth_date > date '1900-01-01'),
  category_id      uuid references public.categories(id) on delete set null,
  plan_id          uuid references public.plans(id) on delete restrict,
  email            text,
  address          text,
  enrollment_date  date not null default current_date,
  status           public.athlete_status not null default 'ativo',
  notes            text,
  image_consent    boolean not null default false,  -- autorização de uso de imagem
  archived_at      timestamptz,                     -- arquivamento (exclusão lógica)
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index athletes_name_idx on public.athletes (lower(full_name));
create index athletes_status_idx on public.athletes (status) where archived_at is null;
create index athletes_category_idx on public.athletes (category_id);
create trigger athletes_updated_at before update on public.athletes
  for each row execute function public.set_updated_at();

-- Vínculo atleta x responsável (N:N — um responsável pode ter vários filhos)
create table public.athlete_guardians (
  athlete_id    uuid not null references public.athletes(id) on delete cascade,
  guardian_id   uuid not null references public.guardians(id) on delete cascade,
  relationship  text,                -- pai, mãe, avó, tutor...
  is_primary    boolean not null default false,
  created_at    timestamptz not null default now(),
  primary key (athlete_id, guardian_id)
);
create index athlete_guardians_guardian_idx on public.athlete_guardians(guardian_id);
-- no máximo um responsável principal por atleta
create unique index athlete_guardians_one_primary on public.athlete_guardians(athlete_id) where is_primary;

-- ---------------------------------------------------------------------
-- Turmas e horários
-- ---------------------------------------------------------------------
create table public.classes (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  category_id   uuid references public.categories(id) on delete set null,
  teacher_id    uuid references public.teachers(id) on delete set null,
  location      text not null,
  max_athletes  smallint not null default 20 check (max_athletes > 0),
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index classes_teacher_idx on public.classes(teacher_id);
create trigger classes_updated_at before update on public.classes
  for each row execute function public.set_updated_at();

create table public.class_schedules (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.classes(id) on delete cascade,
  weekday     smallint not null check (weekday between 0 and 6), -- 0 = domingo
  start_time  time not null,
  end_time    time not null,
  check (end_time > start_time)
);
create index class_schedules_class_idx on public.class_schedules(class_id);

-- Matrículas em turmas
create table public.class_enrollments (
  id          uuid primary key default gen_random_uuid(),
  athlete_id  uuid not null references public.athletes(id) on delete cascade,
  class_id    uuid not null references public.classes(id) on delete cascade,
  start_date  date not null default current_date,
  end_date    date,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);
create unique index class_enrollments_active_uniq on public.class_enrollments(athlete_id, class_id) where active;
create index class_enrollments_class_idx on public.class_enrollments(class_id) where active;

-- ---------------------------------------------------------------------
-- Financeiro
-- ---------------------------------------------------------------------
create table public.invoices (
  id               uuid primary key default gen_random_uuid(),
  athlete_id       uuid not null references public.athletes(id) on delete restrict,
  plan_id          uuid references public.plans(id) on delete set null,
  reference_month  date not null check (extract(day from reference_month) = 1), -- 1º dia do mês
  amount           numeric(10,2) not null check (amount >= 0),
  discount         numeric(10,2) not null default 0 check (discount >= 0),
  due_date         date not null,
  status           public.invoice_status not null default 'pendente',
  paid_at          timestamptz,
  notes            text,
  created_by       uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (athlete_id, reference_month),
  check (discount <= amount)
);
create index invoices_status_due_idx on public.invoices(status, due_date);
create index invoices_month_idx on public.invoices(reference_month);
create trigger invoices_updated_at before update on public.invoices
  for each row execute function public.set_updated_at();

create table public.payments (
  id               uuid primary key default gen_random_uuid(),
  invoice_id       uuid not null references public.invoices(id) on delete restrict,
  amount           numeric(10,2) not null check (amount > 0),
  method           public.payment_method not null,
  paid_at          timestamptz not null default now(),
  -- Estrutura para futura integração com Pix / cartão:
  provider         text,          -- ex.: 'mercadopago', 'asaas', 'stripe'
  provider_txid    text,          -- id da transação no provedor
  provider_payload jsonb,
  notes            text,
  registered_by    uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now()
);
create index payments_invoice_idx on public.payments(invoice_id);
create unique index payments_provider_txid_uniq on public.payments(provider, provider_txid) where provider_txid is not null;

-- ---------------------------------------------------------------------
-- Presença
-- ---------------------------------------------------------------------
create table public.attendances (
  id             uuid primary key default gen_random_uuid(),
  class_id       uuid not null references public.classes(id) on delete cascade,
  athlete_id     uuid not null references public.athletes(id) on delete cascade,
  session_date   date not null,
  status         public.attendance_status not null,
  justification  text,
  recorded_by    uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (class_id, athlete_id, session_date)
);
create index attendances_athlete_idx on public.attendances(athlete_id, session_date);
create trigger attendances_updated_at before update on public.attendances
  for each row execute function public.set_updated_at();

-- Observações dos professores sobre os atletas
create table public.athlete_notes (
  id                  uuid primary key default gen_random_uuid(),
  athlete_id          uuid not null references public.athletes(id) on delete cascade,
  author_id           uuid references public.profiles(id) on delete set null,
  content             text not null check (length(trim(content)) > 0),
  visible_to_guardian boolean not null default false,
  created_at          timestamptz not null default now()
);
create index athlete_notes_athlete_idx on public.athlete_notes(athlete_id);

-- ---------------------------------------------------------------------
-- Comunicados
-- ---------------------------------------------------------------------
create table public.announcements (
  id            uuid primary key default gen_random_uuid(),
  title         text not null check (length(trim(title)) > 0),
  body          text not null,
  type          public.announcement_type not null default 'aviso_geral',
  audience      public.announcement_audience not null default 'todos',
  class_id      uuid references public.classes(id) on delete cascade,
  athlete_id    uuid references public.athletes(id) on delete cascade,
  event_date    timestamptz,
  published_at  timestamptz not null default now(),
  expires_at    timestamptz,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  check (
    (audience = 'todos'      and class_id is null and athlete_id is null) or
    (audience = 'turma'      and class_id is not null and athlete_id is null) or
    (audience = 'individual' and athlete_id is not null and class_id is null)
  )
);
create index announcements_published_idx on public.announcements(published_at desc);

create table public.announcement_reads (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  read_at         timestamptz not null default now(),
  primary key (announcement_id, profile_id)
);

-- Fila para futuras notificações (e-mail / WhatsApp). Processada por
-- Edge Function quando houver integração configurada.
create table public.notification_outbox (
  id            uuid primary key default gen_random_uuid(),
  channel       text not null check (channel in ('email', 'whatsapp', 'push')),
  recipient     text not null,
  subject       text,
  body          text not null,
  announcement_id uuid references public.announcements(id) on delete set null,
  status        text not null default 'pendente' check (status in ('pendente', 'enviado', 'erro', 'cancelado')),
  attempts      smallint not null default 0,
  last_error    text,
  created_at    timestamptz not null default now(),
  sent_at       timestamptz
);

-- ---------------------------------------------------------------------
-- Auditoria (LGPD: rastreabilidade de acesso/alteração de dados)
-- ---------------------------------------------------------------------
create table public.audit_log (
  id          bigserial primary key,
  table_name  text not null,
  record_id   text,
  action      text not null,
  actor_id    uuid,
  old_data    jsonb,
  new_data    jsonb,
  created_at  timestamptz not null default now()
);
create index audit_log_table_idx on public.audit_log(table_name, created_at desc);
