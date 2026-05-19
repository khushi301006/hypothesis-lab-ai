// Lightweight report store backed by localStorage.
import { useEffect, useState } from "react";

export interface SavedReport {
  id: string;
  dataset: string;
  testName: string;
  colA: string;
  colB: string;
  alpha: number;
  statistic: number;
  pValue: number;
  df?: number | [number, number];
  ci?: [number, number];
  decision: string;
  createdAt: number;
}

const KEY = "hlab.reports";
const listeners = new Set<() => void>();

function load(): SavedReport[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function save(items: SavedReport[]) {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(items));
  listeners.forEach((l) => l());
}

export function saveReport(r: SavedReport) {
  const items = [r, ...load()];
  save(items);
}
export function deleteReport(id: string) {
  save(load().filter((r) => r.id !== id));
}
export function useReports(): SavedReport[] {
  const [items, setItems] = useState<SavedReport[]>(() => load());
  useEffect(() => {
    const cb = () => setItems(load());
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  }, []);
  return items;
}

// Quiz stats (XP, streak, accuracy).
const QKEY = "hlab.quiz";
export interface QuizStats {
  xp: number; streak: number; bestStreak: number;
  attempted: number; correct: number;
  lastDate?: string;
}
export function loadQuiz(): QuizStats {
  if (typeof window === "undefined") return { xp: 0, streak: 0, bestStreak: 0, attempted: 0, correct: 0 };
  try { return JSON.parse(localStorage.getItem(QKEY) || "null") ?? { xp: 0, streak: 0, bestStreak: 0, attempted: 0, correct: 0 }; }
  catch { return { xp: 0, streak: 0, bestStreak: 0, attempted: 0, correct: 0 }; }
}
export function saveQuiz(s: QuizStats) {
  if (typeof window !== "undefined") localStorage.setItem(QKEY, JSON.stringify(s));
}
