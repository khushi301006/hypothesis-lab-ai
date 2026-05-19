// Small synthetic sample datasets for the Upload Lab.
import type { Dataset } from "./dataset";
import { inferTypes } from "./dataset";

function build(name: string, rows: Record<string, string | number>[]): Dataset {
  const columns = Object.keys(rows[0]);
  const types = inferTypes(rows, columns);
  return { name, columns, types, rows };
}

function rng(seed: number) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
}
function normal(r: () => number, mu = 0, sd = 1) {
  const u1 = Math.max(r(), 1e-9), u2 = r();
  return mu + sd * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export const SAMPLES = {
  supermarket: () => {
    const r = rng(11);
    const rows = Array.from({ length: 120 }, () => {
      const category = ["Food", "Electronics", "Clothing", "Home"][Math.floor(r() * 4)];
      const branch = ["A", "B", "C"][Math.floor(r() * 3)];
      const baseline = { Food: 25, Electronics: 180, Clothing: 60, Home: 95 }[category]!;
      const sales = Math.round(Math.max(5, normal(r, baseline, baseline * 0.4)) * 100) / 100;
      const rating = Math.round(Math.min(10, Math.max(1, normal(r, 7, 1.2))) * 10) / 10;
      return { branch, category, sales, rating };
    });
    return build("Supermarket Sales", rows);
  },
  students: () => {
    const r = rng(7);
    const rows = Array.from({ length: 150 }, () => {
      const gender = r() < 0.5 ? "Male" : "Female";
      const studyMethod = ["Self", "Tutor", "Group"][Math.floor(r() * 3)];
      const hours = Math.round(Math.max(0, normal(r, 14, 6)) * 10) / 10;
      const base = studyMethod === "Tutor" ? 78 : studyMethod === "Group" ? 72 : 68;
      const score = Math.round(Math.min(100, Math.max(0, normal(r, base + hours * 0.6, 9))));
      return { gender, studyMethod, hours, score };
    });
    return build("Student Performance", rows);
  },
  medical: () => {
    const r = rng(42);
    const rows = Array.from({ length: 100 }, () => {
      const group = r() < 0.5 ? "Treatment" : "Placebo";
      const age = Math.round(normal(r, 50, 12));
      const drop = group === "Treatment" ? normal(r, 12, 4) : normal(r, 4, 4);
      const bpReduction = Math.round(drop * 10) / 10;
      const outcome = bpReduction > 6 ? "Improved" : "NoChange";
      return { group, age, bpReduction, outcome };
    });
    return build("Medical Trial", rows);
  },
  marketing: () => {
    const r = rng(3);
    const rows = Array.from({ length: 130 }, () => {
      const channel = ["Email", "Social", "Search", "Display"][Math.floor(r() * 4)];
      const spend = Math.round(normal(r, 500, 200));
      const baseConv = { Email: 0.08, Social: 0.04, Search: 0.06, Display: 0.02 }[channel]!;
      const converted = r() < baseConv + (spend > 600 ? 0.02 : 0) ? "Yes" : "No";
      const revenue = Math.round(Math.max(0, spend * (baseConv * 8 + normal(r, 0, 0.3))));
      return { channel, spend, converted, revenue };
    });
    return build("Marketing Campaign", rows);
  },
};
