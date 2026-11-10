-- =====================================================================
-- ARENA GUARACY — Segurança em nível de linha (RLS)
-- Regra geral: nada é visível sem política explícita.
--   admin       → acesso total
--   professor   → apenas suas turmas e os atletas delas
--   responsavel → apenas seus filhos/dependentes
-- Usuários anônimos não acessam nenhuma tabela.
-- =====================================================================

-- Anônimos: sem acesso a dados (proteção de menores / LGPD)
revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke execute on all functions in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke execute on functions from anon;

-- Habilita RLS em todas as tabelas
alter table public.settings            enable row level security;
alter table public.profiles            enable row level security;
alter table public.guardians           enable row level security;
alter table public.teachers            enable row level security;
alter table public.categories          enable row level security;
alter table public.plans               enable row level security;
alter table public.athletes            enable row level security;
alter table public.athlete_guardians   enable row level security;
alter table public.classes             enable row level security;
alter table public.class_schedules     enable row level security;
alter table public.class_enrollments   enable row level security;
alter table public.invoices            enable row level security;
alter table public.payments            enable row level security;
alter table public.attendances         enable row level security;
alter table public.athlete_notes       enable row level security;
alter table public.announcements       enable row level security;
alter table public.announcement_reads  enable row level security;
alter table public.notification_outbox enable row level security;
alter table public.audit_log           enable row level security;

-- ---------------- Configurações, categorias e planos ----------------
create policy settings_read  on public.settings   for select to authenticated using (true);
create policy settings_admin on public.settings   for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy categories_read  on public.categories for select to authenticated using (true);
create policy categories_admin on public.categories for all    to authenticated using (public.is_admin()) with check (public.is_admin());

create policy plans_read  on public.plans for select to authenticated using (true);
create policy plans_admin on public.plans for all    to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------- Perfis ----------------
create policy profiles_self_read   on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy profiles_self_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());
create policy profiles_admin_delete on public.profiles for delete to authenticated using (public.is_admin() and id <> auth.uid());
-- inserção de perfis apenas via gatilho do Auth (service role)

-- ---------------- Responsáveis ----------------
create policy guardians_admin on public.guardians for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy guardians_self_read on public.guardians for select to authenticated
  using (profile_id = auth.uid());
create policy guardians_teacher_read on public.guardians for select to authenticated
  using (public.guardian_of_my_athlete(id));
-- responsável altera contato somente via função update_my_contact()

-- ---------------- Professores ----------------
create policy teachers_admin on public.teachers for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy teachers_self_read on public.teachers for select to authenticated
  using (profile_id = auth.uid());
create policy teachers_guardian_read on public.teachers for select to authenticated
  using (public.teacher_of_my_child(id));

-- ---------------- Atletas ----------------
create policy athletes_admin on public.athletes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy athletes_teacher_read on public.athletes for select to authenticated
  using (archived_at is null and public.teaches_athlete(id));
create policy athletes_guardian_read on public.athletes for select to authenticated
  using (public.is_my_child(id));

create policy athlete_guardians_admin on public.athlete_guardians for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy athlete_guardians_read on public.athlete_guardians for select to authenticated
  using (guardian_id = public.my_guardian_id() or public.teaches_athlete(athlete_id));

-- ---------------- Turmas, horários e matrículas ----------------
create policy classes_admin on public.classes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy classes_teacher_read on public.classes for select to authenticated
  using (teacher_id = public.my_teacher_id());
create policy classes_guardian_read on public.classes for select to authenticated
  using (public.child_in_class(id));

create policy schedules_admin on public.class_schedules for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy schedules_read on public.class_schedules for select to authenticated
  using (public.teaches_class(class_id) or public.child_in_class(class_id));

create policy enrollments_admin on public.class_enrollments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy enrollments_teacher_read on public.class_enrollments for select to authenticated
  using (public.teaches_class(class_id));
create policy enrollments_guardian_read on public.class_enrollments for select to authenticated
  using (public.is_my_child(athlete_id));

-- ---------------- Financeiro (professores NÃO têm acesso) ----------------
create policy invoices_admin on public.invoices for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy invoices_guardian_read on public.invoices for select to authenticated
  using (public.is_my_child(athlete_id));

create policy payments_admin on public.payments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy payments_guardian_read on public.payments for select to authenticated
  using (exists (select 1 from public.invoices i where i.id = invoice_id and public.is_my_child(i.athlete_id)));

-- ---------------- Presença ----------------
create policy attendances_admin on public.attendances for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy attendances_teacher_read on public.attendances for select to authenticated
  using (public.teaches_class(class_id));
create policy attendances_teacher_insert on public.attendances for insert to authenticated
  with check (public.teaches_class(class_id));
create policy attendances_teacher_update on public.attendances for update to authenticated
  using (public.teaches_class(class_id)) with check (public.teaches_class(class_id));
create policy attendances_guardian_read on public.attendances for select to authenticated
  using (public.is_my_child(athlete_id));

-- ---------------- Observações ----------------
create policy notes_admin on public.athlete_notes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy notes_teacher_read on public.athlete_notes for select to authenticated
  using (public.teaches_athlete(athlete_id));
create policy notes_teacher_insert on public.athlete_notes for insert to authenticated
  with check (public.teaches_athlete(athlete_id) and author_id = auth.uid());
create policy notes_teacher_update on public.athlete_notes for update to authenticated
  using (author_id = auth.uid() and public.teaches_athlete(athlete_id))
  with check (author_id = auth.uid() and public.teaches_athlete(athlete_id));
create policy notes_teacher_delete on public.athlete_notes for delete to authenticated
  using (author_id = auth.uid());
create policy notes_guardian_read on public.athlete_notes for select to authenticated
  using (visible_to_guardian and public.is_my_child(athlete_id));

-- ---------------- Comunicados ----------------
create policy announcements_admin on public.announcements for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy announcements_read on public.announcements for select to authenticated
  using (
    published_at <= now() and (expires_at is null or expires_at > now()) and (
      audience = 'todos'
      or (audience = 'turma' and (public.teaches_class(class_id) or public.child_in_class(class_id)))
      or (audience = 'individual' and (public.is_my_child(athlete_id) or public.teaches_athlete(athlete_id)))
    )
  );

create policy reads_own on public.announcement_reads for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy reads_admin on public.announcement_reads for select to authenticated
  using (public.is_admin());

-- ---------------- Fila de notificações e auditoria (somente admin lê) ----------------
create policy outbox_admin on public.notification_outbox for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy audit_admin_read on public.audit_log for select to authenticated
  using (public.is_admin());
-- audit_log: sem políticas de escrita → ninguém altera pelo app

-- Funções de negócio expostas ao app
grant execute on function public.generate_monthly_invoices(date) to authenticated;
grant execute on function public.update_my_contact(text, text, text, text) to authenticated;
grant execute on function public.current_user_role() to authenticated;
