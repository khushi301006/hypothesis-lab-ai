// Interactive p-value visualizer: shades rejection region(s) and p-value
// area under the chosen reference distribution (normal / t / chi2 / F).
import { useMemo } from "react";
import { motion } from "framer-motion";
import { normPdf, tPdf, chi2Cdf, fCdf, tInv, normInv } from "@/lib/stats";

type Dist =
  | { kind: "t"; df: number }
  | { kind: "normal" }
  | { kind: "chi2"; df: number }
  | { kind: "f"; d1: number; d2: number };

interface Props {
  dist: Dist;
  statistic: number;
  alpha: number;
  twoTailed?: boolean;
}

function pdfFor(dist: Dist, x: number): number {
  if (dist.kind === "normal") return normPdf(x);
  if (dist.kind === "t") return tPdf(x, dist.df);
  if (dist.kind === "chi2") {
    if (x <= 0) return 0;
    const { df } = dist;
    return (
      Math.exp(
        (df / 2 - 1) * Math.log(x) - x / 2 - (df / 2) * Math.log(2) -
          // logGamma inline
          (((df / 2 < 0.5)
            ? Math.log(Math.PI / Math.sin(Math.PI * (df / 2))) -
              logGammaInline(1 - df / 2)
            : logGammaInline(df / 2)))
      )
    );
  }
  // F
  const { d1, d2 } = dist;
  if (x <= 0) return 0;
  const num = Math.pow(d1 * x, d1) * Math.pow(d2, d2);
  const den = Math.pow(d1 * x + d2, d1 + d2);
  const coef =
    Math.exp(logGammaInline((d1 + d2) / 2) - logGammaInline(d1 / 2) - logGammaInline(d2 / 2));
  return (coef * Math.sqrt(num / den)) / x;
}

function logGammaInline(x: number): number {
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  const g = 7;
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGammaInline(1 - x);
  x -= 1;
  let a = c[0];
  const t = x + g + 0.5;
  for (let i = 1; i < g + 2; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

export function PValueVisualizer({ dist, statistic, alpha, twoTailed = true }: Props) {
  const { xs, ys, range, crit } = useMemo(() => {
    let lo = -4, hi = 4;
    if (dist.kind === "t") { lo = -5; hi = 5; }
    if (dist.kind === "chi2") { lo = 0; hi = Math.max(20, dist.df * 3, statistic * 1.2); }
    if (dist.kind === "f") { lo = 0; hi = Math.max(5, statistic * 1.5); }
    const n = 240;
    const xs = Array.from({ length: n }, (_, i) => lo + (i / (n - 1)) * (hi - lo));
    const ys = xs.map((x) => pdfFor(dist, x));
    let crit: number[] = [];
    if (dist.kind === "normal") {
      crit = twoTailed ? [normInv(alpha / 2), normInv(1 - alpha / 2)] : [normInv(1 - alpha)];
    } else if (dist.kind === "t") {
      crit = twoTailed
        ? [tInv(alpha / 2, dist.df), tInv(1 - alpha / 2, dist.df)]
        : [tInv(1 - alpha, dist.df)];
    } else if (dist.kind === "chi2") {
      // bisection for upper-tail critical value
      let l = 0, h = hi;
      for (let i = 0; i < 80; i++) {
        const mid = (l + h) / 2;
        if (chi2Cdf(mid, dist.df) < 1 - alpha) l = mid; else h = mid;
      }
      crit = [(l + h) / 2];
    } else {
      let l = 0, h = hi;
      for (let i = 0; i < 80; i++) {
        const mid = (l + h) / 2;
        if (fCdf(mid, dist.d1, dist.d2) < 1 - alpha) l = mid; else h = mid;
      }
      crit = [(l + h) / 2];
    }
    return { xs, ys, range: [lo, hi] as const, crit };
  }, [dist, alpha, twoTailed, statistic]);

  // Plot mapping
  const W = 560, H = 220, PAD = 28;
  const xMin = range[0], xMax = range[1];
  const yMax = Math.max(...ys) * 1.05;
  const xPx = (x: number) => PAD + ((x - xMin) / (xMax - xMin)) * (W - 2 * PAD);
  const yPx = (y: number) => H - PAD - (y / yMax) * (H - 2 * PAD);

  const path = xs.map((x, i) => `${i === 0 ? "M" : "L"}${xPx(x)},${yPx(ys[i])}`).join(" ");

  function shadeArea(start: number, end: number, fill: string, opacity = 0.4) {
    const seg = xs.filter((x) => x >= start && x <= end);
    if (seg.length < 2) return null;
    const segY = seg.map((x) => pdfFor(dist, x));
    const top = seg.map((x, i) => `${i === 0 ? "M" : "L"}${xPx(x)},${yPx(segY[i])}`).join(" ");
    const close = ` L${xPx(seg[seg.length - 1])},${yPx(0)} L${xPx(seg[0])},${yPx(0)} Z`;
    return <path d={top + close} fill={fill} fillOpacity={opacity} />;
  }

  // Rejection regions
  const rejection: React.ReactNode[] = [];
  if (dist.kind === "normal" || dist.kind === "t") {
    if (twoTailed) {
      rejection.push(shadeArea(xMin, crit[0], "var(--color-destructive)"));
      rejection.push(shadeArea(crit[1], xMax, "var(--color-destructive)"));
    } else {
      rejection.push(shadeArea(crit[0], xMax, "var(--color-destructive)"));
    }
  } else {
    rejection.push(shadeArea(crit[0], xMax, "var(--color-destructive)"));
  }

  // P-value shading from |statistic|
  const pvalShade =
    dist.kind === "normal" || dist.kind === "t"
      ? twoTailed
        ? [
            shadeArea(xMin, -Math.abs(statistic), "var(--color-accent)", 0.6),
            shadeArea(Math.abs(statistic), xMax, "var(--color-accent)", 0.6),
          ]
        : [shadeArea(statistic, xMax, "var(--color-accent)", 0.6)]
      : [shadeArea(statistic, xMax, "var(--color-accent)", 0.6)];

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="currentColor" strokeOpacity="0.3" />
        {rejection}
        {pvalShade}
        <motion.path
          d={path} fill="none" stroke="var(--color-primary)" strokeWidth={2}
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8 }}
        />
        {crit.map((c, i) => (
          <line key={i} x1={xPx(c)} y1={PAD} x2={xPx(c)} y2={H - PAD}
            stroke="var(--color-destructive)" strokeDasharray="4 3" strokeOpacity={0.7} />
        ))}
        {/* Test statistic line */}
        <motion.line
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
          x1={xPx(statistic)} y1={PAD - 8} x2={xPx(statistic)} y2={H - PAD}
          stroke="var(--color-accent)" strokeWidth={2}
        />
        <text x={xPx(statistic)} y={PAD - 10} fill="var(--color-accent)" fontSize="11" textAnchor="middle">
          stat = {statistic.toFixed(3)}
        </text>
      </svg>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-2 w-3 rounded-sm bg-primary" /> distribution</span>
        <span className="flex items-center gap-1"><span className="h-2 w-3 rounded-sm bg-destructive/40" /> rejection region (α = {alpha})</span>
        <span className="flex items-center gap-1"><span className="h-2 w-3 rounded-sm bg-accent/60" /> p-value area</span>
      </div>
    </div>
  );
}
