"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Terminal,
} from "lucide-react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { siteConfig } from "@/config/site";
import {
  createSupabaseBrowserClient,
  isSupabaseConfiguredClient,
} from "@/lib/supabase/client";
import { loginSchema, signupSchema } from "@/lib/validations";

type LoginValues = z.infer<typeof loginSchema>;
type SignupValues = z.infer<typeof signupSchema>;
type AuthValues = LoginValues & { name?: string };

interface AuthFormProps {
  mode: "login" | "register";
  redirectTo?: string;
  initialError?: string | null;
}

export function AuthForm({
  mode,
  redirectTo = "/dashboard",
  initialError = null,
}: AuthFormProps) {
  const router = useRouter();
  const isRegister = mode === "register";
  const [showPassword, setShowPassword] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(initialError);
  const [oauthLoading, setOauthLoading] = React.useState(false);
  const supabaseAvailable = isSupabaseConfiguredClient();

  const safeRedirect =
    redirectTo.startsWith("/") && !redirectTo.startsWith("//")
      ? redirectTo
      : "/dashboard";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AuthValues>({
    resolver: zodResolver(isRegister ? signupSchema : loginSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

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
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        setServerError(
          json.error ?? "Unable to complete authentication. Please try again.",
        );
        return;
      }

      window.dispatchEvent(new CustomEvent("devspace:auth-changed"));
      router.push(safeRedirect);
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

    const callbackUrl = `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(
      safeRedirect,
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

  return (
    <Card className="w-full max-w-md border-border/80 bg-card/95 shadow-lg">
      <CardHeader className="space-y-2 pb-4">
        <div className="flex items-center gap-2 text-xs font-medium tracking-wider text-violet-400 uppercase">
          <Terminal className="size-3.5" aria-hidden="true" />
          <span>{siteConfig.name}</span>
        </div>
        <CardTitle className="text-xl tracking-tight">
          {isRegister ? "Initialize your developer account" : "Sign in to workspace"}
        </CardTitle>
        <CardDescription>
          {isRegister
            ? "Create a personal workspace account to track projects, roadmaps, checklists, and engineering notes across all 100 repositories."
            : "Access your persisted project progress, Kanban pipeline, engineering journal, and live GitHub repository sync."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {serverError ? (
          <div
            role="alert"
            aria-live="polite"
            className="flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/10 px-3.5 py-3 text-sm text-red-300"
          >
            <AlertCircle
              className="mt-0.5 size-4 shrink-0 text-red-400"
              aria-hidden="true"
            />
            <span>{serverError}</span>
          </div>
        ) : null}

        <form
          method="POST"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-4"
        >
          {isRegister ? (
            <div className="space-y-1.5">
              <Label htmlFor="auth-name" className="text-sm font-medium">
                Full name{" "}
                <span aria-hidden="true" className="text-red-400">
                  *
                </span>
              </Label>
              <Input
                id="auth-name"
                type="text"
                autoComplete="name"
                enterKeyHint="next"
                required
                placeholder="Arman"
                aria-invalid={errors.name ? "true" : "false"}
                aria-describedby={errors.name ? "auth-name-error" : "auth-name-hint"}
                className="min-h-11 text-base md:text-sm"
                {...register("name")}
              />
              <p id="auth-name-hint" className="text-xs text-muted-foreground">
                The first registered account receives workspace owner permissions.
              </p>
              {errors.name ? (
                <p id="auth-name-error" className="text-xs font-medium text-red-400">
                  {errors.name.message}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="auth-email" className="text-sm font-medium">
              Email address{" "}
              <span aria-hidden="true" className="text-red-400">
                *
              </span>
            </Label>
            <Input
              id="auth-email"
              type="email"
              autoComplete="username"
              spellCheck={false}
              autoCapitalize="none"
              enterKeyHint="next"
              required
              placeholder="developer@example.com"
              aria-invalid={errors.email ? "true" : "false"}
              aria-describedby={errors.email ? "auth-email-error" : undefined}
              className="min-h-11 text-base md:text-sm"
              {...register("email")}
            />
            {errors.email ? (
              <p id="auth-email-error" className="text-xs font-medium text-red-400">
                {errors.email.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="auth-password" className="text-sm font-medium">
                Password{" "}
                <span aria-hidden="true" className="text-red-400">
                  *
                </span>
              </Label>
              <button
                type="button"
                aria-pressed={showPassword}
                onClick={() => setShowPassword((prev) => !prev)}
                className="inline-flex min-h-7 items-center gap-1 rounded px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              >
                {showPassword ? (
                  <>
                    <EyeOff className="size-3.5" aria-hidden="true" />
                    <span>Hide password</span>
                  </>
                ) : (
                  <>
                    <Eye className="size-3.5" aria-hidden="true" />
                    <span>Show password</span>
                  </>
                )}
              </button>
            </div>
            {isRegister ? (
              <p id="auth-password-hint" className="text-xs text-muted-foreground">
                Minimum 8 characters. Password manager pasting is supported.
              </p>
            ) : null}
            <Input
              id="auth-password"
              type={showPassword ? "text" : "password"}
              autoComplete={isRegister ? "new-password" : "current-password"}
              enterKeyHint="done"
              required
              minLength={isRegister ? 8 : 1}
              aria-invalid={errors.password ? "true" : "false"}
              aria-describedby={
                [
                  isRegister ? "auth-password-hint" : null,
                  errors.password ? "auth-password-error" : null,
                ]
                  .filter(Boolean)
                  .join(" ") || undefined
              }
              className="min-h-11 text-base md:text-sm"
              {...register("password")}
            />
            {errors.password ? (
              <p id="auth-password-error" className="text-xs font-medium text-red-400">
                {errors.password.message}
              </p>
            ) : null}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="min-h-11 w-full gap-2 text-sm font-medium"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                <span>
                  {isRegister ? "Creating workspace account..." : "Signing in..."}
                </span>
              </>
            ) : (
              <>
                <Lock className="size-4" aria-hidden="true" />
                <span>{isRegister ? "Create workspace account" : "Sign in"}</span>
                <ArrowRight className="size-4" aria-hidden="true" />
              </>
            )}
          </Button>
        </form>

        {supabaseAvailable ? (
          <>
            <div className="relative flex items-center py-1">
              <Separator className="flex-1" />
              <span className="px-2.5 text-xs text-muted-foreground uppercase">
                or continue with
              </span>
              <Separator className="flex-1" />
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={oauthLoading}
              onClick={handleGoogleOAuth}
              className="min-h-11 w-full gap-2"
            >
              {oauthLoading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              <span>Continue with Google (Supabase OAuth)</span>
            </Button>
          </>
        ) : null}
      </CardContent>

      <CardFooter className="flex flex-col items-start gap-2 border-t border-border/60 pt-4 text-xs text-muted-foreground">
        {isRegister ? (
          <p>
            Already have a workspace account?{" "}
            <Link
              href={`/login${safeRedirect !== "/dashboard" ? `?redirect=${encodeURIComponent(safeRedirect)}` : ""}`}
              className="font-medium text-violet-400 underline-offset-4 hover:underline"
            >
              Sign in instead
            </Link>
          </p>
        ) : (
          <p>
            First time launching Arman&apos;s Devspace?{" "}
            <Link
              href={`/register${safeRedirect !== "/dashboard" ? `?redirect=${encodeURIComponent(safeRedirect)}` : ""}`}
              className="font-medium text-violet-400 underline-offset-4 hover:underline"
            >
              Create your workspace account
            </Link>
          </p>
        )}
      </CardFooter>
    </Card>
  );
}
