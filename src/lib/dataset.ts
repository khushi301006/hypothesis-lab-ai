// Dataset store — a small global state (no extra deps) for the active dataset
// across pages. Persists to localStorage so a refresh keeps the data.

import { useEffect, useState } from "react";

export type ColumnType = "numeric" | "categorical";

export interface Dataset {
  name: string;
  columns: string[];
  types: Record<string, ColumnType>;
  rows: Record<string, string | number | null>[];
}

const KEY = "hlab.dataset";
let memory: Dataset | null = null;
const listeners = new Set<() => void>();

function load(): Dataset | null {
  if (memory) return memory;
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    memory = JSON.parse(raw) as Dataset;
    return memory;
  } catch { return null; }
}

export function setDataset(ds: Dataset | null) {
  memory = ds;
  if (typeof window !== "undefined") {
    if (ds) localStorage.setItem(KEY, JSON.stringify(ds));
    else localStorage.removeItem(KEY);
  }
  listeners.forEach((l) => l());
}

export function useDataset(): [Dataset | null, (ds: Dataset | null) => void] {
  const [ds, setDs] = useState<Dataset | null>(() => load());
  useEffect(() => {
    const cb = () => setDs(memory);
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  }, []);
  return [ds, setDataset];
}

// Infer numeric vs categorical for a column.
export function inferTypes(
  rows: Record<string, unknown>[],
  columns: string[],
): Record<string, ColumnType> {
  const types: Record<string, ColumnType> = {};
  for (const col of columns) {
    let numericCount = 0, total = 0;
    for (const r of rows) {
      const v = r[col];
      if (v === null || v === undefined || v === "") continue;
      total++;
      if (typeof v === "number" && !Number.isNaN(v)) numericCount++;
      else if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) numericCount++;
    }
    types[col] = total > 0 && numericCount / total > 0.8 ? "numeric" : "categorical";
  }
  return types;
}

export function getNumericColumn(ds: Dataset, col: string): number[] {
  return ds.rows
    .map((r) => {
      const v = r[col];
      if (v === null || v === undefined || v === "") return NaN;
      return typeof v === "number" ? v : Number(v);
    })
    .filter((v) => !Number.isNaN(v));
}

export function getCategoricalColumn(ds: Dataset, col: string): string[] {
  return ds.rows
    .map((r) => {
      const v = r[col];
      return v === null || v === undefined ? "" : String(v);
    })
    .filter((v) => v !== "");
}

// Group numeric values by a categorical column.
export function groupBy(
  ds: Dataset, numericCol: string, categoricalCol: string,
): { group: string; values: number[] }[] {
  const groups = new Map<string, number[]>();
  for (const r of ds.rows) {
    const k = r[categoricalCol];
    const v = r[numericCol];
    if (k === null || k === undefined || k === "") continue;
    if (v === null || v === undefined || v === "") continue;
    const num = typeof v === "number" ? v : Number(v);
    if (Number.isNaN(num)) continue;
    const key = String(k);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(num);
  }
  return Array.from(groups, ([group, values]) => ({ group, values }));
}

// Contingency table for two categorical columns.
export function contingency(
  ds: Dataset, rowCol: string, colCol: string,
): { table: number[][]; rowLevels: string[]; colLevels: string[] } {
  const rowSet = new Set<string>(), colSet = new Set<string>();
  for (const r of ds.rows) {
    const rv = r[rowCol]; const cv = r[colCol];
    if (rv === null || rv === undefined || rv === "") continue;
    if (cv === null || cv === undefined || cv === "") continue;
    rowSet.add(String(rv)); colSet.add(String(cv));
  }
  const rowLevels = [...rowSet].sort();
  const colLevels = [...colSet].sort();
  const ri = new Map(rowLevels.map((v, i) => [v, i] as const));
  const ci = new Map(colLevels.map((v, i) => [v, i] as const));
  const table: number[][] = rowLevels.map(() => colLevels.map(() => 0));
  for (const r of ds.rows) {
    const rv = r[rowCol]; const cv = r[colCol];
    if (rv === null || rv === undefined || rv === "") continue;
    if (cv === null || cv === undefined || cv === "") continue;
    table[ri.get(String(rv))!][ci.get(String(cv))!]++;
  }
  return { table, rowLevels, colLevels };
}

// Summary statistics for a single numeric column.
export function summarize(ds: Dataset, col: string) {
  const vals = getNumericColumn(ds, col);
  if (vals.length === 0) return null;
  const sorted = [...vals].sort((a, b) => a - b);
  return {
    n: vals.length,
    missing: ds.rows.length - vals.length,
    mean: vals.reduce((s, v) => s + v, 0) / vals.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    median: sorted[Math.floor(sorted.length / 2)],
  };
}

export function missingCount(ds: Dataset, col: string): number {
  return ds.rows.reduce((s, r) => {
    const v = r[col];
    return s + (v === null || v === undefined || v === "" ? 1 : 0);
  }, 0);
}

// Recommend a test given two selected columns.
export function recommendTest(ds: Dataset, colA: string, colB: string) {
  const a = ds.types[colA], b = ds.types[colB];
  if (a === "numeric" && b === "numeric")
    return { test: "correlation" as const, why: "Both selected columns are numeric — measure the strength and direction of their linear (Pearson) or monotonic (Spearman) relationship." };
  if (a === "categorical" && b === "categorical")
    return { test: "chi-square" as const, why: "Both selected columns are categorical — Chi-square tests whether the two variables are independent." };
  // numeric vs categorical
  const numCol = a === "numeric" ? colA : colB;
  const catCol = a === "numeric" ? colB : colA;
  const groups = groupBy(ds, numCol, catCol);
  if (groups.length === 2)
    return { test: "t-test" as const, why: "One numeric variable across exactly 2 groups — an independent t-test compares their means.", numCol, catCol };
  return { test: "anova" as const, why: `One numeric variable across ${groups.length} groups — one-way ANOVA compares means across all groups simultaneously.`, numCol, catCol };
}
