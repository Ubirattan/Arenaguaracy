import { Brand } from "@/components/ui/Logo";
import { Alert } from "@/components/ui/Feedback";

/** Exibida quando as variáveis do Supabase não foram configuradas */
export function SetupRequiredPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-900 p-4">
      <div className="card w-full max-w-lg space-y-4 p-6">
        <Brand dark={false} />
        <Alert tone="warning" title="Configuração pendente">
          O aplicativo ainda não está conectado ao banco de dados (Supabase).
        </Alert>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-600">
          <li>Crie um projeto em supabase.com.</li>
          <li>Copie o arquivo <code className="rounded bg-slate-100 px-1">.env.example</code> para <code className="rounded bg-slate-100 px-1">.env.local</code>.</li>
          <li>Preencha <code className="rounded bg-slate-100 px-1">VITE_SUPABASE_URL</code> e <code className="rounded bg-slate-100 px-1">VITE_SUPABASE_ANON_KEY</code>.</li>
          <li>Reinicie o aplicativo. Detalhes no arquivo README.md.</li>
        </ol>
      </div>
    </div>
  );
}
