"use client";

import { PiggyBank, SignOut } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function DashboardHeader() {
  const { logout, user } = useAuth();
  const router = useRouter();

  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6 md:px-8">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center border-2 border-ink bg-lime-500">
          <PiggyBank size={16} weight="fill" />
        </span>
        <span className="font-display text-sm font-semibold uppercase tracking-[0.2em]">
          Loud Piggy Bank
        </span>
      </div>
      <div className="flex items-center gap-4">
        {user?.email && <span className="hidden text-xs text-ink/45 sm:inline">{user.email}</span>}
        <button
          onClick={() => {
            logout();
            router.push("/");
          }}
          className="flex h-11 items-center gap-1.5 text-sm font-medium text-ink/60 hover:text-ink"
        >
          <SignOut size={16} />
          Log out
        </button>
      </div>
    </header>
  );
}
