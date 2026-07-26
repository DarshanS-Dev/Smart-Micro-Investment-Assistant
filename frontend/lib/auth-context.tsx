"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import * as api from "./api";
import type { AssetBucket, UserOut } from "./types";

const TOKEN_KEY = "lpb_token";
const USER_KEY = "lpb_user";

interface AuthContextValue {
  user: UserOut | null;
  token: string | null;
  ready: boolean;
  signup: (email: string, password: string) => Promise<UserOut>;
  login: (email: string, password: string) => Promise<UserOut>;
  logout: () => void;
  setBucket: (asset: AssetBucket) => Promise<void>;
  devLogin: (token: string, user: UserOut) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserOut | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // One-time hydration from sessionStorage on mount, not a render-loop sync.
    try {
      const storedToken = window.sessionStorage.getItem(TOKEN_KEY);
      const storedUser = window.sessionStorage.getItem(USER_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (storedToken) setToken(storedToken);
      if (storedUser) setUser(JSON.parse(storedUser));
    } catch {
      // sessionStorage unavailable — proceed unauthenticated
    } finally {
      setReady(true);
    }
  }, []);

  function persist(nextToken: string, nextUser: UserOut) {
    window.sessionStorage.setItem(TOKEN_KEY, nextToken);
    window.sessionStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  }

  async function signup(email: string, password: string) {
    const res = await api.signup(email, password);
    persist(res.token.access_token, res.user);
    return res.user;
  }

  async function login(email: string, password: string) {
    const res = await api.login(email, password);
    persist(res.token.access_token, res.user);
    return res.user;
  }

  function logout() {
    window.sessionStorage.removeItem(TOKEN_KEY);
    window.sessionStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }

  async function setBucketAndPersist(asset: AssetBucket) {
    await api.setBucket(asset);
    setUser((prev) => {
      const next = prev ? { ...prev, asset_bucket: asset } : prev;
      if (next) window.sessionStorage.setItem(USER_KEY, JSON.stringify(next));
      return next;
    });
  }

  function devLogin(fakeToken: string, fakeUser: UserOut) {
    persist(fakeToken, fakeUser);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        ready,
        signup,
        login,
        logout,
        setBucket: setBucketAndPersist,
        devLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
