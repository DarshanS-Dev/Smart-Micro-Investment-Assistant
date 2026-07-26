"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { PiggyBank, Warning, ArrowRight } from "@phosphor-icons/react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PillToggle } from "@/components/ui/PillToggle";
import { GridCanvas } from "@/components/ui/GridCanvas";
import { useAuth } from "@/lib/auth-context";
import { ApiError, getDashboard } from "@/lib/api";

type Mode = 0 | 1; // 0 = login, 1 = signup

const WORDS = ["Round", "up", "your", "spending."];

export default function AuthPage() {
  const router = useRouter();
  const { login, signup, token, ready, user } = useAuth();

  const [mode, setMode] = useState<Mode>(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    confirm?: string;
  }>({});

  // Already authenticated? skip the brand moment and route straight in,
  // based on real onboarding state (asset_bucket) rather than a token flag.
  useEffect(() => {
    if (ready && token) {
      if (!user?.asset_bucket) {
        router.replace("/onboarding");
      } else {
        router.replace("/upload");
      }
    }
  }, [ready, token, user, router]);

  function validate(): boolean {
    const errors: typeof fieldErrors = {};
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      errors.email = "Enter a valid email address.";
    }
    if (password.length < 8) {
      errors.password = "Use at least 8 characters.";
    }
    if (mode === 1 && confirmPassword !== password) {
      errors.confirm = "Passwords don't match.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      if (mode === 1) {
        await signup(email, password);
        router.push("/onboarding");
        return;
      }

      const loggedInUser = await login(email, password);

      if (!loggedInUser.asset_bucket) {
        router.push("/onboarding");
        return;
      }

      // GET /dashboard succeeds (200) even with zero transactions — it just
      // returns empty lots/transaction_feed and zeroed totals. There's no
      // `has_data` flag from the backend, so "has this user uploaded
      // anything yet" is derived here from those arrays being empty.
      try {
        const dashboard = await getDashboard();
        const hasData = dashboard.lots.length > 0 || dashboard.transaction_feed.length > 0;
        router.push(hasData ? "/dashboard" : "/upload");
      } catch {
        router.push("/upload");
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else {
        setServerError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <GridCanvas className="flex flex-col">
      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col justify-center gap-16 px-6 py-16 md:px-12 lg:flex-row lg:items-center lg:gap-20">
        {/* Hero headline moment */}
        <div className="flex-1">
          <div className="mb-6 flex items-center gap-2">
            <motion.div 
              className="relative flex h-9 w-9 items-center justify-center border-2 border-ink bg-lime-500 overflow-hidden"
              animate={{ y: [0, -2, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <motion.div
                initial={{ y: -15, opacity: 0 }}
                animate={{ y: [-15, 0, 5], opacity: [0, 1, 0] }}
                transition={{ duration: 0.6, ease: "easeIn", delay: 0.2 }}
                className="absolute top-0 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-ink"
              />
              <PiggyBank size={20} weight="fill" className="relative z-10" />
            </motion.div>
            <span className="font-display text-sm font-semibold uppercase tracking-[0.2em]">
              Loud Piggy Bank
            </span>
          </div>

          <h1 className="font-display text-[13vw] leading-[0.92] font-semibold tracking-[-0.03em] sm:text-[80px] md:text-[92px] lg:text-[80px] xl:text-[96px]">
            {WORDS.map((word, i) => (
              <motion.span
                key={word}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.6,
                  delay: i * 0.08,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="mr-4 inline-block"
              >
                {word === "up" ? (
                  <span className="relative inline-flex items-center">
                    up
                    <span className="ml-3 inline-flex h-[0.62em] w-[0.62em] items-center justify-center rounded-full border-2 border-ink bg-lime-500 align-middle">
                      <ArrowRight size={14} weight="bold" className="rotate-[-45deg]" />
                    </span>
                  </span>
                ) : (
                  word
                )}
              </motion.span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-6 max-w-md text-lg text-ink/70"
          >
            Invest the spare change — automatically. No spreadsheets, no
            jargon, just ₹5 at a time.
          </motion.p>
        </div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="w-full max-w-md border-2 border-ink bg-canvas p-8 shadow-[6px_6px_0_0_#0B0B0B]"
        >
          <div className="mb-8">
            <PillToggle
              options={["Login", "Sign Up"]}
              value={mode}
              onChange={(v) => {
                setMode(v);
                setServerError(null);
                setFieldErrors({});
              }}
            />
          </div>

          <AnimatePresence>
            {serverError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 flex items-start gap-3 overflow-hidden border-l-4 border-lime-500 bg-ink px-4 py-3 text-canvas"
              >
                <Warning size={18} weight="fill" className="mt-0.5 shrink-0 text-lime-500" />
                <p className="text-sm">{serverError}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldErrors.email}
              placeholder="you@example.com"
            />
            <Input
              label="Password"
              type="password"
              autoComplete={mode === 1 ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
              helperText={mode === 1 ? "At least 8 characters." : undefined}
              placeholder="••••••••"
            />

            <AnimatePresence initial={false}>
              {mode === 1 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <Input
                    label="Confirm password"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    error={fieldErrors.confirm}
                    placeholder="••••••••"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <Button type="submit" loading={loading} fullWidth className="mt-2">
              <span className="relative inline-grid">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={mode}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="col-start-1 row-start-1"
                  >
                    {mode === 1 ? "Create Account" : "Log In"}
                  </motion.span>
                </AnimatePresence>
              </span>
            </Button>
          </form>
        </motion.div>
      </main>
    </GridCanvas>
  );
}