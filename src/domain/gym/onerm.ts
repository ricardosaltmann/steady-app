/**
 * One-Rep Max (1RM) Estimations & Strength Percentages
 * Based on proven clinical and sports science formulas (Brzycki & Epley).
 */

export interface OneRmEstimate {
  oneRmKg: number;
  formula: 'brzycki' | 'epley';
  percentages: { percentage: number; weightKg: number; targetReps: number }[];
}

/**
 * Calculates estimated 1RM using Brzycki formula:
 * 1RM = Weight / (1.0278 - (0.0278 * Reps))
 *
 * For reps > 10, falls back to Epley:
 * 1RM = Weight * (1 + (Reps / 30))
 *
 * Capped at 12 reps: beyond 12 reps, anaerobic endurance dominates
 * and 1RM estimations become clinically unreliable.
 */
export function estimateOneRm(weightKg: number, reps: number): OneRmEstimate | null {
  if (weightKg <= 0 || reps <= 0) return null;
  if (reps === 1) {
    return {
      oneRmKg: Math.round(weightKg * 10) / 10,
      formula: 'brzycki',
      percentages: calculatePercentages(weightKg),
    };
  }

  // Safety cap: beyond 12 reps, estimations deviate significantly
  if (reps > 12) return null;

  let estimate: number;
  let formula: 'brzycki' | 'epley';

  if (reps <= 10) {
    estimate = weightKg / (1.0278 - 0.0278 * reps);
    formula = 'brzycki';
  } else {
    estimate = weightKg * (1 + reps / 30);
    formula = 'epley';
  }

  const rounded = Math.round(estimate * 10) / 10;
  return {
    oneRmKg: rounded,
    formula,
    percentages: calculatePercentages(rounded),
  };
}

/**
 * Common working weight intensities based on 1RM
 */
function calculatePercentages(oneRm: number) {
  const table = [
    { percentage: 95, targetReps: 2 },
    { percentage: 90, targetReps: 4 },
    { percentage: 85, targetReps: 6 },
    { percentage: 80, targetReps: 8 },
    { percentage: 75, targetReps: 10 },
    { percentage: 70, targetReps: 12 },
  ];

  return table.map(item => ({
    percentage: item.percentage,
    weightKg: Math.round(((oneRm * item.percentage) / 100) * 10) / 10,
    targetReps: item.targetReps,
  }));
}
