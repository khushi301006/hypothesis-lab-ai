// Pure TypeScript statistics library for Hypothesis Lab.
// Implements: descriptive stats, normal/t/chi-square/F distributions,
// t-tests (one-sample, independent, paired), chi-square test of independence,
// one-way ANOVA, Pearson & Spearman correlation, Shapiro-Wilk-like normality
// heuristic, and Levene's test for homogeneity of variance.

// ---------- Math helpers ----------

// Lanczos approximation for log-gamma.
export function logGamma(x: number): number {
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  x -= 1;
  let a = c[0];
  const t = x + g + 0.5;
  for (let i = 1; i < g + 2; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

export function gamma(x: number) { return Math.exp(logGamma(x)); }

// Regularized lower incomplete gamma P(a, x) via series / continued fraction.
function gammaP(a: number, x: number): number {
  if (x < 0 || a <= 0) return NaN;
  if (x === 0) return 0;
  if (x < a + 1) {
    // series
    let ap = a; let sum = 1 / a; let del = sum;
    for (let n = 1; n < 200; n++) {
      ap += 1; del *= x / ap; sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-12) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
  }
  // continued fraction for Q, then 1 - Q
  let b = x + 1 - a; let c = 1 / 1e-30; let d = 1 / b; let h = d;
  for (let i = 1; i < 200; i++) {
    const an = -i * (i - a);
    b += 2; d = an * d + b; if (Math.abs(d) < 1e-30) d = 1e-30;
    c = b + an / c; if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d; const del = d * c; h *= del;
    if (Math.abs(del - 1) < 1e-12) break;
  }
  const Q = Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
  return 1 - Q;
}

// Regularized incomplete beta I_x(a, b) via continued fraction.
function betaCF(x: number, a: number, b: number): number {
  const MAXIT = 200; const EPS = 3e-12; const FPMIN = 1e-30;
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1; let d = 1 - (qab * x) / qap; if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d; let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; const del = d * c; h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

export function betaI(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x)
  );
  if (x < (a + 1) / (a + b + 2)) return (bt * betaCF(x, a, b)) / a;
  return 1 - (bt * betaCF(1 - x, b, a)) / b;
}

// ---------- Distributions ----------

export function normPdf(x: number, mu = 0, sd = 1) {
  return Math.exp(-0.5 * ((x - mu) / sd) ** 2) / (sd * Math.sqrt(2 * Math.PI));
}

// Standard normal CDF via erf.
export function normCdf(x: number, mu = 0, sd = 1) {
  const z = (x - mu) / sd;
  // Abramowitz & Stegun 7.1.26
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const a = [0.254829592, -0.284496736, 1.421413741, -1.453152027, 1.061405429];
  const erf =
    1 - ((((a[4] * t + a[3]) * t + a[2]) * t + a[1]) * t + a[0]) * t *
      Math.exp(-(z * z) / 2);
  return 0.5 * (1 + Math.sign(z) * erf);
}

export function tPdf(t: number, df: number) {
  return (
    Math.exp(
      logGamma((df + 1) / 2) - logGamma(df / 2) -
        0.5 * Math.log(df * Math.PI) -
        ((df + 1) / 2) * Math.log(1 + (t * t) / df)
    )
  );
}

// Two-sided t CDF returning P(T<=t)
export function tCdf(t: number, df: number): number {
  const x = df / (df + t * t);
  const a = df / 2, b = 0.5;
  const ib = betaI(x, a, b);
  return t >= 0 ? 1 - 0.5 * ib : 0.5 * ib;
}

// Two-tailed p-value for t-statistic
export function tTwoTailedP(t: number, df: number): number {
  return 2 * (1 - tCdf(Math.abs(t), df));
}

export function chi2Cdf(x: number, df: number): number {
  if (x <= 0) return 0;
  return gammaP(df / 2, x / 2);
}

export function chi2P(x: number, df: number): number {
  return 1 - chi2Cdf(x, df);
}

export function fCdf(x: number, d1: number, d2: number): number {
  if (x <= 0) return 0;
  return 1 - betaI(d2 / (d2 + d1 * x), d2 / 2, d1 / 2);
}

export function fP(x: number, d1: number, d2: number): number {
  return 1 - fCdf(x, d1, d2);
}

// Approximate inverse normal CDF (Beasley-Springer/Moro).
export function normInv(p: number): number {
  if (p <= 0) return -Infinity; if (p >= 1) return Infinity;
  const a = [-39.6968302866538, 220.946098424521, -275.928510446969,
    138.357751867269, -30.6647980661472, 2.50662827745924];
  const b = [-54.4760987982241, 161.585836858041, -155.698979859887,
    66.8013118877197, -13.2806815528857];
  const c = [-7.78489400243029e-3, -0.322396458041136, -2.40075827716184,
    -2.54973253934373, 4.37466414146497, 2.93816398269878];
  const d = [7.78469570904146e-3, 0.32246712907004, 2.445134137143, 3.75440866190742];
  const pl = 0.02425, ph = 1 - pl;
  let q: number, r: number;
  if (p < pl) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= ph) {
    q = p - 0.5; r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
}

// Inverse t via bisection (good enough for CI computation).
export function tInv(p: number, df: number): number {
  // p is the lower-tail probability.
  let lo = -50, hi = 50;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const c = tCdf(mid, df);
    if (c < p) lo = mid; else hi = mid;
    if (hi - lo < 1e-8) break;
  }
  return (lo + hi) / 2;
}

// ---------- Descriptive ----------

export function mean(arr: number[]) {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}
export function variance(arr: number[], sample = true) {
  const m = mean(arr);
  const s = arr.reduce((s, v) => s + (v - m) ** 2, 0);
  return s / (arr.length - (sample ? 1 : 0));
}
export function stdev(arr: number[], sample = true) {
  return Math.sqrt(variance(arr, sample));
}
export function median(arr: number[]) {
  const a = [...arr].sort((x, y) => x - y);
  const n = a.length;
  return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2;
}
export function quantile(arr: number[], q: number) {
  const a = [...arr].sort((x, y) => x - y);
  const pos = (a.length - 1) * q;
  const b = Math.floor(pos);
  const r = pos - b;
  return a[b + 1] !== undefined ? a[b] + r * (a[b + 1] - a[b]) : a[b];
}

// ---------- Tests ----------

export interface TestResult {
  test: string;
  statistic: number;
  pValue: number;
  df?: number | [number, number];
  ci?: [number, number];
  extra?: Record<string, unknown>;
  nullHypothesis: string;
  alternative: string;
  decision: (alpha: number) => string;
}

export function oneSampleTTest(x: number[], mu0 = 0, alpha = 0.05): TestResult {
  const n = x.length, m = mean(x), s = stdev(x);
  const se = s / Math.sqrt(n);
  const t = (m - mu0) / se;
  const df = n - 1;
  const p = tTwoTailedP(t, df);
  const crit = tInv(1 - alpha / 2, df);
  return {
    test: "One-sample t-test",
    statistic: t, pValue: p, df,
    ci: [m - crit * se, m + crit * se],
    extra: { mean: m, sd: s, n, mu0 },
    nullHypothesis: `μ = ${mu0}`,
    alternative: `μ ≠ ${mu0}`,
    decision: (a) => (p < a ? "Reject H₀" : "Fail to reject H₀"),
  };
}

export function independentTTest(x: number[], y: number[], alpha = 0.05): TestResult {
  // Welch's t-test (does not assume equal variance).
  const n1 = x.length, n2 = y.length;
  const m1 = mean(x), m2 = mean(y);
  const v1 = variance(x), v2 = variance(y);
  const se = Math.sqrt(v1 / n1 + v2 / n2);
  const t = (m1 - m2) / se;
  const df = (v1 / n1 + v2 / n2) ** 2 /
    ((v1 / n1) ** 2 / (n1 - 1) + (v2 / n2) ** 2 / (n2 - 1));
  const p = tTwoTailedP(t, df);
  const crit = tInv(1 - alpha / 2, df);
  return {
    test: "Independent t-test (Welch)",
    statistic: t, pValue: p, df,
    ci: [(m1 - m2) - crit * se, (m1 - m2) + crit * se],
    extra: { m1, m2, sd1: Math.sqrt(v1), sd2: Math.sqrt(v2), n1, n2 },
    nullHypothesis: "μ₁ = μ₂",
    alternative: "μ₁ ≠ μ₂",
    decision: (a) => (p < a ? "Reject H₀" : "Fail to reject H₀"),
  };
}

export function pairedTTest(x: number[], y: number[], alpha = 0.05): TestResult {
  if (x.length !== y.length) throw new Error("Paired t-test requires equal-length samples");
  const d = x.map((v, i) => v - y[i]);
  const r = oneSampleTTest(d, 0, alpha);
  return { ...r, test: "Paired t-test", nullHypothesis: "μ_d = 0", alternative: "μ_d ≠ 0" };
}

export function chiSquareIndependence(table: number[][]): TestResult & {
  expected: number[][]; rowTotals: number[]; colTotals: number[]; grand: number;
} {
  const rows = table.length, cols = table[0].length;
  const rowTotals = table.map((r) => r.reduce((s, v) => s + v, 0));
  const colTotals = Array(cols).fill(0).map((_, j) => table.reduce((s, r) => s + r[j], 0));
  const grand = rowTotals.reduce((s, v) => s + v, 0);
  const expected: number[][] = table.map((_, i) =>
    table[0].map((__, j) => (rowTotals[i] * colTotals[j]) / grand)
  );
  let chi = 0;
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < cols; j++) {
      const e = expected[i][j];
      if (e > 0) chi += ((table[i][j] - e) ** 2) / e;
    }
  const df = (rows - 1) * (cols - 1);
  const p = chi2P(chi, df);
  return {
    test: "Chi-square test of independence",
    statistic: chi, pValue: p, df,
    expected, rowTotals, colTotals, grand,
    nullHypothesis: "Variables are independent",
    alternative: "Variables are associated",
    decision: (a) => (p < a ? "Reject H₀" : "Fail to reject H₀"),
  };
}

export function oneWayAnova(groups: number[][]): TestResult & {
  groupMeans: number[]; grandMean: number; ssBetween: number; ssWithin: number;
} {
  const k = groups.length;
  const ns = groups.map((g) => g.length);
  const N = ns.reduce((s, v) => s + v, 0);
  const groupMeans = groups.map((g) => mean(g));
  const grand = groups.flat().reduce((s, v) => s + v, 0) / N;
  let ssBetween = 0, ssWithin = 0;
  for (let i = 0; i < k; i++) {
    ssBetween += ns[i] * (groupMeans[i] - grand) ** 2;
    for (const v of groups[i]) ssWithin += (v - groupMeans[i]) ** 2;
  }
  const dfB = k - 1, dfW = N - k;
  const msB = ssBetween / dfB, msW = ssWithin / dfW;
  const F = msB / msW;
  const p = fP(F, dfB, dfW);
  return {
    test: "One-way ANOVA",
    statistic: F, pValue: p, df: [dfB, dfW],
    groupMeans, grandMean: grand, ssBetween, ssWithin,
    nullHypothesis: "All group means are equal",
    alternative: "At least one group mean differs",
    decision: (a) => (p < a ? "Reject H₀" : "Fail to reject H₀"),
  };
}

export function pearson(x: number[], y: number[]): TestResult & { r: number } {
  const n = x.length;
  const mx = mean(x), my = mean(y);
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const a = x[i] - mx, b = y[i] - my;
    num += a * b; dx += a * a; dy += b * b;
  }
  const r = num / Math.sqrt(dx * dy);
  const df = n - 2;
  const t = r * Math.sqrt(df / Math.max(1 - r * r, 1e-12));
  const p = tTwoTailedP(t, df);
  return {
    test: "Pearson correlation",
    statistic: t, pValue: p, df, r,
    nullHypothesis: "ρ = 0 (no linear correlation)",
    alternative: "ρ ≠ 0",
    decision: (a) => (p < a ? "Reject H₀" : "Fail to reject H₀"),
  };
}

function rank(arr: number[]): number[] {
  const idx = arr.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const ranks = Array(arr.length).fill(0);
  let i = 0;
  while (i < idx.length) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const avg = (i + j + 2) / 2; // average rank (1-indexed)
    for (let k = i; k <= j; k++) ranks[idx[k][1]] = avg;
    i = j + 1;
  }
  return ranks;
}

export function spearman(x: number[], y: number[]): TestResult & { r: number } {
  const rx = rank(x), ry = rank(y);
  const r = pearson(rx, ry);
  return { ...r, test: "Spearman rank correlation" };
}

// Simple Shapiro-Francia–style normality heuristic via correlation of sorted
// data against normal scores. Returns W in [0,1]; values close to 1 => normal.
export function normalityHeuristic(x: number[]): { W: number; likelyNormal: boolean } {
  const n = x.length;
  if (n < 4) return { W: 1, likelyNormal: true };
  const sorted = [...x].sort((a, b) => a - b);
  const scores = sorted.map((_, i) => normInv((i + 0.5) / n));
  const r = pearson(sorted, scores).r;
  const W = r * r;
  return { W, likelyNormal: W > 0.95 };
}

export function levene(groups: number[][]): { W: number; pValue: number } {
  // Brown-Forsythe variant: uses absolute deviations from group medians.
  const k = groups.length;
  const ns = groups.map((g) => g.length);
  const N = ns.reduce((a, b) => a + b, 0);
  const zi = groups.map((g) => {
    const med = median(g);
    return g.map((v) => Math.abs(v - med));
  });
  const ziBar = zi.map((g) => mean(g));
  const zGrand = zi.flat().reduce((s, v) => s + v, 0) / N;
  let num = 0, den = 0;
  for (let i = 0; i < k; i++) {
    num += ns[i] * (ziBar[i] - zGrand) ** 2;
    for (const v of zi[i]) den += (v - ziBar[i]) ** 2;
  }
  const W = ((N - k) / (k - 1)) * (num / den);
  const p = fP(W, k - 1, N - k);
  return { W, pValue: p };
}

// Outlier detection via 1.5*IQR rule.
export function outliers(x: number[]): { indices: number[]; lower: number; upper: number } {
  const q1 = quantile(x, 0.25), q3 = quantile(x, 0.75);
  const iqr = q3 - q1;
  const lo = q1 - 1.5 * iqr, hi = q3 + 1.5 * iqr;
  const indices = x.map((v, i) => (v < lo || v > hi ? i : -1)).filter((i) => i >= 0);
  return { indices, lower: lo, upper: hi };
}
