import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Hash, Type, FlaskConical, Activity, Sparkles, Send, GraduationCap, Brain, Briefcase } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import {
  useDataset, groupBy, contingency, summarize, missingCount,
} from "@/lib/dataset";
import {
  independentTTest, oneSampleTTest, chiSquareIndependence, oneWayAnova,
  pearson, mean, stdev, type TestResult,
} from "@/lib/stats";
import { PValueVisualizer } from "@/components/p-value-viz";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Cell,
} from "recharts";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workspace")({
  component: Workspace,
  head: () => ({ meta: [{ title: "Workspace — Hypothesis Lab" }] }),
});

type TestKey = "one-sample-t" | "independent-t" | "anova" | "chi-square" | "correlation";
type Alpha = 0.01 | 0.05 | 0.1;

const TESTS: { key: TestKey; label: string }[] = [
  { key: "one-sample-t", label: "1-sample t" },
  { key: "independent-t", label: "Independent t" },
  { key: "anova", label: "ANOVA" },
  { key: "chi-square", label: "Chi-square" },
  { key: "correlation", label: "Correlation" },
];

function Workspace() {
  const [dataset] = useDataset();
  const [testKey, setTestKey] = useState<TestKey>("independent-t");
  const [colA, setColA] = useState<string>("");
  const [colB, setColB] = useState<string>("");
  const [alpha, setAlpha] = useState<Alpha>(0.05);
  const [mu0, setMu0] = useState("0");

  const numericCols = useMemo(
    () => dataset?.columns.filter((c) => dataset.types[c] === "numeric") ?? [],
    [dataset],
  );
  const categoricalCols = useMemo(
    () => dataset?.columns.filter((c) => dataset.types[c] === "categorical") ?? [],
    [dataset],
  );

  // Auto-pick sensible defaults when dataset / test changes.
  useEffect(() => {
    if (!dataset) return;
    if (testKey === "correlation") {
      setColA((p) => p && numericCols.includes(p) ? p : numericCols[0] ?? "");
      setColB((p) => p && numericCols.includes(p) ? p : numericCols[1] ?? numericCols[0] ?? "");
    } else if (testKey === "chi-square") {
      setColA((p) => p && categoricalCols.includes(p) ? p : categoricalCols[0] ?? "");
      setColB((p) => p && categoricalCols.includes(p) ? p : categoricalCols[1] ?? categoricalCols[0] ?? "");
    } else if (testKey === "one-sample-t") {
      setColA((p) => p && numericCols.includes(p) ? p : numericCols[0] ?? "");
      setColB("");
    } else {
      setColA((p) => p && numericCols.includes(p) ? p : numericCols[0] ?? "");
      setColB((p) => p && categoricalCols.includes(p) ? p : categoricalCols[0] ?? "");
    }
  }, [dataset, testKey, numericCols, categoricalCols]);

  if (!dataset) {
    return (
      <div className="min-h-screen grid-bg">
        <Navbar />
        <main className="mx-auto w-full max-w-7xl px-4 py-8">
          <div className="glass rounded-2xl p-16 text-center">
            <Upload className="mx-auto mb-3 h-10 w-10 text-primary" />
            <h2 className="text-xl font-semibold">No dataset loaded</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload a CSV/XLSX or load a sample to start.
            </p>
            <Link to="/upload" className="mt-4 inline-flex">
              <Button>Go to Upload Lab</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const totalCells = dataset.rows.length * dataset.columns.length;
  const missingTotal = dataset.columns.reduce((s, c) => s + missingCount(dataset, c), 0);

  return (
    <div className="min-h-screen grid-bg">
      <Navbar />
      <main className="mx-auto grid w-full max-w-[1480px] gap-6 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* MAIN COLUMN */}
        <div className="min-w-0 space-y-6">
          {/* Header */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Workspace
            </div>
            <h1 className="mt-1 text-5xl font-bold tracking-tight text-gradient">
              Upload · analyze · understand
            </h1>
          </div>

          {/* Active dataset bar */}
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
              <span className="text-primary">Active</span> · <span className="normal-case tracking-normal text-foreground/90 text-sm">{dataset.name}</span>
            </div>
            <Link to="/upload">
              <button className="rounded-full border border-border bg-card/40 px-4 py-1.5 text-xs text-muted-foreground transition hover:border-primary/50 hover:text-foreground">
                Load another dataset
              </button>
            </Link>
          </div>

          {/* LOADED DATASET CARD */}
          <section className="glass rounded-2xl p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Loaded dataset
                </div>
                <div className="mt-1 text-2xl font-bold">{dataset.name}</div>
              </div>
              <div className="flex items-center gap-8 text-right">
                <Stat label="Rows" value={dataset.rows.length} />
                <Stat label="Cols" value={dataset.columns.length} />
                <Stat label="Missing" value={`${missingTotal} / ${totalCells}`} />
              </div>
            </div>

            {/* Column tiles */}
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {dataset.columns.map((c) => (
                <ColumnTile key={c} name={c} type={dataset.types[c]} dataset={dataset} />
              ))}
            </div>

            {/* Preview table */}
            <div className="mt-5 overflow-x-auto rounded-xl border border-border/60 bg-background/30">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    {dataset.columns.map((c) => (
                      <th key={c} className="px-4 py-2 font-medium">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dataset.rows.slice(0, 6).map((r, i) => (
                    <tr key={i} className="border-b border-border/30 last:border-0 hover:bg-card/30">
                      {dataset.columns.map((c) => (
                        <td key={c} className="px-4 py-2 tabular-nums text-foreground/90">{String(r[c] ?? "")}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* CHOOSE A TEST */}
          <section className="glass rounded-2xl p-6">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              <FlaskConical className="h-3.5 w-3.5 text-primary" /> Choose a test
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {TESTS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTestKey(t.key)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm transition",
                    testKey === t.key
                      ? "border-primary bg-primary/15 text-foreground shadow-[0_0_0_3px_oklch(0.68_0.22_285/0.15)]"
                      : "border-border bg-card/30 text-muted-foreground hover:text-foreground hover:border-primary/40",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <Field label={pickerLabelA(testKey)}>
                <NativeSelect value={colA} onChange={setColA}>
                  {columnsFor(testKey, "A", numericCols, categoricalCols, dataset.columns).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </NativeSelect>
              </Field>

              {testKey === "one-sample-t" ? (
                <Field label="μ₀ (population mean)">
                  <input
                    value={mu0}
                    onChange={(e) => setMu0(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm focus:border-primary/60 focus:outline-none"
                  />
                </Field>
              ) : (
                <Field label={pickerLabelB(testKey)}>
                  <NativeSelect value={colB} onChange={setColB}>
                    {columnsFor(testKey, "B", numericCols, categoricalCols, dataset.columns).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </NativeSelect>
                </Field>
              )}

              <Field label="Significance α">
                <div className="grid grid-cols-3 gap-2">
                  {([0.01, 0.05, 0.1] as Alpha[]).map((a) => (
                    <button
                      key={a}
                      onClick={() => setAlpha(a)}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-sm tabular-nums transition",
                        alpha === a
                          ? "border-accent text-foreground shadow-[0_0_0_3px_oklch(0.7_0.2_235/0.18)]"
                          : "border-border bg-background/40 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          </section>

          {/* RESULTS */}
          <ResultsBlock
            dataset={dataset}
            testKey={testKey} colA={colA} colB={colB}
            alpha={alpha} mu0={Number(mu0) || 0}
          />
        </div>

        {/* AI TUTOR SIDEBAR */}
        <aside className="lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)]">
          <InlineAITutor
            context={`Dataset: ${dataset.name}. Test: ${testKey}. Columns: ${colA}${colB ? " vs " + colB : ""}. α=${alpha}.`}
          />
        </aside>
      </main>
    </div>
  );
}

/* ============================================================ */
/*                          SUB-COMPONENTS                       */
/* ============================================================ */

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center">
      <div className="text-3xl font-bold tabular-nums text-gradient">{value}</div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
    </div>
  );
}

function ColumnTile({
  name, type, dataset,
}: { name: string; type: "numeric" | "categorical"; dataset: ReturnType<typeof useDataset>[0] }) {
  if (!dataset) return null;
  const numeric = type === "numeric";
  const summary = numeric ? summarize(dataset, name) : null;
  const uniq = numeric
    ? null
    : new Set(dataset.rows.map((r) => r[name]).filter((v) => v !== "" && v != null)).size;

  return (
    <div className="rounded-xl border border-border/60 bg-background/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 truncate text-sm font-medium">
          {numeric
            ? <Hash className="h-3.5 w-3.5 text-accent" />
            : <Type className="h-3.5 w-3.5 text-primary" />}
          <span className="truncate">{name}</span>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{type}</span>
      </div>
      <div className="mt-2 font-mono text-[11px] text-muted-foreground">
        {numeric && summary
          ? <>uniq {new Set(dataset.rows.map((r) => r[name])).size} · μ {summary.mean.toFixed(2)} · σ {stdev(dataset.rows.map((r) => Number(r[name])).filter((v) => !Number.isNaN(v))).toFixed(2)} · [{summary.min}, {summary.max}]</>
          : <>uniq {uniq}</>}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

function NativeSelect({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full appearance-none rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground focus:border-primary/60 focus:outline-none"
    >
      {children}
    </select>
  );
}

function pickerLabelA(t: TestKey): string {
  if (t === "chi-square") return "Categorical column A";
  if (t === "correlation") return "Numeric column X";
  return "Numeric column";
}
function pickerLabelB(t: TestKey): string {
  if (t === "chi-square") return "Categorical column B";
  if (t === "correlation") return "Numeric column Y";
  return "Grouping column";
}
function columnsFor(
  t: TestKey, slot: "A" | "B",
  num: string[], cat: string[], _all: string[],
): string[] {
  if (t === "chi-square") return cat;
  if (t === "correlation") return num;
  if (t === "one-sample-t") return num;
  // independent-t / anova
  return slot === "A" ? num : cat;
}

/* ====================== RESULTS BLOCK ====================== */

function ResultsBlock({
  dataset, testKey, colA, colB, alpha, mu0,
}: {
  dataset: NonNullable<ReturnType<typeof useDataset>[0]>;
  testKey: TestKey; colA: string; colB: string; alpha: number; mu0: number;
}) {
  let result: TestResult | null = null;
  let cohenD: number | null = null;
  let groupChart: { group: string; mean: number }[] | null = null;
  let error: string | null = null;
  let dist: React.ComponentProps<typeof PValueVisualizer>["dist"] | null = null;
  let twoTailed = true;

  try {
    if (!colA) throw new Error("Pick a column to run the test.");
    if (testKey === "one-sample-t") {
      const xs = dataset.rows.map((r) => Number(r[colA])).filter((v) => !Number.isNaN(v));
      result = oneSampleTTest(xs, mu0, alpha);
      dist = { kind: "t", df: result.df as number };
    } else if (testKey === "independent-t") {
      if (!colB) throw new Error("Pick a grouping column.");
      const groups = groupBy(dataset, colA, colB);
      if (groups.length !== 2) throw new Error(`Independent t-test needs exactly 2 groups, found ${groups.length}.`);
      result = independentTTest(groups[0].values, groups[1].values, alpha);
      dist = { kind: "t", df: result.df as number };
      const sp = Math.sqrt((stdev(groups[0].values) ** 2 + stdev(groups[1].values) ** 2) / 2);
      cohenD = sp > 0 ? (mean(groups[0].values) - mean(groups[1].values)) / sp : 0;
      groupChart = groups.map((g) => ({ group: g.group, mean: mean(g.values) }));
    } else if (testKey === "anova") {
      if (!colB) throw new Error("Pick a grouping column.");
      const groups = groupBy(dataset, colA, colB);
      const r = oneWayAnova(groups.map((g) => g.values));
      result = r;
      dist = { kind: "f", d1: (r.df as [number, number])[0], d2: (r.df as [number, number])[1] };
      twoTailed = false;
      groupChart = groups.map((g, i) => ({ group: g.group, mean: r.groupMeans[i] }));
    } else if (testKey === "chi-square") {
      if (!colB) throw new Error("Pick a second categorical column.");
      const { table } = contingency(dataset, colA, colB);
      const r = chiSquareIndependence(table);
      result = r;
      dist = { kind: "chi2", df: r.df as number };
      twoTailed = false;
    } else if (testKey === "correlation") {
      if (!colB) throw new Error("Pick a second numeric column.");
      const pairs = dataset.rows
        .map((r) => [Number(r[colA]), Number(r[colB])] as [number, number])
        .filter(([x, y]) => !Number.isNaN(x) && !Number.isNaN(y));
      result = pearson(pairs.map((p) => p[0]), pairs.map((p) => p[1]));
      dist = { kind: "t", df: result.df as number };
    }
  } catch (e) {
    error = (e as Error).message;
  }

  if (error) {
    return (
      <section className="glass rounded-2xl p-6 text-sm text-amber-300">
        {error}
      </section>
    );
  }
  if (!result || !dist) return null;

  const significant = result.pValue < alpha;
  const pStr = result.pValue < 1e-4 ? result.pValue.toExponential(2) : result.pValue.toFixed(4);
  const dfStr = Array.isArray(result.df) ? `${result.df[0]}, ${result.df[1]}` : (result.df ?? "—");

  const steps = [
    `State H₀: no effect / no difference / no association.`,
    `State H₁: a real effect exists.`,
    `Set significance level α = ${alpha}.`,
    `Compute the test statistic: ${result.statistic.toFixed(4)}.`,
    `Derive the p-value: ${pStr}.`,
    `Compare p to α and ${significant ? "reject" : "fail to reject"} H₀.`,
    `Conclude: ${significant ? "Reject" : "Retain"} H₀.`,
  ];

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
      {/* RESULT panel */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          <Activity className="h-3.5 w-3.5 text-primary" /> Result
        </div>
        <div className="mt-1 text-xl font-bold">{result.test}</div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Cell2 label="Statistic" value={result.statistic.toFixed(4)} />
          <Cell2 label="p-value" value={pStr} accent="primary" />
          <Cell2 label="df" value={String(dfStr)} />
          <Cell2 label="α" value={alpha.toString()} />
          {cohenD !== null && <Cell2 label="Cohen's d" value={cohenD.toFixed(3)} />}
        </div>

        <div
          className={cn(
            "mt-4 rounded-xl border p-4",
            significant
              ? "border-primary/50 bg-primary/10"
              : "border-amber-400/40 bg-amber-400/5",
          )}
        >
          <div className="font-semibold">
            {significant ? "Reject H₀" : "Fail to reject H₀"}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Because p ({pStr}) {significant ? "<" : "≥"} α ({alpha}), the observed effect is {significant ? "unlikely" : "consistent with"} H₀.
          </div>
        </div>

        <ol className="mt-5 space-y-2 text-sm">
          {steps.map((s, i) => (
            <motion.li
              key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className="flex gap-2"
            >
              <span className="mt-0.5 font-mono text-[10px] text-accent">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-foreground/85">{s}</span>
            </motion.li>
          ))}
        </ol>
      </div>

      {/* CHARTS */}
      <div className="space-y-6">
        <div className="glass rounded-2xl p-6">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {dist.kind === "t" && `T-distribution · df=${dist.df}`}
            {dist.kind === "chi2" && `χ²-distribution · df=${dist.df}`}
            {dist.kind === "f" && `F-distribution · df=${dist.d1},${dist.d2}`}
          </div>
          <PValueVisualizer dist={dist} statistic={result.statistic} alpha={alpha} twoTailed={twoTailed} />
        </div>

        {groupChart && (
          <div className="glass rounded-2xl p-6">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Group means
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={groupChart}>
                <CartesianGrid strokeOpacity={0.12} vertical={false} />
                <XAxis dataKey="group" tick={{ fontSize: 11, fill: "currentColor" }} />
                <YAxis tick={{ fontSize: 11, fill: "currentColor" }} />
                <Tooltip
                  contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12 }}
                />
                <Bar dataKey="mean" radius={[8, 8, 0, 0]}>
                  {groupChart.map((_, i) => (
                    <Cell key={i} fill={i % 2 === 0 ? "var(--color-primary)" : "var(--color-accent)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  );
}

function Cell2({ label, value, accent }: { label: string; value: string; accent?: "primary" }) {
  // Trim noisy precision so long floats (e.g. df = 147.9697584474) don't
  // overflow the tile and overlap the neighbouring cell.
  const display = (() => {
    const n = Number(value);
    if (Number.isFinite(n) && /\./.test(value)) {
      return Math.abs(n) >= 1000 ? n.toFixed(0) : n.toFixed(3);
    }
    return value;
  })();
  return (
    <div className="min-w-0 rounded-xl border border-border/60 bg-background/30 p-3">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-1 block truncate font-mono text-lg tabular-nums leading-tight",
          accent === "primary" ? "text-gradient" : "text-foreground",
        )}
        title={value}
      >
        {display}
      </div>
    </div>
  );
}

/* ====================== INLINE AI TUTOR ====================== */

type Msg = { role: "user" | "assistant"; content: string };
type Mode = "beginner" | "technical" | "exam" | "interview";

const MODES: { key: Mode; label: string; icon: typeof Brain }[] = [
  { key: "beginner", label: "Beginner", icon: GraduationCap },
  { key: "technical", label: "Technical", icon: Brain },
  { key: "exam", label: "Exam", icon: FlaskConical },
  { key: "interview", label: "Interview", icon: Briefcase },
];

const STARTERS = [
  "Explain this result like I'm a beginner",
  "Why was this test chosen?",
  "What should I conclude?",
  "Give me viva questions on this",
];

function InlineAITutor({ context }: { context: string }) {
  const [mode, setMode] = useState<Mode>("beginner");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const t = text.trim();
    if (!t || loading) return;
    const next = [...messages, { role: "user", content: t } as Msg];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.functions.supabase.co/ai-tutor`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, context, mode: mode === "exam" ? "interview" : mode }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${err.error ?? "Error"}` }]);
        return;
      }
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      setMessages((m) => [...m, { role: "assistant", content: "" }]);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value, { stream: true }).split("\n")) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const data = trimmed.slice(5).trim();
          if (data === "[DONE]") break;
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content ?? "";
            if (delta) {
              acc += delta;
              setMessages((m) => {
                const c = [...m]; c[c.length - 1] = { role: "assistant", content: acc }; return c;
              });
            }
          } catch { /* ignore */ }
        }
      }
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${(e as Error).message}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass flex h-full flex-col overflow-hidden rounded-2xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-border/60 p-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">AI</div>
          <div className="text-lg font-bold leading-tight">Statistics Tutor</div>
          <div className="mt-1 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Lovable AI · Live
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-1">
          {MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] transition",
                mode === m.key
                  ? "bg-primary/20 text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <>
            <div className="flex items-start gap-2 rounded-xl bg-card/40 p-3 text-sm">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <span className="text-muted-foreground">
                Ask anything about your current analysis — I read the context from the lab.
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-border bg-card/40 px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </>
        )}
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[88%] rounded-2xl px-3 py-2 text-sm",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card/60",
                )}
              >
                <div className="prose prose-sm prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1">
                  <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {loading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3 animate-pulse" /> Thinking…
          </div>
        )}
      </div>

      {/* Input */}
      <form
        className="border-t border-border/60 p-3"
        onSubmit={(e) => { e.preventDefault(); send(input); }}
      >
        <div className="flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1.5 focus-within:border-primary/60">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about p-values, assumptions, anything…"
            className="flex-1 bg-transparent text-sm focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
}
