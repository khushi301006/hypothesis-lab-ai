import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { PageShell } from "@/components/navbar";
import { GlassCard, StatNumber } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { FileText, Trash2, Download, BarChart3, FlaskConical, Trophy } from "lucide-react";
import { useReports, deleteReport, loadQuiz } from "@/lib/reports";
import { AITutor } from "@/components/ai-tutor";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export const Route = createFileRoute("/reports")({
  component: ReportsDashboard,
  head: () => ({ meta: [{ title: "Reports Dashboard — Hypothesis Lab" }] }),
});

function ReportsDashboard() {
  const reports = useReports();
  const quiz = loadQuiz();

  const testCounts: Record<string, number> = {};
  for (const r of reports) testCounts[r.testName] = (testCounts[r.testName] ?? 0) + 1;
  const mostUsed = Object.entries(testCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  const chartData = Object.entries(testCounts).map(([name, count]) => ({ name: name.replace("test", "").trim(), count }));
  const accuracy = quiz.attempted ? Math.round((quiz.correct / quiz.attempted) * 100) : 0;

  return (
    <PageShell>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Reports Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Saved analyses, learning progress, and exportable reports.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <GlassCard><StatNumber value={reports.length} label="Tests performed" /></GlassCard>
        <GlassCard><StatNumber value={reports.length} label="Saved reports" /></GlassCard>
        <GlassCard><StatNumber value={accuracy} suffix="%" label="Quiz accuracy" /></GlassCard>
        <GlassCard><StatNumber value={quiz.xp} label="Learning XP" /></GlassCard>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <GlassCard hover={false}>
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <BarChart3 className="h-4 w-4 text-primary" /> Tests breakdown
          </div>
          {chartData.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData}>
                <CartesianGrid strokeOpacity={0.15} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState />
          )}
        </GlassCard>

        <GlassCard hover={false}>
          <div className="text-sm font-semibold">Highlights</div>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex items-center gap-2"><FlaskConical className="h-4 w-4 text-primary" /> Most used test: <span className="font-medium">{mostUsed}</span></li>
            <li className="flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-400" /> Best streak: <span className="font-medium">{quiz.bestStreak}</span></li>
            <li className="flex items-center gap-2"><FileText className="h-4 w-4 text-accent" /> Saved reports: <span className="font-medium">{reports.length}</span></li>
          </ul>
        </GlassCard>
      </div>

      <div className="mt-8">
        <div className="mb-3 text-sm font-semibold">Saved reports</div>
        {reports.length === 0 ? (
          <GlassCard className="text-center py-10">
            <FileText className="mx-auto mb-2 h-8 w-8 text-primary" />
            <p className="text-sm text-muted-foreground">No reports yet. Run an analysis in the Workspace and click <span className="text-foreground">Save to Reports</span>.</p>
            <Link to="/workspace" className="mt-3 inline-flex">
              <Button size="sm">Open Workspace</Button>
            </Link>
          </GlassCard>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {reports.map((r, i) => (
              <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <GlassCard hover={false}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{r.testName}</div>
                      <div className="text-xs text-muted-foreground">{r.dataset} · {r.colA} vs {r.colB}</div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] ${r.pValue < r.alpha ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-200"}`}>
                      p = {r.pValue < 1e-4 ? r.pValue.toExponential(2) : r.pValue.toFixed(4)}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div><div className="text-muted-foreground">Statistic</div><div className="font-mono">{r.statistic.toFixed(3)}</div></div>
                    <div><div className="text-muted-foreground">α</div><div className="font-mono">{r.alpha}</div></div>
                    <div><div className="text-muted-foreground">Decision</div><div className="font-mono">{r.decision}</div></div>
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => exportPdf(r)}>
                      <Download className="mr-1 h-3 w-3" /> PDF
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { deleteReport(r.id); toast.success("Deleted"); }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AITutor />
    </PageShell>
  );
}

function EmptyState() {
  return (
    <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
      Run analyses in the Workspace to populate this dashboard.
    </div>
  );
}

function exportPdf(r: ReturnType<typeof useReports>[number]) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  let y = 56;
  doc.setFont("helvetica", "bold"); doc.setFontSize(20);
  doc.text("Hypothesis Lab — Statistical Report", 40, y); y += 28;
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(120);
  doc.text(new Date(r.createdAt).toLocaleString(), 40, y); y += 24;
  doc.setTextColor(0);

  const section = (title: string) => { doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text(title, 40, y); y += 16; doc.setFont("helvetica", "normal"); doc.setFontSize(11); };
  const line = (s: string) => { const split = doc.splitTextToSize(s, W - 80); doc.text(split, 40, y); y += split.length * 14 + 4; };

  section("Objective");
  line(`Test whether the relationship between "${r.colA}" and "${r.colB}" in the dataset "${r.dataset}" is statistically significant.`);

  section("Test");
  line(`${r.testName}, with significance level α = ${r.alpha}.`);

  section("Results");
  line(`Test statistic: ${r.statistic.toFixed(4)}`);
  line(`p-value: ${r.pValue < 1e-4 ? r.pValue.toExponential(3) : r.pValue.toFixed(4)}`);
  if (r.df !== undefined) line(`Degrees of freedom: ${Array.isArray(r.df) ? r.df.join(", ") : r.df}`);
  if (r.ci) line(`95% Confidence interval: [${r.ci[0].toFixed(3)}, ${r.ci[1].toFixed(3)}]`);

  section("Interpretation");
  line(
    r.pValue < r.alpha
      ? `Since p = ${r.pValue.toFixed(4)} < α = ${r.alpha}, we reject the null hypothesis. The observed effect is unlikely to have occurred under H₀.`
      : `Since p = ${r.pValue.toFixed(4)} ≥ α = ${r.alpha}, we fail to reject the null hypothesis. There is insufficient evidence for the alternative.`
  );

  section("Conclusion");
  line(r.decision);

  doc.setFontSize(9); doc.setTextColor(140);
  doc.text("Generated by Hypothesis Lab", 40, doc.internal.pageSize.getHeight() - 30);
  doc.save(`hypothesis-lab-${r.testName.replace(/\s+/g, "-")}-${r.id.slice(0, 6)}.pdf`);
}
