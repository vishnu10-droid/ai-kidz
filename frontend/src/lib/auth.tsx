import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { api, ApiUser, authToken, clearAuthToken } from "./api";
import type { AppRole } from "./roles";

type Profile = { id: string; full_name: string; email: string | null; phone: string | null; city: string | null; state: string | null; avatar_url: string | null };

type AuthState = {
  session: { access_token: string } | null;
  user: ApiUser | null;
  roles: AppRole[];
  profile: Profile | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export async function fetchRoles(_userId?: string): Promise<AppRole[]> {
  if (!authToken()) return [];
  const { user } = await api<{ user: ApiUser }>("/auth/me");
  return user.roles as AppRole[];
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [session, setSession] = useState<{ access_token: string } | null>(null);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserData = useCallback(async () => {
    const token = authToken();
    if (!token) {
      setSession(null);
      setUser(null);
      setRoles([]);
      setProfile(null);
      return;
    }
    try {
      const { user: currentUser } = await api<{ user: ApiUser }>("/auth/me");
      setSession({ access_token: token });
      setUser(currentUser);
      setRoles(currentUser.roles as AppRole[]);
      setProfile(currentUser);
    } catch {
      clearAuthToken();
      setSession(null); setUser(null); setRoles([]); setProfile(null);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void loadUserData().finally(() => { if (active) setLoading(false); });
    return () => {
      active = false;
    };
  }, [loadUserData, queryClient, router]);

  const value = useMemo<AuthState>(
    () => ({
      session,
      user,
      roles,
      profile,
      loading,
      refresh: async () => { await loadUserData(); await router.invalidate(); },
      signOut: async () => {
        await queryClient.cancelQueries();
        queryClient.clear();
        clearAuthToken();
        setSession(null); setUser(null); setRoles([]); setProfile(null);
        await router.navigate({ to: "/login", replace: true });
      },
    }),
    [session, user, roles, profile, loading, loadUserData, queryClient, router],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
