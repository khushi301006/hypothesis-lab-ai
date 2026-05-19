import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageShell } from "@/components/navbar";
import { GlassCard, StatNumber } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Flame, Trophy, Zap, Clock, Award } from "lucide-react";
import { loadQuiz, saveQuiz, type QuizStats } from "@/lib/reports";
import { AITutor } from "@/components/ai-tutor";

export const Route = createFileRoute("/quiz")({
  component: QuizArena,
  head: () => ({ meta: [{ title: "Quiz Arena — Hypothesis Lab" }] }),
});

type Q = { q: string; options: string[]; correct: number; why: string; topic: string };

const BANK: Record<"easy" | "medium" | "hard", Q[]> = {
  easy: [
    { q: "p < α means we…", options: ["Reject H₀", "Accept H₀", "Prove H₀", "Restart"], correct: 0, why: "Strong evidence against H₀ ⇒ reject.", topic: "p-value" },
    { q: "Most common α is…", options: ["0.5", "0.05", "0.95", "5"], correct: 1, why: "0.05 is the default convention.", topic: "alpha" },
    { q: "Two categorical variables → test?", options: ["t-test", "ANOVA", "Chi-square", "Pearson"], correct: 2, why: "Chi-square handles categorical associations.", topic: "tests" },
    { q: "Pearson r ranges over…", options: ["[0,1]", "[−1,1]", "[−∞,∞]", "(0,∞)"], correct: 1, why: "r is bounded between −1 and 1.", topic: "correlation" },
    { q: "Power = ?", options: ["1 − α", "1 − β", "α + β", "α · β"], correct: 1, why: "Power = 1 − β (true positive rate).", topic: "errors" },
  ],
  medium: [
    { q: "Comparing 3 group means → use…", options: ["Paired t", "ANOVA", "Chi-square", "Spearman"], correct: 1, why: "ANOVA generalizes t-test to 3+ groups.", topic: "tests" },
    { q: "Welch's t-test vs Student's t-test?", options: ["Same thing", "Welch allows unequal variance", "Student is for paired data", "Welch needs equal n"], correct: 1, why: "Welch's relaxes the equal-variance assumption.", topic: "t-test" },
    { q: "Type II error means…", options: ["Reject true H₀", "Fail to reject false H₀", "Wrong test", "Bad data"], correct: 1, why: "False negative.", topic: "errors" },
    { q: "Spearman is appropriate when…", options: ["Linear & normal", "Monotonic / ranked / outliers", "Categorical", "Only large n"], correct: 1, why: "Spearman uses ranks; robust to outliers.", topic: "correlation" },
    { q: "A 95% CI that excludes 0 means…", options: ["p > 0.05", "p < 0.05", "H₀ true", "Power = 0.95"], correct: 1, why: "CI excluding 0 ⇔ rejecting H₀: mean=0 at 5% level.", topic: "ci" },
  ],
  hard: [
    { q: "What's NOT a Chi-square assumption?", options: ["Independent observations", "Expected count ≥ 5", "Random sample", "Normal residuals"], correct: 3, why: "Normality is not a χ² assumption.", topic: "chi-square" },
    { q: "ANOVA F-statistic equals…", options: ["MSE / MSB", "MSB / MSW", "SSB / SST", "(n−1)·t²"], correct: 1, why: "F = mean square between / mean square within.", topic: "anova" },
    { q: "Lowering α from 0.05 to 0.01 will…", options: ["Increase power", "Decrease Type I, increase Type II", "Always reduce p-value", "Make CI narrower"], correct: 1, why: "Stricter α → fewer false positives but more false negatives.", topic: "errors" },
    { q: "If p = 0.001 with n=10,000, then…", options: ["Result is huge", "Significant — but effect size may be tiny", "Reject H₁", "Recompute t"], correct: 1, why: "Large n makes tiny effects significant; check effect size.", topic: "significance" },
    { q: "Bonferroni correction addresses…", options: ["Heteroscedasticity", "Multiple comparisons", "Outliers", "Missing values"], correct: 1, why: "Adjusts α when running many tests simultaneously.", topic: "advanced" },
  ],
};

function QuizArena() {
  const [stats, setStats] = useState<QuizStats>(() => loadQuiz());
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("easy");
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [time, setTime] = useState(20);
  const [running, setRunning] = useState(false);
  const [sessionScore, setSessionScore] = useState({ correct: 0, attempted: 0 });

  const questions = useMemo(() => [...BANK[difficulty]].sort(() => Math.random() - 0.5), [difficulty]);
  const cur = questions[idx];

  useEffect(() => { saveQuiz(stats); }, [stats]);

  useEffect(() => {
    if (!running || picked !== null) return;
    if (time <= 0) { handlePick(-1); return; }
    const id = setTimeout(() => setTime((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [time, running, picked]);

  function start() {
    setRunning(true); setIdx(0); setPicked(null); setTime(20);
    setSessionScore({ correct: 0, attempted: 0 });
  }

  function handlePick(p: number) {
    setPicked(p);
    const correct = p === cur.correct;
    setSessionScore((s) => ({ correct: s.correct + (correct ? 1 : 0), attempted: s.attempted + 1 }));
    setStats((s) => {
      const xp = s.xp + (correct ? (difficulty === "easy" ? 5 : difficulty === "medium" ? 10 : 20) : 0);
      const streak = correct ? s.streak + 1 : 0;
      const bestStreak = Math.max(s.bestStreak, streak);
      const today = new Date().toDateString();
      return {
        xp, streak, bestStreak,
        attempted: s.attempted + 1, correct: s.correct + (correct ? 1 : 0),
        lastDate: today,
      };
    });
  }

  function next() {
    if (idx + 1 >= questions.length) { setRunning(false); return; }
    setIdx(idx + 1); setPicked(null); setTime(20);
  }

  const accuracy = stats.attempted ? Math.round((stats.correct / stats.attempted) * 100) : 0;
  const badges: { name: string; got: boolean; icon: typeof Trophy }[] = [
    { name: "First Steps", got: stats.attempted >= 1, icon: Zap },
    { name: "10 Streak", got: stats.bestStreak >= 10, icon: Flame },
    { name: "Centurion (100 XP)", got: stats.xp >= 100, icon: Trophy },
    { name: "Sharp Shooter (80%+)", got: stats.attempted >= 10 && accuracy >= 80, icon: Award },
  ];

  return (
    <PageShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quiz Arena</h1>
          <p className="mt-1 text-sm text-muted-foreground">Climb the XP ladder. Difficulty adapts — start easy, go hard.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={difficulty} onValueChange={(v) => setDifficulty(v as typeof difficulty)} disabled={running}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">Easy · +5 XP</SelectItem>
              <SelectItem value="medium">Medium · +10 XP</SelectItem>
              <SelectItem value="hard">Hard · +20 XP</SelectItem>
            </SelectContent>
          </Select>
          {!running && <Button onClick={start}>Start session</Button>}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <GlassCard><StatNumber value={stats.xp} label="XP" /></GlassCard>
        <GlassCard><StatNumber value={stats.streak} label="Current streak" /></GlassCard>
        <GlassCard><StatNumber value={stats.bestStreak} label="Best streak" /></GlassCard>
        <GlassCard><StatNumber value={accuracy} label="Accuracy" suffix="%" /></GlassCard>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <GlassCard hover={false}>
          {!running ? (
            <div className="text-center py-10">
              <Trophy className="mx-auto mb-3 h-10 w-10 text-primary" />
              <div className="text-lg font-semibold">Ready when you are.</div>
              <p className="mt-1 text-sm text-muted-foreground">5 timed questions · 20s each · earn XP & badges.</p>
            </div>
          ) : (
            <div>
              <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>Question {idx + 1} / {questions.length}</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {time}s</span>
              </div>
              <div className="mb-4 h-1 w-full overflow-hidden rounded-full bg-border">
                <motion.div className="h-full bg-primary" animate={{ width: `${(time / 20) * 100}%` }} transition={{ duration: 0.5 }} />
              </div>
              <div className="text-lg font-medium">{cur.q}</div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {cur.options.map((o, i) => {
                  const isPicked = picked === i;
                  const isCorrect = picked !== null && i === cur.correct;
                  const isWrong = isPicked && i !== cur.correct;
                  return (
                    <button
                      key={i}
                      onClick={() => picked === null && handlePick(i)}
                      className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                        isCorrect ? "border-emerald-500/60 bg-emerald-500/15"
                        : isWrong ? "border-destructive/60 bg-destructive/15"
                        : "border-border bg-card/50 hover:border-primary/40"
                      }`}
                    >{o}</button>
                  );
                })}
              </div>
              <AnimatePresence>
                {picked !== null && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 flex items-start justify-between gap-3">
                    <p className="text-sm text-muted-foreground">{cur.why}</p>
                    <Button size="sm" onClick={next}>{idx + 1 >= questions.length ? "Finish" : "Next"}</Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </GlassCard>

        <GlassCard hover={false}>
          <div className="text-sm font-semibold">Badges</div>
          <div className="mt-3 grid gap-2">
            {badges.map((b) => {
              const Icon = b.icon;
              return (
                <div key={b.name} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${b.got ? "border-primary/50 bg-primary/10" : "border-border bg-card/40 text-muted-foreground"}`}>
                  <Icon className={`h-4 w-4 ${b.got ? "text-primary" : ""}`} />
                  <span>{b.name}</span>
                </div>
              );
            })}
          </div>
          {running && sessionScore.attempted > 0 && (
            <div className="mt-4 rounded-xl border border-border bg-card/40 p-3 text-sm">
              <div>Session: {sessionScore.correct} / {sessionScore.attempted}</div>
            </div>
          )}
        </GlassCard>
      </div>

      <AITutor />
    </PageShell>
  );
}
