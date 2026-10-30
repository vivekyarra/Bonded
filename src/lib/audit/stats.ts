/** Small statistics helpers for the fairness audit (no dependencies). */

function lnGamma(z: number): number {
  const g = 7;
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z);
  z -= 1;
  let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

/** Regularised upper incomplete gamma Q(a, x). */
export function gammaQ(a: number, x: number): number {
  if (x <= 0) return 1;
  if (x < a + 1) {
    let sum = 1 / a;
    let del = sum;
    for (let n = 1; n < 500; n++) {
      del *= x / (a + n);
      sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-12) break;
    }
    return 1 - sum * Math.exp(-x + a * Math.log(x) - lnGamma(a));
  }
  let b = x + 1 - a;
  let c = 1e300;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 500; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < 1e-300) d = 1e-300;
    c = b + an / c;
    if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-12) break;
  }
  return Math.exp(-x + a * Math.log(x) - lnGamma(a)) * h;
}

/** Pearson chi-square test of independence on a k×2 table of [yes, no] counts. */
export function chiSquare(rows: [number, number][]): { stat: number; df: number; p: number } {
  const used = rows.filter(([a, b]) => a + b > 0);
  const total = used.reduce((s, [a, b]) => s + a + b, 0);
  const col = [used.reduce((s, r) => s + r[0], 0), used.reduce((s, r) => s + r[1], 0)];
  if (used.length < 2 || total === 0 || col[0] === 0 || col[1] === 0) return { stat: 0, df: Math.max(0, used.length - 1), p: 1 };
  let stat = 0;
  for (const r of used) {
    const n = r[0] + r[1];
    for (let j = 0; j < 2; j++) {
      const e = (n * col[j]) / total;
      stat += (r[j] - e) ** 2 / e;
    }
  }
  const df = used.length - 1;
  return { stat, df, p: gammaQ(df / 2, stat / 2) };
}

/** Share of (positive, negative) pairs ranked correctly; ties count half (ROC AUC). */
export function separation(pos: number[], neg: number[]): number {
  if (!pos.length || !neg.length) return 0;
  let s = 0;
  for (const p of pos) for (const n of neg) s += p > n ? 1 : p === n ? 0.5 : 0;
  return s / (pos.length * neg.length);
}
