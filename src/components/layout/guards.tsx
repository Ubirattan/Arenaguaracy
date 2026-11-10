import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingScreen } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Feedback";
import { Button } from "@/components/ui/Button";
import { Brand } from "@/components/ui/Logo";
import type { UserRole } from "@/types/database";

/** Exige usuário autenticado, com perfil ativo */
export function RequireAuth() {
  const { session, profile, profileError, loading, passwordRecovery, signOut, refreshProfile } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (passwordRecovery) return <Navigate to="/redefinir-senha" replace />;
  if (!profile && profileError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-900 p-4">
        <div className="card w-full max-w-md space-y-4 p-6">
          <Brand dark={false} />
          <Alert tone="error" title="Não foi possível carregar seu perfil">
            Verifique sua conexão. Se o problema continuar, procure a administração da Arena Guaracy.
          </Alert>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={refreshProfile}>Tentar novamente</Button>
            <Button variant="secondary" className="flex-1" onClick={signOut}>Sair</Button>
          </div>
        </div>
      </div>
    );
  }
  if (!profile) return <LoadingScreen label="Carregando seu perfil..." />;
  if (!profile.active) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-900 p-4">
        <div className="card w-full max-w-md space-y-4 p-6">
          <Brand dark={false} />
          <Alert tone="warning" title="Conta desativada">
            Seu acesso está desativado. Entre em contato com a administração da Arena Guaracy.
          </Alert>
          <Button variant="secondary" className="w-full" onClick={signOut}>Sair</Button>
        </div>
      </div>
    );
  }
  return <Outlet />;
}

/** Restringe a rota aos perfis informados */
export function RequireRole({ roles }: { roles: UserRole[] }) {
  const { profile } = useAuth();
  if (!profile || !roles.includes(profile.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}
