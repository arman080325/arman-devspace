"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowBigUp,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
  X,
} from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";

import { Mark, Tagline, Wordmark } from "@/components/redesign/brand";
import { Button, ErrorBanner, cx } from "@/components/redesign/ui";
import { loadWorkspacePreferences } from "@/lib/preferences";
import {
  createSupabaseBrowserClient,
  isSupabaseConfiguredClient,
} from "@/lib/supabase/client";
import { getSafeRedirectPath, loginSchema, signupSchema } from "@/lib/validations";

type LoginValues = z.infer<typeof loginSchema>;
type SignupValues = z.infer<typeof signupSchema>;
type AuthValues = LoginValues & { name?: string };

interface AuthFormProps {
  mode: "login" | "register";
  redirectTo?: string;
  hasExplicitRedirect?: boolean;
  initialError?: string | null;
}

function PasswordGuidance({ password, email }: { password: string; email: string }) {
  const localPart = email.split("@")[0]?.trim().toLowerCase() ?? "";
  const checks = [
    { label: "At least 8 characters", ok: password.length >= 8 },
    {
      label: "Recommended: mix of letters & numbers",
      ok: /[a-z]/i.test(password) && /\d/.test(password),
    },
    {
      label: "Avoid matching your email handle",
      ok:
        password.length > 0 &&
        (!localPart || !password.toLowerCase().includes(localPart)),
    },
  ];

  return (
    <ul
      id="auth-password-rules"
      aria-label="Complexity checklist"
      className="mb-2 grid gap-1 rounded-ctl border border-line bg-inset px-3 py-2 text-2xs"
    >
      {checks.map((item) => (
        <li
          key={item.label}
          className={cx("flex items-center gap-1.5", item.ok ? "text-ship" : "text-fg3")}
        >
          {item.ok ? (
            <Check size={12} strokeWidth={2} aria-hidden="true" />
          ) : (
            <X size={12} strokeWidth={1.5} aria-hidden="true" />
          )}
          <span className={item.ok ? "text-fg2" : undefined}>{item.label}</span>
          <span className="sr-only">{item.ok ? "met" : "not met"}</span>
        </li>
      ))}
    </ul>
  );
}

export function AuthForm({
  mode,
  redirectTo = "/dashboard",
  hasExplicitRedirect = false,
  initialError = null,
}: AuthFormProps) {
  const router = useRouter();
  const isRegister = mode === "register";
  const [showPassword, setShowPassword] = React.useState(false);
  const [capsLockOn, setCapsLockOn] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(initialError);
  const [oauthLoading, setOauthLoading] = React.useState(false);
  const [authSucceeded, setAuthSucceeded] = React.useState(false);
  const supabaseAvailable = isSupabaseConfiguredClient();

  const safeExplicitRedirect = getSafeRedirectPath(redirectTo, "/dashboard");

  const getEffectiveRedirect = React.useCallback(() => {
    if (hasExplicitRedirect) {
      return safeExplicitRedirect;
    }
    const prefs = loadWorkspacePreferences();
    return getSafeRedirectPath(prefs.landingRoute, "/dashboard");
  }, [hasExplicitRedirect, safeExplicitRedirect]);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AuthValues>({
    resolver: zodResolver(isRegister ? signupSchema : loginSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    shouldFocusError: true,
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const watchedEmail = useWatch({ control, name: "email" }) ?? "";
  const watchedPassword = useWatch({ control, name: "password" }) ?? "";
  const busy = isSubmitting || authSucceeded || oauthLoading;

  const onSubmit = async (values: AuthValues) => {
    setServerError(null);
    const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
    const payload = isRegister
      ? {
          name: (values as SignupValues).name,
          email: values.email,
          password: values.password,
        }
      : {
          email: values.email,
          password: values.password,
        };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setServerError(
          json.error ?? "Unable to complete authentication. Please verify your details.",
        );
        return;
      }

      setAuthSucceeded(true);
      window.dispatchEvent(new CustomEvent("devspace:auth-changed"));
      router.push(getEffectiveRedirect());
      router.refresh();
    } catch {
      setServerError("Network error while reaching authentication endpoint.");
    }
  };

  const handleGoogleOAuth = async () => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    setOauthLoading(true);
    setServerError(null);

    const targetRedirect = getEffectiveRedirect();
    const callbackUrl = `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(
      targetRedirect,
    )}`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl },
    });

    if (error) {
      setServerError(error.message);
      setOauthLoading(false);
    }
  };

  const handleCapsCheck = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setCapsLockOn(Boolean(e.getModifierState?.("CapsLock")));
  };

  const fieldStatus = authSucceeded
    ? "success"
    : serverError
      ? "error"
      : busy
        ? "loading"
        : "idle";

  const redirectQuery = hasExplicitRedirect
    ? `?redirect=${encodeURIComponent(safeExplicitRedirect)}`
    : "";

  return (
    <div className="flex min-h-dvh w-full flex-col bg-inset text-fg">
      {/* Mobile top 10-column field strip */}
      <div
        className="border-b border-line bg-inset px-4 pb-4 pt-5 md:hidden"
        aria-hidden="true"
      >
        <div className="mx-auto grid max-w-[420px] grid-cols-10 gap-1.5">
          {Array.from({ length: 20 }, (_, i) => {
            const isBroken = fieldStatus === "error" && (i === 16 || i === 17);
            const isLit = fieldStatus === "success" && (i === 4 || i === 13);
            return (
              <span
                key={i}
                className="aspect-square rounded-cell transition-all duration-200"
                style={{
                  background: isLit ? "var(--sodium)" : "var(--border-default)",
                  opacity: isLit ? 0.85 : 0.45,
                  transform: isBroken
                    ? `translate(${i === 16 ? 3 : -2}px, 4px) rotate(${i === 16 ? 4 : -3}deg)`
                    : undefined,
                  boxShadow: isBroken ? "inset 0 0 0 1.5px var(--ph-break)" : undefined,
                  animation:
                    fieldStatus === "loading"
                      ? `cell-pulse 1400ms ease-in-out ${i * 70}ms infinite`
                      : undefined,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Main Centered Workstation Surface surrounded by subtle geometric grid */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-8 sm:px-6">
        {/* Decorative desktop matrix backdrop */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden items-center justify-center opacity-40 md:flex"
        >
          <div className="grid grid-cols-12 gap-2">
            {Array.from({ length: 96 }, (_, i) => {
              const row = Math.floor(i / 12);
              const col = i % 12;
              const isPerimeter = row === 0 || row === 7 || col === 0 || col === 11;
              const isBroken =
                fieldStatus === "error" && row === 2 && (col === 10 || col === 11);
              return (
                <span
                  key={i}
                  className="h-8 w-8 rounded-cell"
                  style={{
                    background: "var(--border-default)",
                    opacity: isPerimeter ? 0.65 : 0.25,
                    boxShadow: isBroken ? "inset 0 0 0 1.5px var(--ph-break)" : undefined,
                    animation:
                      fieldStatus === "loading" && isPerimeter
                        ? `cell-pulse 1400ms ease-in-out ${(row + col) * 90}ms infinite`
                        : undefined,
                  }}
                />
              );
            })}
          </div>
        </div>

        <main
          id="main-content"
          className="relative z-10 w-full max-w-[432px] rounded-panel border border-edge bg-surface p-6 shadow-pop sm:p-7"
        >
          <div className="mb-5 flex items-center justify-between gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-ctl focus-visible:outline-2 focus-visible:outline-sodium"
              aria-label="Devspace home"
            >
              <Mark size={26} />
              <Wordmark className="text-[18px]" />
            </Link>
            <span className="inline-flex items-center gap-1 rounded-cell border border-line bg-inset px-2 py-0.5 font-mono text-[11px] text-fg3">
              <ShieldCheck size={12} aria-hidden="true" />
              Isolated Workspace
            </span>
          </div>

          <div className="mb-5">
            <h1 className="display text-xl leading-snug text-fg">
              {isRegister ? "Initialize workspace account" : "Sign in to workspace"}
            </h1>
            <p className="mt-1 text-xs leading-relaxed text-fg2">
              {isRegister
                ? "Create your personal developer account to persist roadmaps, notes, and GitHub audits across all 100 repositories."
                : "Access your persisted project progress, roadmaps, journal, and diagnostics."}
            </p>
          </div>

          {serverError && (
            <div className="mb-4" aria-live="polite">
              <ErrorBanner>{serverError}</ErrorBanner>
            </div>
          )}

          <form
            method="POST"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            aria-label={isRegister ? "Registration form" : "Sign-in form"}
            className="space-y-4"
          >
            {isRegister && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="auth-name" className="text-2xs font-medium text-fg2">
                  Full name{" "}
                  <span aria-hidden="true" className="text-break">
                    *
                  </span>
                </label>
                <p id="auth-name-hint" className="text-2xs text-fg3">
                  Personal display name used in your isolated developer workspace.
                </p>
                <input
                  id="auth-name"
                  type="text"
                  autoComplete="name"
                  enterKeyHint="next"
                  required
                  disabled={busy}
                  placeholder="Arman"
                  aria-invalid={errors.name ? "true" : "false"}
                  aria-describedby={
                    errors.name ? "auth-name-hint auth-name-error" : "auth-name-hint"
                  }
                  className={cx(
                    "h-11 w-full rounded-ctl border bg-inset px-3 text-base text-fg placeholder:text-fg3 md:h-10 md:text-sm",
                    "focus-visible:border-sodium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sodium/40 disabled:opacity-50",
                    errors.name ? "border-break" : "border-edge",
                  )}
                  {...register("name")}
                />
                {errors.name && (
                  <p id="auth-name-error" className="text-2xs font-medium text-break">
                    {errors.name.message}
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="auth-email" className="text-2xs font-medium text-fg2">
                Email address{" "}
                <span aria-hidden="true" className="text-break">
                  *
                </span>
              </label>
              <p id="auth-email-hint" className="text-2xs text-fg3">
                Format: developer@example.com
              </p>
              <input
                id="auth-email"
                type="email"
                autoComplete="username"
                spellCheck={false}
                autoCapitalize="none"
                autoCorrect="off"
                enterKeyHint="next"
                required
                disabled={busy}
                placeholder="developer@example.com"
                aria-invalid={errors.email ? "true" : "false"}
                aria-describedby={
                  errors.email ? "auth-email-hint auth-email-error" : "auth-email-hint"
                }
                className={cx(
                  "h-11 w-full rounded-ctl border bg-inset px-3 text-base text-fg placeholder:text-fg3 md:h-10 md:text-sm",
                  "focus-visible:border-sodium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sodium/40 disabled:opacity-50",
                  errors.email ? "border-break" : "border-edge",
                )}
                {...register("email")}
              />
              {errors.email && (
                <p id="auth-email-error" className="text-2xs font-medium text-break">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="auth-password" className="text-2xs font-medium text-fg2">
                  Password{" "}
                  <span aria-hidden="true" className="text-break">
                    *
                  </span>
                </label>
                <button
                  type="button"
                  aria-pressed={showPassword}
                  aria-describedby="auth-password-toggle-note"
                  disabled={busy}
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="inline-flex min-h-7 items-center gap-1 rounded-ctl px-2 text-2xs text-fg2 hover:bg-elevated hover:text-fg focus-visible:outline-2 focus-visible:outline-sodium"
                >
                  {showPassword ? (
                    <>
                      <EyeOff size={14} strokeWidth={1.5} aria-hidden="true" />
                      <span>Hide password</span>
                    </>
                  ) : (
                    <>
                      <Eye size={14} strokeWidth={1.5} aria-hidden="true" />
                      <span>Show password</span>
                    </>
                  )}
                </button>
                <span id="auth-password-toggle-note" className="sr-only">
                  Toggles visible text in the password field.
                </span>
              </div>

              {isRegister && (
                <PasswordGuidance password={watchedPassword} email={watchedEmail} />
              )}

              <input
                id="auth-password"
                type={showPassword ? "text" : "password"}
                autoComplete={isRegister ? "new-password" : "current-password"}
                enterKeyHint="done"
                required
                disabled={busy}
                minLength={isRegister ? 8 : 1}
                aria-invalid={errors.password ? "true" : "false"}
                aria-describedby={
                  [
                    isRegister ? "auth-password-rules" : null,
                    errors.password ? "auth-password-error" : null,
                  ]
                    .filter(Boolean)
                    .join(" ") || undefined
                }
                onKeyDown={handleCapsCheck}
                onKeyUp={handleCapsCheck}
                className={cx(
                  "h-11 w-full rounded-ctl border bg-inset px-3 text-base text-fg placeholder:text-fg3 md:h-10 md:text-sm",
                  "focus-visible:border-sodium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sodium/40 disabled:opacity-50",
                  errors.password ? "border-break" : "border-edge",
                )}
                {...register("password")}
              />

              {capsLockOn && (
                <p role="status" className="flex items-center gap-1 text-2xs text-warn">
                  <ArrowBigUp size={13} aria-hidden="true" />
                  <span>Caps Lock is on</span>
                </p>
              )}

              {errors.password && (
                <p id="auth-password-error" className="text-2xs font-medium text-break">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="l"
              loading={busy}
              className="min-h-11 w-full"
            >
              {authSucceeded ? (
                <span>Signed in</span>
              ) : (
                <>
                  <Lock size={14} aria-hidden="true" />
                  <span>{isRegister ? "Create workspace account" : "Sign in"}</span>
                  <ArrowRight size={14} aria-hidden="true" />
                </>
              )}
            </Button>
          </form>

          {supabaseAvailable && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2.5 text-2xs uppercase tracking-wider text-fg3">
                <span className="h-px flex-1 bg-line" />
                <span>or continue with</span>
                <span className="h-px flex-1 bg-line" />
              </div>
              <Button
                type="button"
                variant="secondary"
                size="l"
                loading={oauthLoading}
                disabled={busy}
                onClick={handleGoogleOAuth}
                className="min-h-11 w-full"
              >
                Continue with Google (Supabase OAuth)
              </Button>
            </div>
          )}

          <div className="mt-5 space-y-2 border-t border-line pt-4 text-xs text-fg2">
            {isRegister ? (
              <p>
                Already have a workspace account?{" "}
                <Link
                  href={`/login${redirectQuery}`}
                  className="font-medium text-sodium-text hover:underline"
                >
                  Sign in instead
                </Link>
              </p>
            ) : (
              <p>
                First time launching Arman&apos;s Devspace?{" "}
                <Link
                  href={`/register${redirectQuery}`}
                  className="font-medium text-sodium-text hover:underline"
                >
                  Create your workspace account
                </Link>
              </p>
            )}
            <p className="text-2xs text-fg3">
              Forgot password or need owner recovery? Verify your account via Supabase
              OAuth or update server credentials in the operator environment.
            </p>
          </div>
        </main>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-6 py-4">
        <Tagline size={20} />
        <p className="text-2xs text-fg3">A personal operating system for 100 projects.</p>
      </footer>
    </div>
  );
}
