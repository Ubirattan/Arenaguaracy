-- =====================================================================
-- ARENA GUARACY — Funções auxiliares, regras de negócio e gatilhos
-- =====================================================================

-- Data de hoje no fuso de Brasília
create or replace function public.today_br()
returns date language sql stable as $$
  select (now() at time zone 'America/Sao_Paulo')::date
$$;

-- Idade em anos completos
create or replace function public.age_years(p_birth date, p_ref date default null)
returns int language sql immutable as $$
  select extract(year from age(coalesce(p_ref, (now() at time zone 'America/Sao_Paulo')::date), p_birth))::int
$$;

-- ---------------------------------------------------------------------
-- Funções de identidade/permissão (SECURITY DEFINER para evitar recursão
-- de RLS). Sempre usam auth.uid() — nunca dados enviados pelo cliente.
-- ---------------------------------------------------------------------
create or replace function public.current_user_role()
returns public.user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and active
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid() and active), false)
$$;

create or replace function public.my_teacher_id()
returns uuid language sql stable security definer set search_path = public as $$
  select t.id from public.teachers t
  join public.profiles p on p.id = t.profile_id
  where t.profile_id = auth.uid() and p.active and p.role = 'professor' and t.active
$$;

create or replace function public.my_guardian_id()
returns uuid language sql stable security definer set search_path = public as $$
  select g.id from public.guardians g
  join public.profiles p on p.id = g.profile_id
  where g.profile_id = auth.uid() and p.active and p.role = 'responsavel'
$$;

-- O atleta é filho/dependente do responsável logado?
create or replace function public.is_my_child(p_athlete uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.athlete_guardians ag
    where ag.athlete_id = p_athlete and ag.guardian_id = public.my_guardian_id()
  )
$$;

-- A turma é do professor logado?
create or replace function public.teaches_class(p_class uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.classes c
    where c.id = p_class and c.teacher_id = public.my_teacher_id()
  )
$$;

-- O atleta está (ou esteve) matriculado em alguma turma do professor logado?
create or replace function public.teaches_athlete(p_athlete uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.class_enrollments e
    join public.classes c on c.id = e.class_id
    where e.athlete_id = p_athlete and e.active and c.teacher_id = public.my_teacher_id()
  )
$$;

-- Algum filho do responsável logado está na turma?
create or replace function public.child_in_class(p_class uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.class_enrollments e
    join public.athlete_guardians ag on ag.athlete_id = e.athlete_id
    where e.class_id = p_class and e.active and ag.guardian_id = public.my_guardian_id()
  )
$$;

-- O responsável logado é vínculado a algum atleta da turma do professor dado?
create or replace function public.teacher_of_my_child(p_teacher uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.classes c
    join public.class_enrollments e on e.class_id = c.id and e.active
    join public.athlete_guardians ag on ag.athlete_id = e.athlete_id
    where c.teacher_id = p_teacher and ag.guardian_id = public.my_guardian_id()
  )
$$;

-- O responsável dado é de algum atleta do professor logado?
create or replace function public.guardian_of_my_athlete(p_guardian uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.athlete_guardians ag
    where ag.guardian_id = p_guardian and public.teaches_athlete(ag.athlete_id)
  )
$$;

-- ---------------------------------------------------------------------
-- Criação automática de perfil quando um usuário é criado no Auth.
-- O papel vem de app_metadata (só pode ser definido pelo servidor),
-- nunca de user_metadata (editável pelo próprio usuário).
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role public.user_role;
begin
  begin
    v_role := coalesce((new.raw_app_meta_data ->> 'role')::public.user_role, 'responsavel');
  exception when others then
    v_role := 'responsavel';
  end;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    v_role
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Impede que um usuário altere o próprio papel, status ou e-mail.
create or replace function public.protect_profile_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() nulo = operação do servidor (service_role / migrações)
  if auth.uid() is not null and not public.is_admin() then
    if new.role is distinct from old.role
       or new.active is distinct from old.active
       or new.email is distinct from old.email
       or new.id is distinct from old.id then
      raise exception 'Sem permissão para alterar papel, status ou e-mail do perfil.'
        using errcode = '42501';
    end if;
  end if;
  -- Um administrador não pode remover o próprio acesso de administrador
  if auth.uid() = old.id and old.role = 'admin'
     and (new.role <> 'admin' or not new.active) then
    raise exception 'Você não pode remover o seu próprio acesso de administrador.'
      using errcode = '42501';
  end if;
  return new;
end $$;

create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- ---------------------------------------------------------------------
-- Conflitos de horários: mesmo professor ou mesmo local, mesmo dia,
-- horários sobrepostos, em turmas ativas.
-- ---------------------------------------------------------------------
create or replace function public.find_schedule_conflict(
  p_class uuid, p_weekday smallint, p_start time, p_end time, p_ignore_schedule uuid default null
) returns text language sql stable security definer set search_path = public as $$
  select format('Conflito com a turma "%s" (%s, %s–%s).',
           c2.name,
           case when c2.teacher_id = c1.teacher_id then 'mesmo professor' else 'mesmo local' end,
           to_char(s2.start_time, 'HH24:MI'), to_char(s2.end_time, 'HH24:MI'))
  from public.classes c1
  join public.class_schedules s2 on s2.weekday = p_weekday
       and s2.start_time < p_end and s2.end_time > p_start
       and s2.id is distinct from p_ignore_schedule
  join public.classes c2 on c2.id = s2.class_id and c2.id <> c1.id and c2.active
  where c1.id = p_class and c1.active
    and (
      (c1.teacher_id is not null and c2.teacher_id = c1.teacher_id)
      or lower(trim(c1.location)) = lower(trim(c2.location))
    )
  limit 1
$$;

create or replace function public.check_schedule_conflict()
returns trigger language plpgsql as $$
declare v_msg text;
begin
  v_msg := public.find_schedule_conflict(new.class_id, new.weekday, new.start_time, new.end_time, new.id);
  if v_msg is not null then
    raise exception '%', v_msg using errcode = '23P01';
  end if;
  -- não permitir horários sobrepostos dentro da mesma turma
  if exists (select 1 from public.class_schedules s
             where s.class_id = new.class_id and s.id <> new.id and s.weekday = new.weekday
               and s.start_time < new.end_time and s.end_time > new.start_time) then
    raise exception 'A turma já possui um horário sobreposto neste dia.' using errcode = '23P01';
  end if;
  return new;
end $$;

create trigger class_schedules_conflict before insert or update on public.class_schedules
  for each row execute function public.check_schedule_conflict();

-- Ao trocar professor/local ou reativar uma turma, revalida os horários dela
create or replace function public.check_class_conflicts()
returns trigger language plpgsql as $$
declare r record; v_msg text;
begin
  if new.active and (new.teacher_id is distinct from old.teacher_id
      or new.location is distinct from old.location or (new.active and not old.active)) then
    for r in select * from public.class_schedules where class_id = new.id loop
      v_msg := public.find_schedule_conflict(new.id, r.weekday, r.start_time, r.end_time, r.id);
      if v_msg is not null then
        raise exception '%', v_msg using errcode = '23P01';
      end if;
    end loop;
  end if;
  return new;
end $$;

create trigger classes_conflict after update on public.classes
  for each row execute function public.check_class_conflicts();

-- ---------------------------------------------------------------------
-- Limite de atletas por turma
-- ---------------------------------------------------------------------
create or replace function public.check_class_capacity()
returns trigger language plpgsql as $$
declare v_max int; v_count int;
begin
  if new.active then
    select max_athletes into v_max from public.classes where id = new.class_id for update;
    select count(*) into v_count from public.class_enrollments
      where class_id = new.class_id and active and id <> new.id;
    if v_count >= v_max then
      raise exception 'A turma atingiu o limite de % atletas.', v_max using errcode = '23514';
    end if;
  end if;
  return new;
end $$;

create trigger class_enrollments_capacity before insert or update on public.class_enrollments
  for each row execute function public.check_class_capacity();

-- ---------------------------------------------------------------------
-- Presença: atleta precisa estar matriculado na turma
-- ---------------------------------------------------------------------
create or replace function public.check_attendance()
returns trigger language plpgsql as $$
begin
  if not exists (select 1 from public.class_enrollments e
                 where e.class_id = new.class_id and e.athlete_id = new.athlete_id
                   and e.start_date <= new.session_date
                   and (e.end_date is null or e.end_date >= new.session_date)) then
    raise exception 'O atleta não estava matriculado nesta turma na data informada.' using errcode = '23514';
  end if;
  if new.session_date > public.today_br() then
    raise exception 'Não é possível registrar presença em data futura.' using errcode = '23514';
  end if;
  if new.recorded_by is null then new.recorded_by := auth.uid(); end if;
  return new;
end $$;

create trigger attendances_check before insert or update on public.attendances
  for each row execute function public.check_attendance();

-- ---------------------------------------------------------------------
-- Financeiro: status da mensalidade acompanha os pagamentos
-- ---------------------------------------------------------------------
create or replace function public.sync_invoice_status()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_invoice uuid := coalesce(new.invoice_id, old.invoice_id);
  v_paid numeric(10,2);
  v_last timestamptz;
  v_due numeric(10,2);
begin
  select coalesce(sum(amount), 0), max(paid_at) into v_paid, v_last
    from public.payments where invoice_id = v_invoice;
  select amount - discount into v_due from public.invoices where id = v_invoice;

  update public.invoices
     set status  = case when status = 'cancelado' then status
                        when v_paid >= v_due then 'pago'::public.invoice_status
                        else 'pendente'::public.invoice_status end,
         paid_at = case when v_paid >= v_due then v_last else null end
   where id = v_invoice;
  return null;
end $$;

create trigger payments_sync after insert or update or delete on public.payments
  for each row execute function public.sync_invoice_status();

create or replace function public.check_payment()
returns trigger language plpgsql as $$
begin
  if exists (select 1 from public.invoices where id = new.invoice_id and status = 'cancelado') then
    raise exception 'Não é possível registrar pagamento em mensalidade cancelada.' using errcode = '23514';
  end if;
  if new.registered_by is null then new.registered_by := auth.uid(); end if;
  return new;
end $$;

create trigger payments_check before insert on public.payments
  for each row execute function public.check_payment();

-- Gera as mensalidades de um mês para todos os atletas ativos com plano.
-- Somente administrador. Não duplica (único por atleta + mês).
create or replace function public.generate_monthly_invoices(p_month date)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_ref date := date_trunc('month', p_month)::date;
  v_day smallint;
  v_count int;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem gerar mensalidades.' using errcode = '42501';
  end if;
  select invoice_due_day into v_day from public.settings;

  insert into public.invoices (athlete_id, plan_id, reference_month, amount, due_date, created_by)
  select a.id, a.plan_id, v_ref, p.monthly_price,
         make_date(extract(year from v_ref)::int, extract(month from v_ref)::int, v_day),
         auth.uid()
    from public.athletes a
    join public.plans p on p.id = a.plan_id
   where a.status = 'ativo' and a.archived_at is null
     and a.enrollment_date <= (v_ref + interval '1 month - 1 day')::date
  on conflict (athlete_id, reference_month) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- ---------------------------------------------------------------------
-- Responsável atualiza apenas os próprios dados de contato permitidos
-- ---------------------------------------------------------------------
create or replace function public.update_my_contact(
  p_phone text, p_phone_secondary text, p_email text, p_address text
) returns void language plpgsql security definer set search_path = public as $$
declare v_gid uuid := public.my_guardian_id();
begin
  if v_gid is null then
    raise exception 'Cadastro de responsável não vinculado a esta conta.' using errcode = '42501';
  end if;
  if p_phone is null or length(regexp_replace(p_phone, '\D', '', 'g')) < 10 then
    raise exception 'Telefone inválido.' using errcode = '22023';
  end if;
  if p_email is not null and p_email <> '' and p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'E-mail inválido.' using errcode = '22023';
  end if;
  update public.guardians
     set phone = p_phone,
         phone_secondary = nullif(p_phone_secondary, ''),
         email = nullif(p_email, ''),
         address = nullif(p_address, '')
   where id = v_gid;
end $$;

-- ---------------------------------------------------------------------
-- Auditoria
-- ---------------------------------------------------------------------
create or replace function public.audit_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_log (table_name, record_id, action, actor_id, old_data, new_data)
  values (
    tg_table_name,
    coalesce((to_jsonb(new) ->> 'id'), (to_jsonb(old) ->> 'id')),
    tg_op,
    auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return null;
end $$;

create trigger audit_profiles   after insert or update or delete on public.profiles   for each row execute function public.audit_trigger();
create trigger audit_athletes   after insert or update or delete on public.athletes   for each row execute function public.audit_trigger();
create trigger audit_guardians  after insert or update or delete on public.guardians  for each row execute function public.audit_trigger();
create trigger audit_invoices   after insert or update or delete on public.invoices   for each row execute function public.audit_trigger();
create trigger audit_payments   after insert or update or delete on public.payments   for each row execute function public.audit_trigger();
create trigger audit_plans      after insert or update or delete on public.plans      for each row execute function public.audit_trigger();

-- ---------------------------------------------------------------------
-- Visões (respeitam o RLS de quem consulta: security_invoker)
-- ---------------------------------------------------------------------
create or replace view public.v_athletes with (security_invoker = true) as
select a.*,
       public.age_years(a.birth_date) as age,
       c.name as category_name,
       p.name as plan_name,
       p.monthly_price as plan_price
  from public.athletes a
  left join public.categories c on c.id = a.category_id
  left join public.plans p on p.id = a.plan_id;

create or replace view public.v_invoices with (security_invoker = true) as
select i.*,
       a.full_name as athlete_name,
       coalesce((select sum(pm.amount) from public.payments pm where pm.invoice_id = i.id), 0)::numeric(10,2) as paid_amount,
       case
         when i.status = 'pendente' and i.due_date < public.today_br() then 'atrasado'
         else i.status::text
       end as effective_status
  from public.invoices i
  join public.athletes a on a.id = i.athlete_id;

create or replace view public.v_attendance_summary with (security_invoker = true) as
select at.athlete_id,
       at.class_id,
       count(*)                                          as total_sessions,
       count(*) filter (where at.status = 'presente')    as presences,
       count(*) filter (where at.status <> 'presente')   as absences,
       round(100.0 * count(*) filter (where at.status = 'presente') / nullif(count(*), 0), 1) as attendance_rate
  from public.attendances at
 group by at.athlete_id, at.class_id;
