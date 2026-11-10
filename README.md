# Arena Guaracy — Sistema de Gestão

Aplicativo web responsivo e instalável (PWA) para a escola de futebol **Arena Guaracy**.
Funciona no computador, Android e iPhone pelo navegador, e pode ser instalado na tela inicial.

**Tecnologias:** React 18 + TypeScript · Tailwind CSS · Supabase (PostgreSQL, Auth, RLS, Edge Functions) · Vite PWA.

---

## Estrutura do projeto

```
arena-guaracy/
├── public/                     ícones do app (logo provisória — ver "Logomarca")
├── src/
│   ├── components/
│   │   ├── layout/             menu lateral, barra inferior do celular, proteção de rotas
│   │   └── ui/                 botões, campos, avisos, modais, carregamento
│   ├── contexts/AuthContext    sessão e perfil do usuário logado
│   ├── lib/                    conexão Supabase, validações (zod), formatação
│   ├── pages/                  telas (login, painel, perfil, usuários, ...)
│   └── types/database.ts       tipos das tabelas
└── supabase/
    ├── migrations/             banco de dados (aplicar em ordem)
    │   ├── ..._schema.sql              tabelas e planos oficiais
    │   ├── ..._functions_triggers.sql  regras de negócio e auditoria
    │   └── ..._rls.sql                 políticas de segurança por perfil
    ├── functions/admin-users/  função de servidor: convidar usuários, mudar perfil, desativar
    └── tests/                  testes automatizados de segurança (banco local)
```

## Banco de dados

| Tabela | Conteúdo |
|---|---|
| `profiles` | conta de acesso (papel: admin, professor, responsável) |
| `guardians` | responsáveis (podem ter conta ou não) |
| `teachers` | professores |
| `athletes` | atletas (exclusão lógica via `archived_at`) |
| `athlete_guardians` | vínculo N:N — um responsável pode ter vários atletas |
| `categories` | categorias por idade (definidas pela escola) |
| `plans` | planos: **Plano 1** R$ 50 (1x/sem), **Plano 2** R$ 75 (2x), **Plano 3** R$ 90 (3x) |
| `classes`, `class_schedules` | turmas e horários (conflitos de professor/local bloqueados) |
| `class_enrollments` | matrículas em turmas (limite de vagas aplicado) |
| `invoices`, `payments` | mensalidades (vencimento dia 10) e pagamentos (preparado para Pix/cartão) |
| `attendances` | presença: presente, falta, falta justificada |
| `athlete_notes` | observações de professores (opcionalmente visíveis aos pais) |
| `announcements` | comunicados: geral, por turma, individual |
| `notification_outbox` | fila para futuros envios por e-mail/WhatsApp |
| `audit_log` | histórico de alterações em dados sensíveis (LGPD) |
| `settings` | nome, logo, dia de vencimento |

**Segurança (RLS):** administrador vê tudo; professor vê só suas turmas e os atletas delas
(sem acesso ao financeiro); responsável vê só os próprios filhos. Visitantes não autenticados
não acessam nenhum dado. Cadastro público fica desativado: contas são criadas por convite do administrador.

---

## Como colocar no ar (passo a passo)

### 1. Criar o projeto Supabase
1. Crie uma conta em https://supabase.com e um novo projeto (região sugerida: São Paulo).
2. Em **Authentication → Providers → Email**, desative **"Allow new users to sign up"**.
3. Em **Authentication → URL Configuration**:
   - *Site URL*: endereço do app (ex.: `http://localhost:5173` durante testes)
   - *Redirect URLs*: adicione `<endereço do app>/redefinir-senha`

### 2. Criar o banco
No **SQL Editor** do Supabase, execute os três arquivos de `supabase/migrations/` **na ordem**.
(Ou, com o Supabase CLI: `supabase link --project-ref <ref>` e `supabase db push`.)

### 3. Publicar a função de usuários
Necessária para o administrador convidar usuários:
```bash
npx supabase login
```
```bash
npx supabase functions deploy admin-users --project-ref <ref-do-projeto>
```

### 4. Criar o primeiro administrador
1. Em **Authentication → Users → Add user**, crie o usuário com seu e-mail e senha.
2. No **SQL Editor**, execute (troque o e-mail):
```sql
update public.profiles set role = 'admin', full_name = 'Seu Nome'
where email = 'seu-email@exemplo.com';
```
Depois disso, os demais usuários são convidados pela tela **Usuários e acessos**.

### 5. Rodar o aplicativo
```bash
cp .env.example .env.local
```
Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (Supabase → Project Settings → API).
```bash
npm install
```
```bash
npm run dev
```
Abra http://localhost:5173.

### 6. Hospedagem
Qualquer hospedagem de sites estáticos (Vercel, Netlify, Cloudflare Pages). Comando de build
`npm run build`, pasta `dist`, e as duas variáveis `VITE_SUPABASE_*`. Configure o redirecionamento
de todas as rotas para `index.html` (SPA).

---

## Testes de segurança do banco

Rodam num PostgreSQL local (nunca no banco de produção):
```bash
createdb ag_test
```
```bash
for f in supabase/tests/00_supabase_stub.sql supabase/migrations/*.sql supabase/tests/01_rls_tests.sql; do psql -d ag_test -v ON_ERROR_STOP=1 -q -f "$f"; done
```
Resultado esperado: `TODOS OS TESTES PASSARAM`.

## Logomarca
A logo atual é provisória. Para usar a oficial, salve o arquivo em `public/logo.png` e altere
`OFFICIAL_LOGO` em `src/components/ui/Logo.tsx`. Substitua também os ícones `public/pwa-*.png`
e `public/apple-touch-icon.png`.

## LGPD
- Dados de menores só são visíveis aos próprios responsáveis, professores das turmas e administração.
- Campos de consentimento: `guardians.lgpd_consent_at` e `athletes.image_consent`.
- Toda alteração em atletas, responsáveis, perfis, planos e financeiro fica registrada em `audit_log`.
- O app instalado não guarda dados pessoais em cache offline.
- Backups: o Supabase faz backup diário automático nos planos pagos; no plano gratuito, exporte
  periodicamente (Database → Backups ou `supabase db dump`).
