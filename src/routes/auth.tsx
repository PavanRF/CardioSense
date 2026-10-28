import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ArrowLeft, Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import "@lovable.dev/cloud-auth-js/styles.css";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import { BrandMark } from "@/components/brand-mark";
import { PublicShell } from "@/components/public-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { safeRedirect, useAuth } from "@/hooks/use-auth";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { isValidEmail, passwordIssues } from "@/lib/password";
import { cn } from "@/lib/utils";

type Mode = "signin" | "signup" | "forgot";
type Search = { mode?: Mode; redirect?: string };
const POST_AUTH_KEY = "cardiosense.postAuth";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): Search => {
    const out: Search = {};
    if (s["mode"] === "signup" || s["mode"] === "forgot" || s["mode"] === "signin") out.mode = s["mode"];
    const r = safeRedirect(s["redirect"]);
    if (r) out.redirect = r;
    return out;
  },
  head: () => ({
    meta: [
      { title: "Sign in — CardioSense" },
      { name: "description", content: "Sign in or create a CardioSense account to run heart disease model predictions." },
      { property: "og:title", content: "Sign in — CardioSense" },
      { property: "og:description", content: "Access the CardioSense research prototype." },
    ],
  }),
  component: AuthPage,
});

function friendlyError(t: ReturnType<typeof useI18n>["t"], message: string) {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return t("auth.err.invalid");
  if (m.includes("not confirmed")) return t("auth.err.unconfirmed");
  if (m.includes("already registered") || m.includes("already been registered")) return t("auth.err.exists");
  if (m.includes("rate") || m.includes("too many")) return t("auth.err.rate");
  if (m.includes("pwned") || m.includes("leaked") || m.includes("weak")) return t("auth.err.weak");
  return t("auth.err.generic");
}

function Field({ id, label, error, children, extra }: { id: string; label: string; error?: string | undefined; children: ReactNode; extra?: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        {extra}
      </div>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="flex items-center gap-1.5 text-xs font-medium text-destructive">
          <AlertCircle className="h-3.5 w-3.5" /> {error}
        </p>
      )}
    </div>
  );
}

function AuthPage() {
  const { t } = useI18n();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const mode: Mode = search.mode ?? "signin";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [terms, setTerms] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState<null | "signup" | "forgot">(null);

  // Already signed in (including after an OAuth round-trip) → go to the intended page.
  useEffect(() => {
    if (loading || !user) return;
    const stored = safeRedirect(window.sessionStorage.getItem(POST_AUTH_KEY));
    window.sessionStorage.removeItem(POST_AUTH_KEY);
    void navigate({ to: search.redirect ?? stored ?? "/dashboard", replace: true });
  }, [user, loading, navigate, search.redirect]);

  const switchMode = (m: Mode) => {
    setSubmitted(false);
    setFormError(null);
    setDone(null);
    void navigate({ to: "/auth", search: { ...search, mode: m }, replace: true });
  };

  const issues = passwordIssues(password);
  const errors = {
    name: mode === "signup" && name.trim().length === 0 ? t("validation.required") : name.length > 80 ? t("auth.err.nameLong") : undefined,
    email: !isValidEmail(email) ? t("auth.err.email") : undefined,
    password:
      mode === "forgot"
        ? undefined
        : password.length === 0
          ? t("validation.required")
          : mode === "signup" && issues.length > 0
            ? t("auth.pwRules")
            : undefined,
    confirm: mode === "signup" && confirm !== password ? t("auth.err.mismatch") : undefined,
    terms: mode === "signup" && !terms ? t("auth.err.terms") : undefined,
  };
  const relevant = mode === "signin" ? [errors.email, errors.password] : mode === "forgot" ? [errors.email] : Object.values(errors);
  const hasErrors = relevant.some(Boolean);
  const show = (e: string | undefined) => (submitted ? e : undefined);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setFormError(null);
    if (hasErrors || busy) return;
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin + "/auth", data: { display_name: name.trim() } },
        });
        if (error) throw error;
        setDone("signup");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        setDone("forgot");
      }
    } catch (err) {
      setFormError(friendlyError(t, err instanceof Error ? err.message : ""));
    } finally {
      setBusy(false);
    }
  };

  const oauth = async (provider: "google" | "lovable") => {
    setFormError(null);
    if (search.redirect) window.sessionStorage.setItem(POST_AUTH_KEY, search.redirect);
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: `${window.location.origin}/auth` });
    if (result.error) setFormError(t("auth.err.generic"));
  };

  const title = mode === "signup" ? t("auth.signupTitle") : mode === "forgot" ? t("auth.forgotTitle") : t("auth.signinTitle");
  const subtitle = mode === "signup" ? t("auth.signupSubtitle") : mode === "forgot" ? t("auth.forgotSubtitle") : t("auth.signinSubtitle");

  return (
    <PublicShell hideAuthCta>
      <div className="mx-auto flex max-w-md flex-col px-4 py-12 sm:py-16">
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandMark className="h-11 w-11" />
          <h1 className="mt-4 font-display text-2xl font-semibold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-lift">
          <AnimatePresence mode="wait" initial={false}>
            {done ? (
              <motion.div key="done" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="py-4 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
                  <MailCheck className="h-6 w-6" />
                </span>
                <h2 className="mt-4 font-semibold">{t("auth.checkEmail")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {done === "signup" ? t("auth.signupDone", { email: email.trim() }) : t("auth.forgotDone", { email: email.trim() })}
                </p>
                <Button variant="outline" className="mt-6 gap-2" onClick={() => switchMode("signin")}>
                  <ArrowLeft className="h-4 w-4" /> {t("auth.backToSignin")}
                </Button>
              </motion.div>
            ) : (
              <motion.div key={mode} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                {mode !== "forgot" && (
                  <>
                    <div className="grid gap-2">
                      <Button type="button" variant="outline" className="h-10 gap-2" onClick={() => void oauth("google")}>
                        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                          <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.3 6.6 2.3 12s4.3 9.8 9.7 9.8c5.6 0 9.3-3.9 9.3-9.5 0-.6-.1-1.1-.2-1.6H12z" />
                        </svg>
                        {t("auth.google")}
                      </Button>
                    </div>
                    <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="h-px flex-1 bg-border" /> {t("auth.or")} <span className="h-px flex-1 bg-border" />
                    </div>
                  </>
                )}

                <form onSubmit={onSubmit} noValidate className="space-y-4">
                  {mode === "signup" && (
                    <Field id="name" label={t("auth.name")} error={show(errors.name)}>
                      <Input id="name" autoComplete="name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} aria-invalid={!!show(errors.name)} />
                    </Field>
                  )}
                  <Field id="email" label={t("auth.email")} error={show(errors.email)}>
                    <Input id="email" type="email" autoComplete="email" value={email} maxLength={255} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!show(errors.email)} />
                  </Field>
                  {mode !== "forgot" && (
                    <Field
                      id="password"
                      label={t("auth.password")}
                      error={show(errors.password)}
                      extra={
                        mode === "signin" ? (
                          <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => switchMode("forgot")}>
                            {t("auth.forgot")}
                          </button>
                        ) : undefined
                      }
                    >
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPw ? "text" : "password"}
                          autoComplete={mode === "signup" ? "new-password" : "current-password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pr-10"
                          aria-invalid={!!show(errors.password)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw((v) => !v)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                          aria-label={showPw ? t("auth.hidePw") : t("auth.showPw")}
                        >
                          {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {mode === "signup" && (
                        <ul className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
                          {(["length", "letter", "number"] as const).map((r) => (
                            <li key={r} className={cn("rounded-full px-2 py-0.5", issues.includes(r) ? "bg-muted text-muted-foreground" : "bg-success/15 text-success")}>
                              {t(`auth.rule.${r}`)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </Field>
                  )}
                  {mode === "signup" && (
                    <>
                      <Field id="confirm" label={t("auth.confirm")} error={show(errors.confirm)}>
                        <Input id="confirm" type={showPw ? "text" : "password"} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-invalid={!!show(errors.confirm)} />
                      </Field>
                      <div className="space-y-1.5">
                        <label className="flex items-start gap-2.5 text-sm leading-snug">
                          <Checkbox checked={terms} onCheckedChange={(v) => setTerms(v === true)} className="mt-0.5" aria-invalid={!!show(errors.terms)} />
                          <span className="text-muted-foreground">{t("auth.terms")}</span>
                        </label>
                        {show(errors.terms) && <p className="text-xs font-medium text-destructive">{errors.terms}</p>}
                      </div>
                    </>
                  )}

                  {formError && (
                    <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {formError}
                    </div>
                  )}

                  <Button type="submit" className="h-10 w-full gap-2" disabled={busy}>
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                    {mode === "signup" ? t("auth.createAccount") : mode === "forgot" ? t("auth.sendReset") : t("auth.signIn")}
                  </Button>
                </form>

                <p className="mt-5 text-center text-sm text-muted-foreground">
                  {mode === "signin" ? (
                    <>
                      {t("auth.noAccount")}{" "}
                      <button type="button" className="font-medium text-primary hover:underline" onClick={() => switchMode("signup")}>
                        {t("auth.createAccount")}
                      </button>
                    </>
                  ) : (
                    <>
                      {mode === "signup" ? t("auth.haveAccount") : null}{" "}
                      <button type="button" className="font-medium text-primary hover:underline" onClick={() => switchMode("signin")}>
                        {mode === "signup" ? t("auth.signIn") : t("auth.backToSignin")}
                      </button>
                    </>
                  )}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:underline">
            ← CardioSense
          </Link>
        </p>
      </div>
    </PublicShell>
  );
}
