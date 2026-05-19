import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useCallback, useRef, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet, Database, ArrowRight, Trash2 } from "lucide-react";
import { PageShell } from "@/components/navbar";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useDataset, inferTypes, summarize, missingCount, type Dataset } from "@/lib/dataset";
import { SAMPLES } from "@/lib/sample-datasets";

export const Route = createFileRoute("/upload")({
  component: UploadLab,
  head: () => ({ meta: [{ title: "Upload Lab — Hypothesis Lab" }] }),
});

function UploadLab() {
  const [dataset, setDataset] = useDataset();
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleFile = useCallback(async (file: File) => {
    setLoading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase();
      let rows: Record<string, string | number>[] = [];
      if (ext === "csv") {
        const text = await file.text();
        const parsed = Papa.parse<Record<string, string>>(text, { header: true, dynamicTyping: true, skipEmptyLines: true });
        rows = parsed.data as Record<string, string | number>[];
      } else if (ext === "xlsx" || ext === "xls") {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf);
        const sheet = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(sheet);
      } else {
        toast.error("Unsupported format. Upload .csv or .xlsx");
        return;
      }
      if (!rows.length) { toast.error("Empty file"); return; }
      const columns = Object.keys(rows[0]);
      const types = inferTypes(rows, columns);
      const ds: Dataset = { name: file.name, columns, types, rows };
      setDataset(ds);
      toast.success(`Loaded ${rows.length} rows from ${file.name}`);
    } catch (e) {
      toast.error(`Could not parse file: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [setDataset]);

  function loadSample(key: keyof typeof SAMPLES) {
    setDataset(SAMPLES[key]());
    toast.success("Sample dataset loaded");
  }

  return (
    <PageShell>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Upload Lab</h1>
        <p className="mt-1 text-muted-foreground">Drop a CSV or XLSX file, or load a sample to get started.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <GlassCard hover={false}>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault(); setDragOver(false);
                const f = e.dataTransfer.files[0];
                if (f) handleFile(f);
              }}
              onClick={() => inputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed py-16 transition ${dragOver ? "border-primary bg-primary/10" : "border-border bg-card/30 hover:bg-card/50"}`}
            >
              <motion.div
                animate={{ y: dragOver ? -6 : 0 }}
                className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/30 to-accent/30"
              >
                <Upload className="h-7 w-7 text-primary" />
              </motion.div>
              <p className="text-base font-medium">{loading ? "Parsing…" : "Drag & drop your dataset here"}</p>
              <p className="mt-1 text-xs text-muted-foreground">Supports .csv, .xlsx — max 20MB</p>
              <input
                ref={inputRef} type="file" hidden accept=".csv,.xlsx,.xls"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </div>
          </GlassCard>
        </div>

        <GlassCard hover={false}>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Database className="h-4 w-4 text-accent" /> Sample datasets
          </div>
          <div className="space-y-2">
            {[
              { k: "supermarket", t: "Supermarket Sales", d: "branches, categories, sales, ratings" },
              { k: "students", t: "Student Performance", d: "study method, hours, score" },
              { k: "medical", t: "Medical Trial", d: "treatment vs placebo, BP reduction" },
              { k: "marketing", t: "Marketing Campaign", d: "channel, spend, conversion" },
            ].map((s) => (
              <button
                key={s.k}
                onClick={() => loadSample(s.k as keyof typeof SAMPLES)}
                className="w-full rounded-xl border border-border bg-card/40 px-3 py-2 text-left text-sm transition hover:border-primary/40 hover:bg-card"
              >
                <div className="font-medium">{s.t}</div>
                <div className="text-xs text-muted-foreground">{s.d}</div>
              </button>
            ))}
          </div>
        </GlassCard>
      </div>

      {dataset && (
        <div className="mt-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileSpreadsheet className="h-4 w-4" /> {dataset.name} · {dataset.rows.length} rows · {dataset.columns.length} columns
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setDataset(null)}>
                <Trash2 className="mr-1 h-3 w-3" /> Clear
              </Button>
              <Button size="sm" onClick={() => navigate({ to: "/workspace" })}>
                Open in Workspace <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Column overview */}
          <GlassCard hover={false}>
            <div className="mb-3 text-sm font-semibold">Column overview</div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {dataset.columns.map((c) => {
                const missing = missingCount(dataset, c);
                const s = dataset.types[c] === "numeric" ? summarize(dataset, c) : null;
                return (
                  <div key={c} className="rounded-xl border border-border bg-card/40 p-3">
                    <div className="flex items-center justify-between">
                      <span className="truncate font-medium">{c}</span>
                      <Badge variant={dataset.types[c] === "numeric" ? "default" : "secondary"} className="text-[10px]">
                        {dataset.types[c]}
                      </Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {missing > 0 ? `${missing} missing · ` : ""}
                      {s ? `mean ${s.mean.toFixed(2)} · min ${s.min} · max ${s.max}` : `${dataset.rows.length - missing} values`}
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>

          {/* Preview */}
          <GlassCard hover={false}>
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="font-semibold">Preview (first 20 rows)</span>
              <Link to="/workspace" className="text-xs text-primary hover:underline">Go to analysis →</Link>
            </div>
            <div className="overflow-x-auto rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>{dataset.columns.map((c) => <TableHead key={c}>{c}</TableHead>)}</TableRow>
                </TableHeader>
                <TableBody>
                  {dataset.rows.slice(0, 20).map((r, i) => (
                    <TableRow key={i}>
                      {dataset.columns.map((c) => (
                        <TableCell key={c} className="font-mono text-xs">
                          {r[c] === null || r[c] === undefined || r[c] === "" ? <span className="text-muted-foreground/60">—</span> : String(r[c])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </GlassCard>
        </div>
      )}
    </PageShell>
  );
}
