import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { api, tokenStore } from "./api";
import { User } from "./types";

interface Ctx {
  user: User | null; loading: boolean;
  login: (email: string, password: string, remember: boolean) => Promise<User>;
  register: (b: Record<string, string>) => Promise<User>;
  logout: () => Promise<void>;
  setUser: (u: User) => void;
}
const AuthCtx = createContext<Ctx>(null!);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!!tokenStore.get());

  useEffect(() => {
    if (!tokenStore.get()) return;
    api.get("/auth/me").then((r) => setUser(r.data.user)).catch(() => tokenStore.clear()).finally(() => setLoading(false));
    const expired = () => setUser(null);
    window.addEventListener("auth:expired", expired);
    return () => window.removeEventListener("auth:expired", expired);
  }, []);

  const login = useCallback(async (email: string, password: string, remember: boolean) => {
    const r = await api.post("/auth/login", { email, password, remember_me: remember });
    tokenStore.set(r.data.access_token, remember); setUser(r.data.user); return r.data.user as User;
  }, []);
  const register = useCallback(async (b: Record<string, string>) => {
    const r = await api.post("/auth/register", b);
    tokenStore.set(r.data.access_token, false); setUser(r.data.user); return r.data.user as User;
  }, []);
  const logout = useCallback(async () => {
    try { await api.post("/auth/logout"); } catch { /* token may already be invalid */ }
    tokenStore.clear(); setUser(null);
  }, []);

  return <AuthCtx.Provider value={{ user, loading, login, register, logout, setUser }}>{children}</AuthCtx.Provider>;
}
