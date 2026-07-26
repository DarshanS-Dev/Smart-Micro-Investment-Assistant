"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-context";

/**
 * Redirects to "/" if there is no authenticated session once the auth
 * context has finished hydrating from sessionStorage. Returns whether
 * the caller is clear to render (ready && token present).
 */
export function useRequireAuth() {
  const { token, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !token) {
      router.replace("/");
    }
  }, [ready, token, router]);

  return { ready, authenticated: !!token };
}
