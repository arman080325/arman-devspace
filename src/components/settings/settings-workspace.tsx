"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  CheckCircle2,
  LayoutGrid,
  Lock,
  LogOut,
  Palette,
  Plug,
  ShieldCheck,
  User,
} from "lucide-react";
import { Mark } from "@/components/redesign/brand";
import {
  Button,
  Dialog,
  ErrorBanner,
  Field,
  Radio,
  Segmented,
  Switch,
  Tabs,
  cx,
} from "@/components/redesign/ui";
import {
  DEFAULT_WORKSPACE_PREFERENCES,
  loadWorkspacePreferences,
  saveWorkspacePreferences,
  subscribeWorkspacePreferences,
  type DensityPreference,
  type LandingRoute,
  type WorkspacePreferences,
} from "@/lib/preferences";
import { formatDate } from "@/lib/utils";
import type { OperationalDiagnostics } from "@/services/diagnostics";
import type { AccountDetails } from "@/types/project";
import {
  IntegrationsSection,
  type IntegrationSnapshotCoverage,
} from "./integrations-section";

export type SettingsSectionId =
  "profile" | "appearance" | "workspace" | "security" | "integrations";

const SECTIONS: Array<{
  id: SettingsSectionId;
  label: string;
  icon: typeof User;
}> = [
  { id: "profile", label: "Profile", icon: User },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "workspace", label: "Workspace", icon: LayoutGrid },
  { id: "security", label: "Account security", icon: ShieldCheck },
  { id: "integrations", label: "Integrations", icon: Plug },
];

export interface SettingsWorkspaceProps {
  initialSection?: SettingsSectionId;
  initialAccount: AccountDetails;
  initialDiagnostics: OperationalDiagnostics;
  integrationCoverage: IntegrationSnapshotCoverage;
}

function MiniThemePreview({ theme }: { theme: "night" | "day" }) {
  return (
    <div
      data-theme={theme}
      aria-hidden="true"
      className="pointer-events-none flex aspect-[16/10] w-full overflow-hidden rounded-ctl border border-edge bg-base"
    >
      <div className="flex w-[24%] flex-col gap-1.5 border-r border-line bg-surface p-1.5">
        <Mark size={12} />
        <div className="grid grid-cols-5 gap-0.5">
          {Array.from({ length: 20 }, (_, i) => (
            <span
              key={i}
              className="aspect-square rounded-[1px]"
              style={{
                background:
                  i % 7 === 0
                    ? "var(--ph-ship)"
                    : i % 5 === 0
                      ? "var(--ph-build)"
                      : "var(--border-default)",
              }}
            />
          ))}
        </div>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block h-1 rounded-[1px]"
            style={{
              width: `${82 - i * 14}%`,
              background: i === 0 ? "var(--sodium)" : "var(--border-default)",
            }}
          />
        ))}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-2">
        <span className="block h-1.5 w-1/2 rounded-[1px] bg-fg" />
        <div className="grid flex-1 grid-cols-[7fr_5fr] gap-1.5">
          <div className="grid grid-cols-5 gap-0.5 rounded-[3px] border border-line bg-surface p-1.5">
            {Array.from({ length: 25 }, (_, i) => (
              <span
                key={i}
                className="rounded-[1px]"
                style={{
                  background:
                    i % 6 === 0
                      ? "var(--ph-ship)"
                      : i === 11
                        ? "var(--ph-break)"
                        : "var(--neutral-cell)",
                }}
              />
            ))}
          </div>
          <div className="flex flex-col gap-1 rounded-[3px] border border-line bg-surface p-1.5">
            {[
              "var(--ph-break)",
              "var(--warn)",
              "var(--ph-ship)",
              "var(--ph-explore)",
            ].map((c, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className="h-1 w-1 rounded-[1px]" style={{ background: c }} />
                <span className="h-1 flex-1 rounded-[1px] bg-edge" />
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const emptySubscribe = () => () => {};

function useMounted() {
  return React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

export function SettingsWorkspace({
  initialSection = "profile",
  initialAccount,
  initialDiagnostics,
  integrationCoverage,
}: SettingsWorkspaceProps) {
  const router = useRouter();
  const mounted = useMounted();
  const { theme, resolvedTheme, setTheme } = useTheme();

  const [section, setSection] = React.useState<SettingsSectionId>(initialSection);
  const [prevInitialSection, setPrevInitialSection] =
    React.useState<SettingsSectionId>(initialSection);
  if (prevInitialSection !== initialSection) {
    setPrevInitialSection(initialSection);
    setSection(initialSection);
  }
  const [account, setAccount] = React.useState<AccountDetails>(initialAccount);

  const switchSection = (next: SettingsSectionId) => {
    setSection(next);
    const params = new URLSearchParams(window.location.search);
    params.set("section", next);
    router.replace(`/settings?${params.toString()}`, { scroll: false });
  };

  // Profile state
  const [nameInput, setNameInput] = React.useState(initialAccount.name);
  const [profileSaving, setProfileSaving] = React.useState(false);
  const [profileFeedback, setProfileFeedback] = React.useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  // Local workspace preferences via external store subscription
  const prefs = React.useSyncExternalStore(
    subscribeWorkspacePreferences,
    loadWorkspacePreferences,
    () => DEFAULT_WORKSPACE_PREFERENCES,
  );
  const [prefsStatus, setPrefsStatus] = React.useState<string | null>(null);

  // Theme DOM synchronization
  const applyThemeSelection = (nextTheme: "dark" | "light" | "system") => {
    setTheme(nextTheme);
    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) {
      meta.setAttribute(
        "content",
        nextTheme === "light" ? "light" : nextTheme === "dark" ? "dark" : "light dark",
      );
    }
    if (nextTheme === "light" || nextTheme === "dark") {
      document.documentElement.setAttribute(
        "data-theme",
        nextTheme === "light" ? "day" : "night",
      );
    }
  };

  const updatePref = (patch: Partial<WorkspacePreferences>, message: string) => {
    const result = saveWorkspacePreferences(patch);
    setPrefsStatus(
      result.persisted
        ? message
        : `${message} (browser storage disabled — active for current tab only).`,
    );
  };

  // Profile save handler
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (trimmed.length < 2) {
      setProfileFeedback({
        kind: "error",
        text: "Display name must be at least 2 characters.",
      });
      return;
    }

    setProfileSaving(true);
    setProfileFeedback(null);

    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });

      const json = (await res.json().catch(() => ({}))) as {
        profile?: AccountDetails;
        error?: string;
      };
      if (!res.ok) {
        setProfileFeedback({
          kind: "error",
          text: json.error ?? "Unable to save display name.",
        });
        return;
      }

      if (json.profile) {
        setAccount(json.profile);
        setNameInput(json.profile.name);
      }
      window.dispatchEvent(new CustomEvent("devspace:auth-changed"));
      router.refresh();
      setProfileFeedback({
        kind: "success",
        text: "Display name saved and session refreshed.",
      });
    } catch {
      setProfileFeedback({
        kind: "error",
        text: "Network error while saving profile.",
      });
    } finally {
      setProfileSaving(false);
    }
  };

  // Sign-out dialog state
  const [signOutConfirmOpen, setSignOutConfirmOpen] = React.useState(false);
  const [signingOut, setSigningOut] = React.useState(false);
  const [signOutError, setSignOutError] = React.useState<string | null>(null);

  const handleSignOut = async () => {
    setSigningOut(true);
    setSignOutError(null);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) {
        setSignOutError("Unable to terminate session.");
        setSigningOut(false);
        return;
      }
      window.dispatchEvent(new CustomEvent("devspace:auth-changed"));
      router.push("/login");
      router.refresh();
    } catch {
      setSignOutError("Network error while signing out.");
      setSigningOut(false);
    }
  };

  const initials = account.name
    ? account.name
        .split(" ")
        .map((x) => x[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : (account.email[0]?.toUpperCase() ?? "AD");

  const activeTheme = mounted ? (theme ?? "dark") : "dark";
  const resolvedLabel =
    mounted && resolvedTheme === "light"
      ? "Currently Day Shift"
      : "Currently Night Shift";

  return (
    <div className="mx-auto w-full max-w-[1440px] px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
      <header className="mb-5 border-b border-line pb-5">
        <h1 className="display text-2xl leading-tight text-fg sm:text-3xl">Settings</h1>
        <p className="mt-1 text-xs text-fg2 sm:text-sm">
          Account profile, theme engine, workstation defaults, security posture, and
          provider integrations.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[210px_minmax(0,1fr)]">
        {/* Mobile section tabs */}
        <div className="md:hidden">
          <Tabs<SettingsSectionId>
            label="Settings sections"
            scroll
            value={section}
            onChange={switchSection}
            tabs={SECTIONS.map((s) => ({ id: s.id, label: s.label }))}
          />
        </div>

        {/* Desktop vertical navigation */}
        <nav aria-label="Settings sections" className="hidden md:block">
          <ul className="sticky top-16 flex flex-col gap-0.5">
            {SECTIONS.map((item) => {
              const active = item.id === section;
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    aria-current={active ? "page" : undefined}
                    onClick={() => switchSection(item.id)}
                    className={cx(
                      "relative flex h-9 w-full items-center gap-2.5 rounded-ctl px-3 text-left text-sm transition-colors duration-[120ms]",
                      active
                        ? "bg-elevated font-medium text-fg"
                        : "text-fg2 hover:bg-[color-mix(in_srgb,var(--bg-elevated)_60%,transparent)] hover:text-fg",
                    )}
                  >
                    {active && (
                      <span
                        aria-hidden="true"
                        className="absolute inset-y-1.5 left-0 w-0.5 rounded-r-[1px] bg-sodium"
                      />
                    )}
                    <Icon
                      size={15}
                      strokeWidth={1.5}
                      className="shrink-0"
                      aria-hidden="true"
                    />
                    <span className="truncate">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Active Section Body */}
        <div className="min-w-0 max-w-[780px]">
          {/* SECTION: PROFILE */}
          {section === "profile" && (
            <form
              onSubmit={handleSaveProfile}
              noValidate
              aria-labelledby="settings-profile-heading"
              className="rounded-panel border border-line bg-surface"
            >
              <header className="border-b border-line px-5 py-3.5">
                <h2
                  id="settings-profile-heading"
                  className="text-base font-semibold text-fg"
                >
                  Account Profile
                </h2>
                <p className="mt-0.5 text-xs text-fg2">
                  Persisted account details isolated to your developer workspace.
                </p>
              </header>

              <div className="space-y-5 p-5">
                {profileFeedback && (
                  <div role="status">
                    {profileFeedback.kind === "error" ? (
                      <ErrorBanner>{profileFeedback.text}</ErrorBanner>
                    ) : (
                      <div className="flex items-center gap-2 rounded-ctl border border-ship/40 bg-ship/10 px-3 py-2 text-xs text-ship">
                        <CheckCircle2 size={14} aria-hidden="true" />
                        <span>{profileFeedback.text}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-4">
                  <span
                    aria-hidden="true"
                    className="display-num inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-ctl border border-edge bg-inset text-lg text-sodium-text"
                  >
                    {initials}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-fg">{account.name}</p>
                      <span
                        className={cx(
                          "inline-flex items-center rounded-cell border px-1.5 py-0.5 font-mono text-[11px]",
                          account.role === "owner"
                            ? "border-sodium/40 bg-sodium/10 text-sodium-text"
                            : "border-edge bg-inset text-fg2",
                        )}
                      >
                        {account.role === "owner" ? "Owner" : "Developer"}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate font-mono text-2xs text-fg3">
                      {account.email}
                    </p>
                    {account.createdAt && (
                      <p className="mt-0.5 text-2xs text-fg3">
                        Account created {formatDate(account.createdAt)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Display name"
                    name="name"
                    autoComplete="name"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    hint="Visible in your sidebar account card and greeting."
                    error={
                      nameInput.trim().length > 0 && nameInput.trim().length < 2
                        ? "Enter at least 2 characters."
                        : undefined
                    }
                  />
                  <Field
                    label="Email address (read-only)"
                    type="email"
                    value={account.email}
                    readOnly
                    disabled
                    hint="Bound to authentication identity."
                  />
                </div>

                <p className="rounded-ctl border border-dashed border-edge bg-inset px-3 py-2 text-2xs text-fg3">
                  Role assignments ({account.role}) and internal user identifiers are
                  server-protected and cannot be modified from client settings.
                </p>
              </div>

              <footer className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">
                <Button
                  type="submit"
                  variant="primary"
                  loading={profileSaving}
                  disabled={
                    profileSaving ||
                    nameInput.trim().length < 2 ||
                    nameInput.trim() === account.name
                  }
                >
                  Save profile
                </Button>
              </footer>
            </form>
          )}

          {/* SECTION: APPEARANCE */}
          {section === "appearance" && (
            <div className="space-y-5">
              <section className="rounded-panel border border-line bg-surface">
                <header className="border-b border-line px-5 py-3.5">
                  <h2 className="text-base font-semibold text-fg">Theme Engine</h2>
                  <p className="mt-0.5 text-xs text-fg2">
                    Powered by a single synchronized Next-Themes provider across Night
                    Shift, Day Shift, and OS preference.
                  </p>
                </header>
                <div className="p-5">
                  <div
                    role="radiogroup"
                    aria-label="Theme preference"
                    className="grid gap-3 sm:grid-cols-3"
                  >
                    {(
                      [
                        {
                          id: "dark" as const,
                          label: "Night Shift",
                          desc: "Graphite dark surface (default)",
                        },
                        {
                          id: "light" as const,
                          label: "Day Shift",
                          desc: "Warm cement surface for bright rooms",
                        },
                        {
                          id: "system" as const,
                          label: "System",
                          desc: resolvedLabel,
                        },
                      ] as const
                    ).map((opt) => {
                      const active = activeTheme === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => applyThemeSelection(opt.id)}
                          className={cx(
                            "rounded-panel border p-2.5 text-left transition-colors duration-[120ms]",
                            active
                              ? "border-sodium shadow-[0_0_0_1px_var(--sodium)]"
                              : "border-line hover:border-edge",
                          )}
                        >
                          {opt.id === "system" ? (
                            <div className="grid grid-cols-2 gap-1">
                              <MiniThemePreview theme="night" />
                              <MiniThemePreview theme="day" />
                            </div>
                          ) : (
                            <MiniThemePreview
                              theme={opt.id === "light" ? "day" : "night"}
                            />
                          )}
                          <span className="mt-2.5 flex items-center justify-between px-0.5">
                            <span>
                              <span className="block text-sm font-medium text-fg">
                                {opt.label}
                              </span>
                              <span className="block text-2xs text-fg3">{opt.desc}</span>
                            </span>
                            <span
                              className={cx(
                                "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                                active ? "border-sodium" : "border-edge",
                              )}
                            >
                              {active && (
                                <span className="h-2 w-2 rounded-full bg-sodium" />
                              )}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>

              <section className="rounded-panel border border-line bg-surface">
                <header className="border-b border-line px-5 py-3.5">
                  <h2 className="text-base font-semibold text-fg">
                    Density &amp; Motion
                  </h2>
                  <p className="mt-0.5 text-xs text-fg2">
                    Saved locally per browser and applied immediately across the shell.
                  </p>
                </header>
                <div className="space-y-5 p-5">
                  <div className="space-y-2.5">
                    <p className="text-xs font-medium text-fg2">Information density</p>
                    <Radio
                      name="density"
                      checked={prefs.density === "comfortable"}
                      onChange={() =>
                        updatePref(
                          { density: "comfortable" satisfies DensityPreference },
                          "Comfortable density enabled.",
                        )
                      }
                      label="Comfortable"
                      desc="Balanced row spacing for workstation inspection."
                    />
                    <Radio
                      name="density"
                      checked={prefs.density === "compact"}
                      onChange={() =>
                        updatePref(
                          { density: "compact" satisfies DensityPreference },
                          "Compact density enabled.",
                        )
                      }
                      label="Compact"
                      desc="Tighter row rhythm for rapid log and repository scanning."
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4 border-t border-line pt-4">
                    <div>
                      <p className="text-sm font-medium text-fg">Reduce motion</p>
                      <p className="max-w-[54ch] text-xs text-fg3">
                        Disables panel fades, drawer transitions, and animation delays.
                        Your OS <code className="font-mono">prefers-reduced-motion</code>{" "}
                        setting is always honored.
                      </p>
                    </div>
                    <Switch
                      checked={prefs.reduceMotion === "reduce"}
                      label="Reduce motion"
                      onChange={(checked) =>
                        updatePref(
                          { reduceMotion: checked ? "reduce" : "system" },
                          checked
                            ? "Reduced motion enabled."
                            : "Following system motion preference.",
                        )
                      }
                    />
                  </div>

                  {prefsStatus && (
                    <p role="status" className="text-2xs text-sodium-text">
                      {prefsStatus}
                    </p>
                  )}
                </div>
              </section>
            </div>
          )}

          {/* SECTION: WORKSPACE PREFERENCES */}
          {section === "workspace" && (
            <div className="space-y-5">
              <section className="rounded-panel border border-line bg-surface">
                <header className="border-b border-line px-5 py-3.5">
                  <h2 className="text-base font-semibold text-fg">
                    Workstation Defaults
                  </h2>
                  <p className="mt-0.5 text-xs text-fg2">
                    Restorable browser preferences applied when launching or opening the
                    Explorer without URL overrides.
                  </p>
                </header>

                <div className="space-y-5 p-5">
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="pref-landing-route"
                      className="text-2xs font-medium text-fg2"
                    >
                      Default post-login landing page
                    </label>
                    <select
                      id="pref-landing-route"
                      value={prefs.landingRoute}
                      onChange={(e) =>
                        updatePref(
                          { landingRoute: e.target.value as LandingRoute },
                          "Default post-login landing page updated.",
                        )
                      }
                      className="h-10 max-w-[320px] rounded-ctl border border-edge bg-inset px-3 text-sm text-fg focus-visible:border-sodium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sodium/40"
                    >
                      <option value="/dashboard">Overview (/dashboard)</option>
                      <option value="/projects">Project Explorer (/projects)</option>
                      <option value="/activity">Activity Center (/activity)</option>
                      <option value="/kanban">Roadmaps (/kanban)</option>
                    </select>
                    <p className="text-2xs text-fg3">
                      Used after signing in when no explicit redirect parameter is
                      present.
                    </p>
                  </div>

                  <div className="border-t border-line pt-4">
                    <p className="mb-2 text-2xs font-medium text-fg2">
                      Default Project Explorer presentation
                    </p>
                    <Segmented<"field" | "plates" | "list">
                      label="Default Project Explorer presentation"
                      value={prefs.explorerView}
                      onChange={(view) =>
                        updatePref(
                          { explorerView: view },
                          `Default Explorer presentation set to ${view}.`,
                        )
                      }
                      options={[
                        { id: "field", label: "Field" },
                        { id: "plates", label: "Plates" },
                        { id: "list", label: "List" },
                      ]}
                    />
                    <p className="mt-2 text-2xs text-fg3">
                      Applied on <code className="font-mono">/projects</code> unless
                      overridden by a <code className="font-mono">?view=</code> URL
                      parameter.
                    </p>
                  </div>

                  {prefsStatus && (
                    <p role="status" className="text-2xs text-sodium-text">
                      {prefsStatus}
                    </p>
                  )}
                </div>
              </section>

              <section className="rounded-panel border border-line bg-surface">
                <header className="border-b border-line px-5 py-3.5">
                  <h2 className="text-base font-semibold text-fg">
                    Canonical Schema &amp; Server-Managed Settings
                  </h2>
                </header>
                <div className="space-y-2 p-5 text-xs text-fg2">
                  <p>
                    Project numbering (<code className="font-mono">#001–#100</code>),
                    canonical categories, and owner privilege claims are enforced strictly
                    by the canonical repository registry and server policies, so
                    browser-only overrides for those structures are intentionally
                    unavailable.
                  </p>
                </div>
              </section>
            </div>
          )}

          {/* SECTION: ACCOUNT SECURITY */}
          {section === "security" && (
            <div className="space-y-5">
              <section className="rounded-panel border border-line bg-surface">
                <header className="border-b border-line px-5 py-3.5">
                  <h2 className="text-base font-semibold text-fg">
                    Authentication &amp; Session Posture
                  </h2>
                  <p className="mt-0.5 text-xs text-fg2">
                    Verified session status enforced via HttpOnly HMAC-SHA256 cookies and
                    server authorization checks.
                  </p>
                </header>

                <div className="space-y-4 p-5">
                  <dl className="grid gap-3 rounded-ctl border border-line bg-inset p-3.5 text-xs sm:grid-cols-2">
                    <div>
                      <dt className="text-2xs text-fg3">Authentication Method</dt>
                      <dd className="mt-0.5 font-medium text-fg">
                        {account.authProvider === "hybrid"
                          ? "Credentials + Google (Supabase OAuth)"
                          : account.authProvider === "oauth"
                            ? "Google (Supabase OAuth)"
                            : "Local Credentials (scrypt hash)"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-2xs text-fg3">Active Session State</dt>
                      <dd className="mt-0.5 flex items-center gap-1.5 font-medium text-ship">
                        <Lock size={12} aria-hidden="true" />
                        <span>Authenticated · HttpOnly session</span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-2xs text-fg3">Password Status</dt>
                      <dd className="mt-0.5 text-fg2">
                        {account.hasPassword
                          ? "Salted scrypt credential configured on server."
                          : "OAuth-managed identity (no local password set)."}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-2xs text-fg3">Authorization Tier</dt>
                      <dd className="mt-0.5 text-fg2">
                        {account.role === "owner"
                          ? "Owner (bootstrap-verified server privilege)"
                          : "Developer (isolated personal workspace)"}
                      </dd>
                    </div>
                  </dl>

                  <p className="text-2xs text-fg3">
                    In-app password rotation and self-service MFA device enrollment are
                    not exposed by the current authentication backend. Sign-in and owner
                    privilege reconciliation continue to validate provider-verified email
                    timestamps and server bootstrap tokens only.
                  </p>
                </div>
              </section>

              <section
                aria-labelledby="danger-zone-heading"
                className="rounded-panel border border-break/40 bg-surface"
              >
                <header className="border-b border-break/30 px-5 py-3.5">
                  <h2
                    id="danger-zone-heading"
                    className="text-base font-semibold text-break"
                  >
                    Session Control &amp; Workspace Safety
                  </h2>
                  <p className="mt-0.5 text-xs text-fg2">
                    Safely terminate your active browser session. Destructive account
                    deletion or workspace resets are restricted server-side.
                  </p>
                </header>
                <div className="flex flex-wrap items-center justify-between gap-4 p-5">
                  <div>
                    <p className="text-sm font-medium text-fg">Sign out of workstation</p>
                    <p className="text-2xs text-fg3">
                      Clears your HttpOnly session cookie and Supabase auth session if
                      active.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    icon={<LogOut size={14} />}
                    onClick={() => setSignOutConfirmOpen(true)}
                  >
                    Sign out
                  </Button>
                </div>
                {signOutError && (
                  <div className="px-5 pb-4">
                    <ErrorBanner>{signOutError}</ErrorBanner>
                  </div>
                )}
              </section>
            </div>
          )}

          {/* SECTION: INTEGRATIONS */}
          {section === "integrations" && (
            <IntegrationsSection
              initialDiagnostics={initialDiagnostics}
              coverage={integrationCoverage}
            />
          )}
        </div>
      </div>

      <Dialog
        open={signOutConfirmOpen}
        onClose={() => !signingOut && setSignOutConfirmOpen(false)}
        title="Sign out of Arman’s Devspace?"
        footer={
          <>
            <Button
              variant="secondary"
              disabled={signingOut}
              onClick={() => setSignOutConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" loading={signingOut} onClick={handleSignOut}>
              Sign out
            </Button>
          </>
        }
      >
        Your persisted projects, milestones, notes, and activity logs remain saved in the
        database. You will need to sign in again to access protected workspace routes.
      </Dialog>
    </div>
  );
}
