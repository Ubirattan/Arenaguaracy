import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Profile, UserRole } from "@/types/database";

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  /** true quando a sessão existe mas o perfil não pôde ser carregado */
  profileError: boolean;
  loading: boolean;
  /** true quando a sessão veio de um link de recuperação/convite (precisa definir senha) */
  passwordRecovery: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearRecovery: () => void;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(
    () => /type=(recovery|invite)/.test(window.location.hash),
  );

  const loadProfile = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setProfile(null);
      setProfileError(false);
      return;
    }
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (error) console.error("Erro ao carregar perfil", error);
    setProfile((data as Profile) ?? null);
    setProfileError(!data);
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      await loadProfile(data.session?.user.id);
      if (mounted) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === "PASSWORD_RECOVERY") setPasswordRecovery(true);
      setSession(newSession);
      // evita chamadas ao Supabase dentro do callback (recomendação da lib)
      setTimeout(() => {
        loadProfile(newSession?.user.id);
      }, 0);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      session,
      profile,
      profileError,
      loading,
      passwordRecovery,
      signIn,
      signOut,
      refreshProfile: () => loadProfile(session?.user.id),
      clearRecovery: () => setPasswordRecovery(false),
      hasRole: (...roles) => !!profile && profile.active && roles.includes(profile.role),
    }),
    [session, profile, profileError, loading, passwordRecovery, signIn, signOut, loadProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
