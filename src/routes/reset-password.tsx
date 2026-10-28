import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { PublicShell } from "@/components/public-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { passwordIssues } from "@/lib/password";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — CardioSense" },
      { name: "description", content: "Choose a new password for your CardioSense account." },
      { property: "og:title", content: "Reset password — CardioSense" },
      { property: "og:description", content: "Choose a new password for your CardioSense account." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [ready, setReady] = useState<"checking" | "ok" | "invalid">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const isRecovery = window.location.hash.includes("type=recovery");
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady("ok");
    });
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setReady(session || isRecovery ? "ok" : "invalid");
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const issues = passwordIssues(password);
  const pwError = password.length === 0 ? t("validation.required") : issues.length ? t("auth.pwRules") : undefined;
  const confirmError = confirm !== password ? t("auth.err.mismatch") : undefined;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setError(null);
    if (pwError || confirmError || busy) return;
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) {
      setError(t("auth.err.generic"));
      return;
    }
    toast.success(t("auth.resetDone"));
    void navigate({ to: "/dashboard", replace: true });
  };

  return (
    <PublicShell hideAuthCta>
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-center font-display text-2xl font-semibold">{t("auth.resetTitle")}</h1>
        <div className="mt-6 rounded-2xl border bg-card p-6 shadow-lift">
          {ready === "checking" ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : ready === "invalid" ? (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">{t("auth.resetInvalid")}</p>
              <Button asChild className="mt-4">
                <Link to="/auth" search={{ mode: "forgot" }}>
                  {t("auth.sendReset")}
                </Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-password">{t("auth.newPassword")}</Label>
                <Input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                {submitted && pwError && <p className="text-xs font-medium text-destructive">{pwError}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">{t("auth.confirm")}</Label>
                <Input id="confirm-password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                {submitted && confirmError && <p className="text-xs font-medium text-destructive">{confirmError}</p>}
              </div>
              {error && (
                <p role="alert" className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" /> {error}
                </p>
              )}
              <Button type="submit" className="w-full gap-2" disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {t("auth.savePassword")}
              </Button>
            </form>
          )}
        </div>
      </div>
    </PublicShell>
  );
}
