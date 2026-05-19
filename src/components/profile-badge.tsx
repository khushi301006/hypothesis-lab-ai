import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, TrendingUp } from "lucide-react";

/**
 * Floating profile badge (bottom-right). Click avatar to toggle a small
 * profile card showing the user's name and a "View profile" action.
 */
export function ProfileBadge() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  return (
    <div ref={ref} className="fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-2">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="glass flex items-center gap-3 rounded-2xl border border-border/60 bg-card/80 px-3 py-2 shadow-xl backdrop-blur-xl"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-semibold text-primary-foreground">
              KP
            </div>
            <div className="pr-1">
              <div className="text-sm font-semibold leading-tight">Khushi P</div>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <TrendingUp className="h-3 w-3" /> Hypothesis Lab
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="ml-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:opacity-90"
            >
              View profile
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Profile"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg shadow-primary/30 ring-2 ring-background transition hover:scale-105"
      >
        <User className="h-5 w-5" />
      </button>
    </div>
  );
}
