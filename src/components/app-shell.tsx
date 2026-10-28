import { Link, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Activity, BarChart3, Database, FileSpreadsheet, Languages, LayoutDashboard, LogOut, Menu, Moon, Settings, ShieldAlert, Sun, UserRound } from "lucide-react";
import { useState, type ReactNode } from "react";

import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth, useProfile, useSignOut } from "@/hooks/use-auth";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { LANGUAGES, useI18n, type MessageKey } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const NAV: {
  to: "/dashboard" | "/predict" | "/batch" | "/performance" | "/dataset" | "/settings";
  key: MessageKey;
  icon: typeof Activity;
}[] = [
  { to: "/dashboard", key: "nav.overview", icon: LayoutDashboard },
  { to: "/predict", key: "nav.predict", icon: Activity },
  { to: "/batch", key: "nav.batch", icon: FileSpreadsheet },
  { to: "/performance", key: "nav.performance", icon: BarChart3 },
  { to: "/dataset", key: "nav.dataset", icon: Database },
  { to: "/settings", key: "nav.settings", icon: Settings },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-col gap-1" aria-label="Main">
      {NAV.map((item) => {
        const active = pathname.startsWith(item.to);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId="nav-active"
                className="absolute inset-0 rounded-lg bg-sidebar-accent"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
            {active && <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-sidebar-primary" />}
            <Icon className="relative h-4 w-4" />
            <span className="relative">{t(item.key)}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex h-full flex-col gap-8 p-5">
      <Link to="/dashboard" onClick={onNavigate} className="flex items-center gap-3">
        <BrandMark />
        <div>
          <div className="font-display text-lg font-semibold text-sidebar-accent-foreground">CardioSense</div>
          <div className="text-[11px] leading-tight text-sidebar-foreground/70">{t("brand.tagline")}</div>
        </div>
      </Link>
      <NavLinks {...(onNavigate ? { onNavigate } : {})} />
      <div className="mt-auto rounded-xl border border-sidebar-border bg-sidebar-accent/50 p-4 text-xs leading-relaxed text-sidebar-foreground">
        <div className="mb-1.5 flex items-center gap-2 font-semibold text-sidebar-accent-foreground">
          <ShieldAlert className="h-4 w-4 text-sidebar-primary" />
          {t("disclaimer.title")}
        </div>
        {t("disclaimer.short")}
      </div>
    </div>
  );
}

export function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();
  const current = LANGUAGES.find((l) => l.code === lang);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" aria-label={t("header.language")}>
          <Languages className="h-4 w-4" />
          <span className="font-semibold">{current?.short}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LANGUAGES.map((l) => (
          <DropdownMenuItem key={l.code} onSelect={() => setLang(l.code)} className={cn(l.code === lang && "font-semibold text-primary")}>
            <span className="w-7 text-xs text-muted-foreground">{l.short}</span>
            {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const { t } = useI18n();
  return (
    <Button variant="outline" size="icon" className="h-9 w-9" onClick={toggle} aria-label={t("header.theme")}>
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

function UserMenu() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const signOut = useSignOut();
  const name = profile?.display_name || user?.email?.split("@")[0] || "";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" aria-label={t("user.menu")}>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold uppercase text-primary-foreground">
            {name.slice(0, 1) || <UserRound className="h-3 w-3" />}
          </span>
          <span className="hidden max-w-[10rem] truncate md:inline">{name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="truncate text-sm font-medium">{name}</div>
          <div className="truncate text-xs text-muted-foreground">{user?.email}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/settings">
            <Settings className="h-4 w-4" /> {t("nav.settings")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void signOut()}>
          <LogOut className="h-4 w-4" /> {t("user.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const reduce = useReducedMotion();

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-sidebar lg:block">
        <SidebarContent />
      </aside>

      <div className="flex min-h-screen flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur sm:px-6">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t("header.menu")}>
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 border-none bg-sidebar p-0">
              <SheetTitle className="sr-only">CardioSense</SheetTitle>
              <SidebarContent onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <Link to="/dashboard" className="flex items-center gap-2 lg:hidden">
            <BrandMark className="h-8 w-8" />
            <span className="font-display font-semibold">CardioSense</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground sm:inline-flex">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
              {t("header.engine")}
            </span>
            <LanguageSwitcher />
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>

        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 1 } : { opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="mx-auto max-w-7xl"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        <footer className="border-t bg-card/60 px-4 py-4 sm:px-6 lg:px-10">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
              {t("disclaimer.full")}
            </p>
            <p className="shrink-0 sm:pl-6">{t("footer.data")}</p>
          </div>
        </footer>
      </div>
    </div>
  );
}

export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow: string; title: string; subtitle: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary [:lang(hi)_&]:tracking-normal">{eyebrow}</div>
        <h1 className="font-display text-3xl font-semibold text-foreground sm:text-4xl">{title}</h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">{subtitle}</p>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
