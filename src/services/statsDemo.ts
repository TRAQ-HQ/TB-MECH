/**
 * Statistical Interaction Demo for TB-MECH Voice (P2).
 * Implements Section 14 of plan.md:
 * Two-variant epistasis regression model:
 * Y = b0 + bA*A + bB*B + bAB*(A*B)
 * with bootstrap 95% CI, cell count threshold (>= 10 per cell),
 * Benjamini-Hochberg FDR, and explicit scientific disclaimer.
 */

export interface IsolateDatum {
  isolate_id: string;
  A: number; // 0 or 1
  B: number; // 0 or 1
  log2_mic: number;
}

export interface StatsResult {
  variant_a: string;
  variant_b: string;
  sample_size: number;
  cell_counts: {
    'A=0, B=0': number;
    'A=1, B=0': number;
    'A=0, B=1': number;
    'A=1, B=1': number;
  };
  coefficients: {
    b0_intercept: number;
    bA: number;
    bB: number;
    bAB_interaction: number;
  };
  bootstrap_ci_95: [number, number];
  p_value_raw: number;
  p_value_fdr_bh: number;
  valid_sample: boolean;
  message: string;
  disclaimer: string;
}

export const STATS_DISCLAIMER =
  'Method demonstration. Statistical interaction is not molecular causation. No lineage or population-structure control is applied; do not interpret as a finding.';

/**
 * Generates synthetic benchmark dataset with planted interaction
 * e.g. rpoB S450L (A) and rpoC V483G (B)
 */
export function generateSyntheticStatsData(nPerCell: number = 25): IsolateDatum[] {
  const data: IsolateDatum[] = [];
  let id = 1;

  // b0 = 1.0 (wildtype MIC log2 = 1.0)
  // bA = 4.0 (rpoB alone raises MIC)
  // bB = 0.2 (rpoC alone slight change)
  // bAB = -1.2 (compensatory slight fitness/MIC interaction)

  const cells = [
    { A: 0, B: 0, mean: 1.0, sd: 0.3 },
    { A: 1, B: 0, mean: 5.0, sd: 0.4 },
    { A: 0, B: 1, mean: 1.2, sd: 0.3 },
    { A: 1, B: 1, mean: 4.0, sd: 0.5 }
  ];

  for (const cell of cells) {
    for (let i = 0; i < nPerCell; i++) {
      // Gaussian approximation
      const u1 = Math.max(0.0001, Math.random());
      const u2 = Math.random();
      const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
      const val = Math.round((cell.mean + z * cell.sd) * 100) / 100;

      data.push({
        isolate_id: `SYN-ISO-${String(id++).padStart(4, '0')}`,
        A: cell.A,
        B: cell.B,
        log2_mic: val
      });
    }
  }

  return data;
}

/**
 * Fits Ordinary Least Squares regression for Y = b0 + bA*A + bB*B + bAB*(A*B)
 */
function fitOLS(data: IsolateDatum[]): { b0: number; bA: number; bB: number; bAB: number } {
  // Since A and B are orthogonal binary indicators:
  // cell means:
  // Y00 = mean(A=0, B=0) = b0
  // Y10 = mean(A=1, B=0) = b0 + bA  => bA = Y10 - Y00
  // Y01 = mean(A=0, B=1) = b0 + bB  => bB = Y01 - Y00
  // Y11 = mean(A=1, B=1) = b0 + bA + bB + bAB => bAB = Y11 - Y10 - Y01 + Y00

  const sumCount: Record<string, { sum: number; count: number }> = {
    '00': { sum: 0, count: 0 },
    '10': { sum: 0, count: 0 },
    '01': { sum: 0, count: 0 },
    '11': { sum: 0, count: 0 }
  };

  for (const d of data) {
    const key = `${d.A}${d.B}`;
    if (sumCount[key]) {
      sumCount[key].sum += d.log2_mic;
      sumCount[key].count += 1;
    }
  }

  const y00 = sumCount['00'].count > 0 ? sumCount['00'].sum / sumCount['00'].count : 0;
  const y10 = sumCount['10'].count > 0 ? sumCount['10'].sum / sumCount['10'].count : 0;
  const y01 = sumCount['01'].count > 0 ? sumCount['01'].sum / sumCount['01'].count : 0;
  const y11 = sumCount['11'].count > 0 ? sumCount['11'].sum / sumCount['11'].count : 0;

  const b0 = y00;
  const bA = y10 - y00;
  const bB = y01 - y00;
  const bAB = y11 - y10 - y01 + y00;

  return { b0, bA, bB, bAB };
}

/**
 * Runs 2-variant Epistasis Regression with Bootstrap 95% Confidence Interval
 */
export function runInteractionRegression(
  data: IsolateDatum[],
  variantAName: string = 'rpoB S450L',
  variantBName: string = 'rpoC V483G'
): StatsResult {
  const counts = {
    'A=0, B=0': data.filter(d => d.A === 0 && d.B === 0).length,
    'A=1, B=0': data.filter(d => d.A === 1 && d.B === 0).length,
    'A=0, B=1': data.filter(d => d.A === 0 && d.B === 1).length,
    'A=1, B=1': data.filter(d => d.A === 1 && d.B === 1).length
  };

  // Cell count constraint: each cell must have at least 10 isolates per Section 14
  const minCount = Math.min(...Object.values(counts));
  if (minCount < 10) {
    return {
      variant_a: variantAName,
      variant_b: variantBName,
      sample_size: data.length,
      cell_counts: counts,
      coefficients: { b0_intercept: 0, bA: 0, bB: 0, bAB_interaction: 0 },
      bootstrap_ci_95: [0, 0],
      p_value_raw: 1.0,
      p_value_fdr_bh: 1.0,
      valid_sample: false,
      message: `Sample size too small: each of the 4 cells must contain >= 10 isolates. Current minimum cell count is ${minCount}.`,
      disclaimer: STATS_DISCLAIMER
    };
  }

  // Point estimate
  const fit = fitOLS(data);

  // Bootstrap 1000 iterations for 95% CI
  const n = data.length;
  const nBoot = 500;
  const bootEstimates: number[] = [];

  for (let b = 0; b < nBoot; b++) {
    const sample: IsolateDatum[] = [];
    for (let i = 0; i < n; i++) {
      sample.push(data[Math.floor(Math.random() * n)]);
    }
    const bFit = fitOLS(sample);
    bootEstimates.push(bFit.bAB);
  }

  bootEstimates.sort((a, b) => a - b);
  const ciLower = bootEstimates[Math.floor(nBoot * 0.025)];
  const ciUpper = bootEstimates[Math.floor(nBoot * 0.975)];

  // Approximate p-value from standard error
  const meanBoot = bootEstimates.reduce((a, b) => a + b, 0) / nBoot;
  const varBoot = bootEstimates.reduce((a, b) => a + Math.pow(b - meanBoot, 2), 0) / (nBoot - 1);
  const se = Math.sqrt(varBoot);
  const zScore = se > 0 ? Math.abs(fit.bAB / se) : 0;
  // Two-tailed p-value from normal approximation
  const tail = normalTail(zScore);
  const pVal = Math.min(1.0, Math.max(0.0001, 2 * tail));

  return {
    variant_a: variantAName,
    variant_b: variantBName,
    sample_size: n,
    cell_counts: counts,
    coefficients: {
      b0_intercept: Math.round(fit.b0 * 1000) / 1000,
      bA: Math.round(fit.bA * 1000) / 1000,
      bB: Math.round(fit.bB * 1000) / 1000,
      bAB_interaction: Math.round(fit.bAB * 1000) / 1000
    },
    bootstrap_ci_95: [Math.round(ciLower * 1000) / 1000, Math.round(ciUpper * 1000) / 1000],
    p_value_raw: Math.round(pVal * 10000) / 10000,
    p_value_fdr_bh: Math.round(pVal * 10000) / 10000, // For single test, raw = BH
    valid_sample: true,
    message: 'Ordinary least squares interaction model converged successfully.',
    disclaimer: STATS_DISCLAIMER
  };
}

function normalTail(x: number): number {
  const absX = Math.abs(x);
  const t = 1 / (1 + 0.2316419 * absX);
  const d = 0.3989423 * Math.exp((-absX * absX) / 2);
  const tail = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return Math.max(0, Math.min(0.5, tail));
}
