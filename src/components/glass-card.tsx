import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function GlassCard({
  children, className, hover = true,
}: { children: React.ReactNode; className?: string; hover?: boolean }) {
  return (
    <motion.div
      whileHover={hover ? { y: -2, boxShadow: "0 20px 60px -20px oklch(0.5 0.22 285 / 0.5)" } : undefined}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={cn("glass rounded-2xl p-6", className)}
    >
      {children}
    </motion.div>
  );
}

export function StatNumber({ value, label, suffix }: { value: number | string; label: string; suffix?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-3xl font-bold text-gradient tabular-nums">
        {value}{suffix}
      </div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
