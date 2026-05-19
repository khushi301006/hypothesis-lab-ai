import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Beaker, Upload, FlaskConical, BookOpen, Trophy, BarChart3, Menu, X, Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const links = [
  { to: "/", label: "Home", icon: Beaker },
  { to: "/upload", label: "Upload Lab", icon: Upload },
  { to: "/workspace", label: "Workspace", icon: FlaskConical },
  { to: "/learn", label: "Learn", icon: BookOpen },
  { to: "/quiz", label: "Quiz Arena", icon: Trophy },
  { to: "/reports", label: "Reports", icon: BarChart3 },
];

export function Navbar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem("hlab.theme")) as
      | "dark" | "light" | null;
    const t = saved ?? "dark";
    setTheme(t);
    document.documentElement.classList.toggle("light", t === "light");
  }, []);

  function toggleTheme() {
    const t = theme === "dark" ? "light" : "dark";
    setTheme(t);
    document.documentElement.classList.toggle("light", t === "light");
    localStorage.setItem("hlab.theme", t);
  }

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-50 glass border-b border-border/60"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30">
            <FlaskConical className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-gradient text-lg tracking-tight">Hypothesis Lab</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.slice(1).map((l) => {
            const Icon = l.icon;
            const active = path === l.to || (l.to !== "/" && path.startsWith(l.to));
            return (
              <Link
                key={l.to}
                to={l.to}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-all",
                  active
                    ? "bg-primary/15 text-foreground shadow-inner"
                    : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 text-muted-foreground transition hover:bg-card/60 hover:text-foreground"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            className="rounded-lg p-2 md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border/60 px-4 py-2 md:hidden">
          {links.slice(1).map((l) => {
            const Icon = l.icon;
            return (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-card/60 hover:text-foreground"
              >
                <Icon className="h-4 w-4" /> {l.label}
              </Link>
            );
          })}
        </div>
      )}
    </motion.header>
  );
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid-bg">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
