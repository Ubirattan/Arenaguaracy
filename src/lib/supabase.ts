import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** true quando as variáveis de ambiente do Supabase foram configuradas */
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : (null as unknown as SupabaseClient);

/** Converte erros do Supabase/Postgres em mensagens amigáveis em português */
export function friendlyError(err: unknown): string {
  const e = err as { message?: string; code?: string } | null;
  const msg = e?.message ?? String(err ?? "");
  if (/Invalid login credentials/i.test(msg)) return "E-mail ou senha incorretos.";
  if (/Email not confirmed/i.test(msg)) return "E-mail ainda não confirmado. Verifique sua caixa de entrada.";
  if (/User is banned|banned/i.test(msg)) return "Esta conta está desativada. Procure a administração.";
  if (/rate limit|too many/i.test(msg)) return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  if (/Password should be at least/i.test(msg)) return "A senha deve ter pelo menos 8 caracteres.";
  if (/same password|different from the old/i.test(msg)) return "A nova senha deve ser diferente da anterior.";
  if (/Failed to fetch|NetworkError/i.test(msg)) return "Sem conexão com o servidor. Verifique sua internet.";
  if (e?.code === "42501" || /row-level security|permission denied/i.test(msg))
    return msg && !/row-level security|permission denied/i.test(msg) ? msg : "Você não tem permissão para esta ação.";
  if (e?.code === "23505") return "Registro duplicado: já existe um cadastro com estes dados.";
  if (e?.code === "23503") return "Este registro está vinculado a outros dados e não pode ser removido.";
  return msg || "Ocorreu um erro inesperado.";
}
