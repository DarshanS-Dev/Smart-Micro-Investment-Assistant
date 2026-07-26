"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import * as api from "./api";
import { setUnauthorizedHandler } from "./api";
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
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserOut | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // One-time hydration from sessionStorage on mount, not a render-loop sync.
    //
    // TOKEN STORAGE — deliberate choice, not a default:
    // The backend issues a plain bearer JWT (app/auth/jwt_handler.py) with
    // no httpOnly-cookie option and no refresh-token endpoint at all — so
    // "in-memory only" storage would log the user out on every page reload,
    // which the integration spec also requires us to survive. sessionStorage
    // is the least-bad option available given what the backend exposes: it
    // survives reloads but not new tabs/windows and clears on tab close,
    // unlike localStorage. It is still readable by any script on the page
    // (XSS risk) — flagged here and in the final summary as an accepted
    // risk, not a preferred pattern, pending backend support for httpOnly
    // cookies.
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

  function logout() {
    window.sessionStorage.removeItem(TOKEN_KEY);
    window.sessionStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }

  // Backend has no refresh-token flow, so a 401 on any authenticated
  // request (expired/invalid JWT) means "the session is over" — force a
  // real logout instead of leaving the app in a half-authenticated state.
  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, []);

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

  async function setBucketAndPersist(asset: AssetBucket) {
    const updated = await api.setBucket(asset);
    setUser(updated);
    window.sessionStorage.setItem(USER_KEY, JSON.stringify(updated));
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