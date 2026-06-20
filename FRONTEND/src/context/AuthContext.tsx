import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { LoginResponseData, Role } from "@/types/auth";

interface AuthState {
  accessToken: string;
  role: Role;
  username: string;
}

interface AuthContextValue {
  auth: AuthState | null;
  login: (data: LoginResponseData) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readInitialAuth(): AuthState | null {
  const accessToken = localStorage.getItem("access_token");
  const role = localStorage.getItem("role") as Role | null;
  const username = localStorage.getItem("username");
  if (!accessToken || !role || !username) {
    return null;
  }
  return { accessToken, role, username };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState | null>(readInitialAuth);

  const login = (data: LoginResponseData) => {
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("role", data.role);
    localStorage.setItem("username", data.username);
    setAuth({ accessToken: data.access_token, role: data.role, username: data.username });
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("role");
    localStorage.removeItem("username");
    setAuth(null);
  };

  const value = useMemo(() => ({ auth, login, logout }), [auth]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
