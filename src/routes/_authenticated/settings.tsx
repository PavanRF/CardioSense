import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { KeyRound, Loader2, LogOut, Lock, Palette, UserRound } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth, useProfile, useSignOut } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { LANGUAGES, useI18n } from "@/lib/i18n";
import { passwordIssues } from "@/lib/password";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — CardioSense" },
      { name: "description", content: "Manage your CardioSense profile, language, theme and password." },
      { property: "og:title", content: "Settings — CardioSense" },
      { property: "og:description", content: "Account and preference settings." },
    ],
  }),
  component: SettingsPage,
});

function Card({ icon: Icon, title, children }: { icon: typeof UserRound; title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-card sm:p-6">
      <h2 className="mb-5 flex items-center gap-2 font-display text-base font-semibold">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Icon className="h-4 w-4" />
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function SettingsPage() {
  const { t, lang, setLang } = useI18n();
  const { theme, toggle } = useTheme();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const signOut = useSignOut();

  const [name, setName] = useState("");
  useEffect(() => setName(profile?.display_name ?? ""), [profile?.display_name]);
  const nameError = name.trim().length === 0 ? t("validation.required") : name.length > 80 ? t("auth.err.nameLong") : null;

  const saveProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").upsert({ id: user!.id, display_name: name.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("settings.saved"));
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: () => toast.error(t("auth.err.generic")),
  });

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [pwSubmitted, setPwSubmitted] = useState(false);
  const pwError = next.length === 0 ? t("validation.required") : passwordIssues(next).length ? t("auth.pwRules") : null;
  const changePw = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.updateUser({ password: next, current_password: current } as { password: string });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("settings.pwUpdated"));
      setCurrent("");
      setNext("");
      setPwSubmitted(false);
    },
    onError: (e) => toast.error(/current|reauth|invalid/i.test(e instanceof Error ? e.message : "") ? t("settings.err.current") : t("auth.err.generic")),
  });

  const onPw = (e: FormEvent) => {
    e.preventDefault();
    setPwSubmitted(true);
    if (pwError || !current || changePw.isPending) return;
    changePw.mutate();
  };

  return (
    <>
      <PageHeader eyebrow={t("settings.eyebrow")} title={t("settings.title")} subtitle={t("settings.subtitle")} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card icon={UserRound} title={t("settings.profile")}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!nameError && !saveProfile.isPending) saveProfile.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="display-name">{t("auth.name")}</Label>
              <Input id="display-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} aria-invalid={!!nameError} />
              {nameError && <p className="text-xs font-medium text-destructive">{nameError}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="account-email">{t("auth.email")}</Label>
              <Input id="account-email" value={user?.email ?? ""} disabled />
            </div>
            <Button type="submit" disabled={!!nameError || saveProfile.isPending} className="gap-2">
              {saveProfile.isPending && <Loader2 className="h-4 w-4 animate-spin" />} {t("settings.save")}
            </Button>
          </form>
        </Card>

        <Card icon={Palette} title={t("settings.prefs")}>
          <div className="space-y-5">
            <div>
              <div className="mb-2 text-sm font-medium">{t("header.language")}</div>
              <div className="inline-flex gap-1 rounded-lg bg-muted p-1">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    aria-pressed={l.code === lang}
                    onClick={() => setLang(l.code)}
                    className={cn("rounded-md px-3 py-1.5 text-sm font-medium transition-all", l.code === lang ? "bg-card shadow-card" : "text-muted-foreground hover:text-foreground")}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium">{t("settings.theme")}</span>
              <Switch checked={theme === "dark"} onCheckedChange={toggle} />
            </label>
          </div>
        </Card>

        <Card icon={KeyRound} title={t("settings.password")}>
          <form onSubmit={onPw} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="current-password">{t("settings.current")}</Label>
              <Input id="current-password" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
              {pwSubmitted && !current && <p className="text-xs font-medium text-destructive">{t("validation.required")}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-pw">{t("auth.newPassword")}</Label>
              <Input id="new-pw" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
              {pwSubmitted && pwError && <p className="text-xs font-medium text-destructive">{pwError}</p>}
            </div>
            <Button type="submit" variant="secondary" disabled={changePw.isPending} className="gap-2">
              {changePw.isPending && <Loader2 className="h-4 w-4 animate-spin" />} {t("settings.updatePw")}
            </Button>
          </form>
        </Card>

        <Card icon={Lock} title={t("settings.privacy")}>
          <p className="text-sm leading-relaxed text-muted-foreground">{t("settings.privacyBody")}</p>
          <Button variant="outline" className="mt-5 gap-2" onClick={() => void signOut()}>
            <LogOut className="h-4 w-4" /> {t("user.signOut")}
          </Button>
        </Card>
      </div>
    </>
  );
}
