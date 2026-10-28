import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";

import { LanguageSwitcher, ThemeToggle } from "@/components/app-shell";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";

export function PublicShell({ children, hideAuthCta = false }: { children: ReactNode; hideAuthCta?: boolean }) {
  const { t } = useI18n();
  const { user, loading } = useAuth();
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <BrandMark />
            <span className="font-display text-lg font-semibold">CardioSense</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            {!hideAuthCta && !loading && (
              user ? (
                <Button asChild size="sm">
                  <Link to="/dashboard">{t("landing.openDashboard")}</Link>
                </Button>
              ) : (
                <Button asChild size="sm">
                  <Link to="/auth">{t("auth.signIn")}</Link>
                </Button>
              )
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t bg-card/60 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2">
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
            {t("disclaimer.full")}
          </p>
          <p className="shrink-0 sm:pl-6">{t("footer.data")}</p>
        </div>
      </footer>
    </div>
  );
}
