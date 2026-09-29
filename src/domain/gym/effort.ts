/**
 * Effort & Exertion Mapping (RPE / RIR)
 *
 * RPE: 1-10 Borg-style scale adapted for resistance training.
 * RIR: Reps In Reserve (how many more reps could be completed with good form).
 *
 * Relationship: RPE 10 = 0 RIR, RPE 9 = 1 RIR, RPE 8 = 2 RIR, RPE 7 = 3 RIR.
 */

export interface EffortRating {
  rpe?: number;
  rir?: number;
  description: string;
}

export function rpeToRir(rpe: number): number {
  const bounded = Math.max(6, Math.min(10, rpe));
  return Math.max(0, Math.round(10 - bounded));
}

export function rirToRpe(rir: number): number {
  const bounded = Math.max(0, Math.min(5, rir));
  return 10 - bounded;
}

export function getEffortDescription(rating: { rpe?: number; rir?: number }): string {
  const rir = rating.rir !== undefined ? rating.rir : (rating.rpe !== undefined ? rpeToRir(rating.rpe) : null);

  if (rir === null) return 'Sem avaliação de esforço';

  switch (rir) {
    case 0:
      return 'Esforço Máximo (Falha / 0 repetições na reserva)';
    case 1:
      return 'Muito Intenso (1 repetição na reserva)';
    case 2:
      return 'Intenso (2 repetições na reserva - Padrão Hipertrofia)';
    case 3:
      return 'Moderado (3 repetições na reserva)';
    case 4:
      return 'Leve (4 repetições na reserva)';
    default:
      return 'Aquecimento ou Série Leve (>4 repetições na reserva)';
  }
}
