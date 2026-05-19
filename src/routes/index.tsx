import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Upload, Sparkles, BarChart3, FlaskConical, GraduationCap, Trophy, ArrowRight, Sigma, FunctionSquare, BookOpen, FileText, Brain } from "lucide-react";
import { PageShell } from "@/components/navbar";
import { GlassCard } from "@/components/glass-card";
import { AITutor } from "@/components/ai-tutor";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Hypothesis Lab — Learn Statistics Visually" },
      { name: "description", content: "Upload datasets, perform hypothesis tests, visualize p-values, and understand results with an AI statistics tutor." },
    ],
  }),
});

const FEATURES = [
  { icon: Upload, title: "Drag-and-drop datasets", body: "Upload CSV or XLSX files and instantly see column types, missing values and summary stats." },
  { icon: FlaskConical, title: "Hypothesis tests, ready-to-run", body: "t-tests, chi-square, ANOVA, Pearson & Spearman — all visualized." },
  { icon: BarChart3, title: "Interactive p-value visualizer", body: "Slide α between 0.01–0.10 and watch rejection regions update live." },
  { icon: GraduationCap, title: "AI Statistics Tutor", body: "Explains every result, generates viva questions and interview prep." },
  { icon: BookOpen, title: "Learning Hub", body: "Flashcards, concept cards and MCQs for the core concepts." },
  { icon: Trophy, title: "Gamified Quiz Arena", body: "XP, streaks and adaptive difficulty based on your dataset and mistakes." },
];

const TESTIMONIALS = [
  { name: "Priya, Statistics Student", quote: "The first time p-values actually clicked. The animated rejection region is gold." },
  { name: "Marcus, Data Analyst", quote: "I drop a CSV and have publishable analyses in two clicks. The AI explanations are clean." },
  { name: "Dr. Lena, Lecturer", quote: "My undergrads finally understand Type I vs Type II errors. I assign Quiz Arena weekly." },
];

const FLOATING_FORMULAS = [
  "t = (x̄ − μ) / (s/√n)",
  "χ² = Σ (O − E)² / E",
  "F = MSB / MSW",
  "r = Σ(x−x̄)(y−ȳ) / √…",
  "P(Type I) = α",
  "CI = x̄ ± t·SE",
];

function Landing() {
  return (
    <PageShell>
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl">
        <div className="pointer-events-none absolute inset-0 -z-10">
          {FLOATING_FORMULAS.map((f, i) => (
            <motion.span
              key={f}
              className="absolute font-mono text-xs text-primary/30"
              style={{ left: `${10 + i * 14}%`, top: `${20 + (i % 3) * 25}%` }}
              animate={{ y: [0, -12, 0], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 6 + i, repeat: Infinity, delay: i * 0.4 }}
            >
              {f}
            </motion.span>
          ))}
        </div>

        <div className="grid items-center gap-10 px-2 py-16 md:grid-cols-2 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/40 px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary" /> AI-powered interactive statistics lab
            </div>
            <h1 className="text-balance text-5xl font-bold tracking-tight md:text-6xl">
              Learn Statistics <span className="text-gradient">Visually.</span>
            </h1>
            <p className="mt-5 max-w-xl text-balance text-lg text-muted-foreground">
              Upload datasets, perform hypothesis tests, visualize p-values, and
              understand results using AI.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/workspace"
                className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-primary to-accent px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:shadow-primary/50"
              >
                Try Demo
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/upload"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/60 px-5 py-3 text-sm font-semibold transition hover:bg-card"
              >
                <Upload className="h-4 w-4" /> Upload Dataset
              </Link>
              <Link
                to="/learn"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/60 px-5 py-3 text-sm font-semibold transition hover:bg-card"
              >
                <BookOpen className="h-4 w-4" /> Learn Concepts
              </Link>
            </div>

            <div className="mt-10 grid max-w-md grid-cols-3 gap-4">
              {[{ k: "4+", v: "hypothesis tests" }, { k: "AI", v: "tutor mode" }, { k: "α", v: "live slider" }].map((s) => (
                <div key={s.v}>
                  <div className="text-2xl font-bold text-gradient">{s.k}</div>
                  <div className="text-xs text-muted-foreground">{s.v}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Animated demo card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <DemoChart />
          </motion.div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="mt-16">
        <h2 className="text-3xl font-bold tracking-tight">A full statistics lab in your browser</h2>
        <p className="mt-2 text-muted-foreground">Every feature animated, interactive, and explained.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <GlassCard>
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-accent/30 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <div className="text-base font-semibold">{f.title}</div>
                <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* DEMO STRIP */}
      <section className="mt-16 grid gap-4 md:grid-cols-3">
        {[
          { icon: Sigma, k: "Recommend", v: "The engine picks the right test from your columns." },
          { icon: FunctionSquare, k: "Visualize", v: "Animated rejection region & p-value shading." },
          { icon: Brain, k: "Explain", v: "AI tutor walks you through it, your level." },
        ].map((s) => (
          <GlassCard key={s.k}>
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-primary/15 p-2 text-primary"><s.icon className="h-5 w-5" /></div>
              <div>
                <div className="font-semibold">{s.k}</div>
                <p className="text-sm text-muted-foreground">{s.v}</p>
              </div>
            </div>
          </GlassCard>
        ))}
      </section>

      {/* TESTIMONIALS */}
      <section className="mt-16">
        <h2 className="text-3xl font-bold tracking-tight">Loved by students and analysts</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <GlassCard>
                <p className="text-sm leading-relaxed">"{t.quote}"</p>
                <div className="mt-4 text-xs uppercase tracking-wider text-muted-foreground">{t.name}</div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mt-20 mb-12">
        <GlassCard className="text-center p-10">
          <FileText className="mx-auto mb-3 h-8 w-8 text-primary" />
          <h3 className="text-2xl font-bold">Run your first test in under a minute</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Drop in a CSV or pick a sample dataset — we'll recommend the right test, visualize it, and explain the result.
          </p>
          <Link
            to="/upload"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-primary to-accent px-5 py-3 text-sm font-semibold text-primary-foreground"
          >
            Start now <ArrowRight className="h-4 w-4" />
          </Link>
        </GlassCard>
      </section>

      <AITutor />
    </PageShell>
  );
}

function DemoChart() {
  // Animated bar chart with floating "p < 0.05" badge.
  const bars = [40, 65, 55, 78, 50, 90, 70];
  return (
    <GlassCard className="glow p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Score by Study Method</div>
          <div className="text-xs text-muted-foreground">One-way ANOVA · n=150</div>
        </div>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 1 }}
          className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs text-emerald-300"
        >
          p = 0.003 · Significant
        </motion.div>
      </div>
      <div className="flex h-48 items-end gap-3">
        {bars.map((h, i) => (
          <motion.div
            key={i}
            initial={{ height: 0 }}
            animate={{ height: `${h}%` }}
            transition={{ delay: 0.4 + i * 0.08, type: "spring", stiffness: 120, damping: 18 }}
            className="flex-1 rounded-t-lg bg-gradient-to-t from-primary/40 to-accent/80"
          />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-7 text-center text-[10px] text-muted-foreground">
        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => <span key={d}>{d}</span>)}
      </div>
    </GlassCard>
  );
}
