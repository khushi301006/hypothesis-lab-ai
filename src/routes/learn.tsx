import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageShell } from "@/components/navbar";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, RotateCw, BookOpen } from "lucide-react";
import { AITutor } from "@/components/ai-tutor";

export const Route = createFileRoute("/learn")({
  component: Learn,
  head: () => ({ meta: [{ title: "Learning Hub — Hypothesis Lab" }] }),
});

const CONCEPTS = [
  { t: "p-value", b: "The probability of observing data at least as extreme as the sample, assuming H₀ is true. Smaller p ⇒ stronger evidence against H₀." },
  { t: "Null hypothesis (H₀)", b: "The default 'no effect / no difference' claim. We assume it's true until the evidence is strong enough to reject it." },
  { t: "Alternative hypothesis (H₁)", b: "The claim you're trying to find evidence for. Can be two-sided (≠) or one-sided (>, <)." },
  { t: "Type I error (α)", b: "Rejecting H₀ when it is actually true. α is your tolerance for this — usually 0.05." },
  { t: "Type II error (β)", b: "Failing to reject H₀ when H₁ is true. Power = 1 − β." },
  { t: "Confidence interval", b: "A range of plausible values for the parameter, with a given confidence level (e.g. 95%)." },
  { t: "Statistical significance", b: "When p < α we say the result is statistically significant. It does NOT imply practical importance." },
  { t: "Effect size", b: "How big the difference/relationship is, independent of sample size (e.g. Cohen's d, r²)." },
];

const FLASHCARDS = [
  { q: "What does a p-value of 0.03 mean (α = 0.05)?", a: "There's a 3% chance of seeing data this extreme if H₀ were true — so we reject H₀." },
  { q: "When do you use a paired t-test?", a: "When two measurements come from the same units (e.g. before/after on the same subjects)." },
  { q: "Chi-square is used for…?", a: "Testing independence between two categorical variables (or goodness-of-fit)." },
  { q: "ANOVA generalizes which test?", a: "The independent t-test, but to 3+ groups." },
  { q: "What's the difference between Pearson and Spearman?", a: "Pearson measures linear correlation; Spearman measures monotonic correlation using ranks (robust to outliers)." },
  { q: "Power of a test is…?", a: "1 − β: the probability of correctly rejecting H₀ when H₁ is true." },
];

const MCQS = [
  {
    q: "You compare mean exam scores across 4 teaching methods. Which test?",
    options: ["Paired t-test", "Chi-square", "One-way ANOVA", "Pearson"],
    correct: 2,
    why: "One numeric outcome across 3+ groups → ANOVA.",
  },
  {
    q: "p = 0.07, α = 0.05. Conclusion?",
    options: ["Reject H₀", "Fail to reject H₀", "Prove H₀ true", "Need more data, undefined"],
    correct: 1,
    why: "p > α, so we don't reject H₀ — but we don't prove H₀ either.",
  },
  {
    q: "Which is a Type I error?",
    options: ["Missing a real effect", "Detecting an effect that isn't there", "Setting α too low", "Using the wrong test"],
    correct: 1,
    why: "Type I = false positive = rejecting a true H₀.",
  },
];

function Learn() {
  return (
    <PageShell>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Learning Hub</h1>
        <p className="mt-1 text-sm text-muted-foreground">Concepts, flashcards, and quick MCQs to build intuition.</p>
      </div>

      <Tabs defaultValue="concepts">
        <TabsList>
          <TabsTrigger value="concepts">Concept Cards</TabsTrigger>
          <TabsTrigger value="flashcards">Flashcards</TabsTrigger>
          <TabsTrigger value="mcq">Quick MCQs</TabsTrigger>
        </TabsList>

        <TabsContent value="concepts" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {CONCEPTS.map((c, i) => (
              <motion.div key={c.t}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <GlassCard>
                  <BookOpen className="mb-2 h-5 w-5 text-primary" />
                  <div className="text-base font-semibold">{c.t}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{c.b}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="flashcards" className="mt-4">
          <Flashcards />
        </TabsContent>

        <TabsContent value="mcq" className="mt-4">
          <div className="space-y-4">{MCQS.map((m, i) => <MCQCard key={i} {...m} />)}</div>
        </TabsContent>
      </Tabs>

      <AITutor />
    </PageShell>
  );
}

function Flashcards() {
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = FLASHCARDS[i];
  return (
    <div className="mx-auto max-w-2xl">
      <GlassCard hover={false} className="text-center">
        <div
          className="relative h-56 cursor-pointer [perspective:1200px]"
          onClick={() => setFlipped((v) => !v)}
        >
          <motion.div
            className="absolute inset-0 [transform-style:preserve-3d]"
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl border border-border bg-card/60 p-6 text-lg font-medium [backface-visibility:hidden]">
              {card.q}
            </div>
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/20 to-accent/20 p-6 text-base [backface-visibility:hidden] [transform:rotateY(180deg)]">
              {card.a}
            </div>
          </motion.div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => { setFlipped(false); setI((x) => (x - 1 + FLASHCARDS.length) % FLASHCARDS.length); }}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-xs text-muted-foreground">{i + 1} / {FLASHCARDS.length} · tap card to flip</div>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => setFlipped((v) => !v)}><RotateCw className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => { setFlipped(false); setI((x) => (x + 1) % FLASHCARDS.length); }}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

function MCQCard({ q, options, correct, why }: { q: string; options: string[]; correct: number; why: string }) {
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <GlassCard hover={false}>
      <div className="font-medium">{q}</div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {options.map((o, i) => {
          const isPicked = picked === i;
          const isCorrect = picked !== null && i === correct;
          const isWrong = isPicked && i !== correct;
          return (
            <button
              key={i}
              onClick={() => picked === null && setPicked(i)}
              className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                isCorrect ? "border-emerald-500/60 bg-emerald-500/15"
                : isWrong ? "border-destructive/60 bg-destructive/15"
                : "border-border bg-card/50 hover:border-primary/40"
              }`}
            >
              {o}
            </button>
          );
        })}
      </div>
      <AnimatePresence>
        {picked !== null && (
          <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-3 text-sm text-muted-foreground">
            {picked === correct ? "✅ Correct. " : "❌ Not quite. "} {why}
          </motion.p>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}
