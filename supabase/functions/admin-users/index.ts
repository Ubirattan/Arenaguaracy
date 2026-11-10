// Edge Function: gerenciamento de usuários pelo administrador.
// Usa a SERVICE ROLE KEY apenas no servidor (nunca no navegador).
//
// Ações (POST JSON):
//   { action: "invite", email, full_name, role, guardian_id?, teacher_id?, redirect_to? }
//   { action: "set_active", user_id, active }
//   { action: "set_role", user_id, role }
//   { action: "resend_invite", email, redirect_to? }
import { createClient } from "npm:@supabase/supabase-js@2.46.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ROLES = ["admin", "professor", "responsavel"] as const;
type Role = (typeof ROLES)[number];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // 1) Identifica quem está chamando, com o token do próprio usuário
  const authHeader = req.headers.get("Authorization") ?? "";
  const asCaller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: isAdmin, error: adminErr } = await asCaller.rpc("is_admin");
  if (adminErr || isAdmin !== true) return json({ error: "Acesso restrito a administradores." }, 403);
  const { data: caller } = await asCaller.auth.getUser();

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  try {
    switch (body.action) {
      case "invite": {
        const email = String(body.email ?? "").trim().toLowerCase();
        const fullName = String(body.full_name ?? "").trim();
        const role = body.role as Role;
        if (!EMAIL_RE.test(email)) return json({ error: "E-mail inválido." }, 400);
        if (fullName.length < 3) return json({ error: "Informe o nome completo." }, 400);
        if (!ROLES.includes(role)) return json({ error: "Perfil inválido." }, 400);

        const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
          data: { full_name: fullName },
          redirectTo: typeof body.redirect_to === "string" ? body.redirect_to : undefined,
        });
        if (error) return json({ error: traduzir(error.message) }, 400);
        const userId = data.user.id;

        // Papel definido em app_metadata (não editável pelo usuário) + perfil
        await admin.auth.admin.updateUserById(userId, { app_metadata: { role } });
        await admin.from("profiles").upsert({ id: userId, email, full_name: fullName, role });

        if (role === "responsavel" && body.guardian_id) {
          const { error: e } = await admin.from("guardians").update({ profile_id: userId }).eq("id", body.guardian_id);
          if (e) return json({ error: "Usuário criado, mas não foi possível vincular ao responsável: " + e.message }, 207);
        }
        if (role === "professor" && body.teacher_id) {
          const { error: e } = await admin.from("teachers").update({ profile_id: userId }).eq("id", body.teacher_id);
          if (e) return json({ error: "Usuário criado, mas não foi possível vincular ao professor: " + e.message }, 207);
        }
        return json({ ok: true, user_id: userId });
      }

      case "resend_invite": {
        const email = String(body.email ?? "").trim().toLowerCase();
        const { error } = await admin.auth.resetPasswordForEmail(email, {
          redirectTo: typeof body.redirect_to === "string" ? body.redirect_to : undefined,
        });
        if (error) return json({ error: traduzir(error.message) }, 400);
        return json({ ok: true });
      }

      case "set_active": {
        const userId = String(body.user_id ?? "");
        const active = body.active === true;
        if (userId === caller.user?.id) return json({ error: "Você não pode desativar a própria conta." }, 400);
        const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: active ? "none" : "876000h" });
        if (error) return json({ error: traduzir(error.message) }, 400);
        await admin.from("profiles").update({ active }).eq("id", userId);
        return json({ ok: true });
      }

      case "set_role": {
        const userId = String(body.user_id ?? "");
        const role = body.role as Role;
        if (!ROLES.includes(role)) return json({ error: "Perfil inválido." }, 400);
        if (userId === caller.user?.id) return json({ error: "Você não pode alterar o próprio perfil de acesso." }, 400);
        const { error } = await admin.auth.admin.updateUserById(userId, { app_metadata: { role } });
        if (error) return json({ error: traduzir(error.message) }, 400);
        await admin.from("profiles").update({ role }).eq("id", userId);
        return json({ ok: true });
      }

      default:
        return json({ error: "Ação desconhecida." }, 400);
    }
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Erro inesperado." }, 500);
  }
});

function traduzir(msg: string) {
  if (/already been registered|already registered|exists/i.test(msg)) return "Já existe um usuário com este e-mail.";
  if (/rate limit/i.test(msg)) return "Muitas tentativas. Aguarde alguns minutos.";
  return msg;
}
