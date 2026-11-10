-- Testes automatizados das regras de acesso (RLS) e regras de negócio.
-- Executar SOMENTE em banco local de teste (cria dados de teste).
\set ON_ERROR_STOP 1
begin;

-- ===== Preparação (como superusuário) =====
insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
 ('00000000-0000-0000-0000-00000000000a', 'admin@teste.local', '{"role":"admin"}', '{"full_name":"Admin Teste"}'),
 ('00000000-0000-0000-0000-00000000000b', 'prof1@teste.local', '{"role":"professor"}', '{"full_name":"Prof Um"}'),
 ('00000000-0000-0000-0000-00000000000c', 'prof2@teste.local', '{"role":"professor"}', '{"full_name":"Prof Dois"}'),
 ('00000000-0000-0000-0000-00000000000d', 'resp1@teste.local', '{}', '{"full_name":"Resp Um"}'),
 ('00000000-0000-0000-0000-00000000000e', 'resp2@teste.local', '{"role":"responsavel"}', '{"role":"admin","full_name":"Resp Dois"}');

do $$ begin
  assert (select role from profiles where email='admin@teste.local') = 'admin', 'perfil admin';
  assert (select role from profiles where email='resp1@teste.local') = 'responsavel', 'papel padrão';
  -- user_metadata NÃO pode conceder papel de admin
  assert (select role from profiles where email='resp2@teste.local') = 'responsavel', 'escalada via user_metadata';
end $$;

insert into teachers (id, profile_id, full_name) values
 ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 'Prof Um'),
 ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000c', 'Prof Dois');
insert into guardians (id, profile_id, full_name, phone) values
 ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000d', 'Resp Um',   '11999990001'),
 ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000e', 'Resp Dois', '11999990002');
insert into athletes (id, full_name, birth_date, plan_id, enrollment_date) values
 ('30000000-0000-0000-0000-000000000001', 'Atleta A1', '2015-03-01', (select id from plans where name='Plano 1'), '2026-01-01'),
 ('30000000-0000-0000-0000-000000000002', 'Atleta A2', '2017-06-01', (select id from plans where name='Plano 2'), '2026-01-01'),
 ('30000000-0000-0000-0000-000000000003', 'Atleta B1', '2016-01-01', (select id from plans where name='Plano 3'), '2026-01-01');
-- Resp Um tem dois filhos (A1, A2); Resp Dois tem um (B1)
insert into athlete_guardians (athlete_id, guardian_id, is_primary) values
 ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', true),
 ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', true),
 ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', true);
insert into classes (id, name, teacher_id, location, max_athletes) values
 ('40000000-0000-0000-0000-000000000001', 'Turma X', '10000000-0000-0000-0000-000000000001', 'Campo 1', 2),
 ('40000000-0000-0000-0000-000000000002', 'Turma Y', '10000000-0000-0000-0000-000000000002', 'Campo 2', 10);
insert into class_schedules (class_id, weekday, start_time, end_time) values
 ('40000000-0000-0000-0000-000000000001', 1, '08:00', '09:00'),
 ('40000000-0000-0000-0000-000000000002', 1, '08:00', '09:00');  -- local diferente, professor diferente: ok
insert into class_enrollments (athlete_id, class_id, start_date) values
 ('30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '2026-01-01'),
 ('30000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', '2026-01-01'),
 ('30000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000002', '2026-01-01');

-- Conflito de horário: mesmo professor no mesmo horário
do $$ begin
  insert into classes (id, name, teacher_id, location) values
    ('40000000-0000-0000-0000-000000000003', 'Turma Z', '10000000-0000-0000-0000-000000000001', 'Campo 3');
  begin
    insert into class_schedules (class_id, weekday, start_time, end_time)
      values ('40000000-0000-0000-0000-000000000003', 1, '08:30', '09:30');
    raise exception 'FALHOU: conflito de professor não detectado';
  exception when exclusion_violation then null; end;
  -- Conflito de local
  insert into class_schedules (class_id, weekday, start_time, end_time)
    values ('40000000-0000-0000-0000-000000000003', 2, '08:00', '09:00');
  update classes set location = 'campo 2 ', teacher_id = null where id = '40000000-0000-0000-0000-000000000003';
  begin
    insert into class_schedules (class_id, weekday, start_time, end_time)
      values ('40000000-0000-0000-0000-000000000003', 1, '08:59', '10:00');
    raise exception 'FALHOU: conflito de local não detectado';
  exception when exclusion_violation then null; end;
  -- Limite da turma (máx. 2)
  begin
    insert into class_enrollments (athlete_id, class_id) values
      ('30000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000001');
    raise exception 'FALHOU: limite de turma não aplicado';
  exception when check_violation then null; end;
end $$;

-- ===== ADMIN =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', true);
do $$
declare n int; inv uuid;
begin
  assert public.is_admin(), 'admin reconhecido';
  assert (select count(*) from athletes) = 3, 'admin vê todos';
  n := public.generate_monthly_invoices('2026-10-15');
  assert n = 3, 'gerou 3 mensalidades, gerou ' || n;
  n := public.generate_monthly_invoices('2026-10-01');
  assert n = 0, 'não duplica mensalidades';
  assert (select due_date from invoices limit 1) = date '2026-10-10', 'vencimento dia 10';
  assert (select amount from invoices where athlete_id='30000000-0000-0000-0000-000000000002') = 75.00, 'valor do plano 2';
  select id into inv from invoices where athlete_id='30000000-0000-0000-0000-000000000001';
  insert into payments (invoice_id, amount, method) values (inv, 20, 'pix');
  assert (select status from invoices where id=inv) = 'pendente', 'pagamento parcial';
  insert into payments (invoice_id, amount, method) values (inv, 30, 'dinheiro');
  assert (select status from invoices where id=inv) = 'pago', 'quitada';
  assert (select effective_status from v_invoices where athlete_id='30000000-0000-0000-0000-000000000002') = 'atrasado', 'atrasada (venc. 10/10/2026)';
  assert (select registered_by from payments limit 1) = auth.uid(), 'registrado por';
  -- admin não remove o próprio acesso
  begin
    update profiles set role='professor' where id=auth.uid();
    raise exception 'FALHOU: admin removeu o próprio acesso';
  exception when insufficient_privilege then null; end;
end $$;

-- ===== PROFESSOR 1 (Turma X: A1, A2) =====
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b"}', true);
do $$ begin
  assert not public.is_admin(), 'prof não é admin';
  assert (select count(*) from athletes) = 2, 'prof vê só atletas da sua turma';
  assert (select count(*) from classes) = 1, 'prof vê só sua turma';
  assert (select count(*) from invoices) = 0, 'prof não vê financeiro';
  assert (select count(*) from payments) = 0, 'prof não vê pagamentos';
  assert (select count(*) from guardians) = 1, 'prof vê responsável dos seus atletas';
  insert into attendances (class_id, athlete_id, session_date, status) values
    ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '2026-11-09', 'presente'),
    ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', '2026-11-09', 'falta_justificada');
  insert into athlete_notes (athlete_id, author_id, content, visible_to_guardian)
    values ('30000000-0000-0000-0000-000000000001', auth.uid(), 'Ótima evolução', true);
  -- não pode registrar presença em turma de outro professor
  begin
    insert into attendances (class_id, athlete_id, session_date, status) values
      ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000003', '2026-11-09', 'presente');
    raise exception 'FALHOU: prof registrou presença em outra turma';
  exception when insufficient_privilege or check_violation then null; end;
  -- não pode alterar atleta
  update athletes set full_name = 'Hack' where id='30000000-0000-0000-0000-000000000001';
  -- não pode se promover
  begin
    update profiles set role='admin' where id=auth.uid();
    raise exception 'FALHOU: prof se promoveu';
  exception when insufficient_privilege then null; end;
  begin
    perform public.generate_monthly_invoices('2026-11-01');
    raise exception 'FALHOU: prof gerou mensalidade';
  exception when insufficient_privilege then null; end;
end $$;

-- ===== RESPONSÁVEL 1 (filhos A1 e A2) =====
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000d"}', true);
do $$ begin
  assert (select count(*) from athletes) = 2, 'resp vê os dois filhos';
  assert (select count(*) from athletes where full_name='Hack') = 0, 'prof não alterou atleta';
  assert (select count(*) from invoices) = 2, 'resp vê mensalidades dos filhos';
  assert (select count(*) from payments) = 2, 'resp vê pagamentos dos filhos';
  assert (select count(*) from attendances) = 2, 'resp vê frequência dos filhos';
  assert (select count(*) from athlete_notes) = 1, 'resp vê observação visível';
  assert (select count(*) from classes) = 1, 'resp vê turma dos filhos';
  assert (select count(*) from class_schedules) = 1, 'resp vê horários';
  assert (select count(*) from teachers) = 1, 'resp vê professor dos filhos';
  assert (select count(*) from guardians) = 1, 'resp vê só o próprio cadastro';
  assert (select count(*) from profiles) = 1, 'resp vê só o próprio perfil';
  perform public.update_my_contact('11988887777', '', 'novo@teste.local', 'Rua Nova, 1');
  assert (select phone from guardians) = '11988887777', 'resp atualizou contato';
  update guardians set full_name='Outro Nome';  -- sem política: não altera
  assert (select full_name from guardians) = 'Resp Um', 'resp não altera nome direto';
  insert into payments (invoice_id, amount, method)
    select id, 1, 'pix' from invoices limit 1;
  raise exception 'FALHOU: resp registrou pagamento';
exception when insufficient_privilege then null;
end $$;

-- ===== RESPONSÁVEL 2 (filho B1) =====
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000e"}', true);
do $$ begin
  assert (select count(*) from athletes) = 1, 'resp2 vê só o próprio filho';
  assert (select count(*) from attendances) = 0, 'resp2 não vê frequência de outros';
  assert (select count(*) from athlete_notes) = 0, 'resp2 não vê notas de outros';
  assert (select count(*) from audit_log) = 0, 'resp2 não vê auditoria';
end $$;

-- ===== ANÔNIMO =====
reset role;
set local role anon;
do $$ begin
  begin
    perform 1 from athletes;
    raise exception 'FALHOU: anônimo leu atletas';
  exception when insufficient_privilege then null; end;
end $$;

reset role;
select 'TODOS OS TESTES PASSARAM' as resultado;
rollback;
