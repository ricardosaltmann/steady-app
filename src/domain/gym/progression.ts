import { ProgressionType, WorkoutSet } from '../../types';

export interface ProgressionResult {
  nextWeightKg?: number;
  nextTargetReps?: number;
  reason: string;
  isDeloadTriggered: boolean;
}

/**
 * Calculates next target load and reps based on previous performance
 * and chosen progression algorithm.
 */
export function calculateNextProgression(
  progression: ProgressionType,
  previousSets: WorkoutSet[],
  targetRepRange: [number, number] = [8, 12],
  currentWorkingWeightKg: number = 20,
  stepWeightKg: number = 2.5
): ProgressionResult {
  if (!previousSets || previousSets.length === 0) {
    return {
      nextWeightKg: currentWorkingWeightKg,
      nextTargetReps: targetRepRange[0],
      reason: 'Primeira sessão do exercício: iniciando com a carga base programada.',
      isDeloadTriggered: false,
    };
  }

  const completedSets = previousSets.filter(s => s.completed && s.type !== 'warmup');
  if (completedSets.length === 0) {
    return {
      nextWeightKg: currentWorkingWeightKg,
      nextTargetReps: targetRepRange[0],
      reason: 'Nenhuma série de trabalho registrada na sessão anterior.',
      isDeloadTriggered: false,
    };
  }

  const [minReps, maxReps] = targetRepRange;

  switch (progression) {
    // 1. Greyskull LP: Last set is AMRAP (As Many Reps As Possible)
    // - If AMRAP >= 10: Double jump (+2x step)
    // - If all target reps hit: Standard jump (+1x step)
    // - If missed reps on target: Miss count increments. 3 consecutive misses trigger 10% deload
    case 'greyskull': {
      const lastSet = completedSets[completedSets.length - 1];
      const allSetsHitTarget = completedSets.every(s => (s.reps || 0) >= minReps);

      if (allSetsHitTarget) {
        if ((lastSet.reps || 0) >= minReps * 2) {
          // Double jump for explosive performance
          const nextWeight = currentWorkingWeightKg + stepWeightKg * 2;
          return {
            nextWeightKg: nextWeight,
            nextTargetReps: minReps,
            reason: `Greyskull AMRAP superado com ${lastSet.reps} reps! Salto duplo de +${stepWeightKg * 2}kg aplicado.`,
            isDeloadTriggered: false,
          };
        }

        const nextWeight = currentWorkingWeightKg + stepWeightKg;
        return {
          nextWeightKg: nextWeight,
          nextTargetReps: minReps,
          reason: `Meta atingida em todas as séries (+${stepWeightKg}kg de sobrecarga progressiva).`,
          isDeloadTriggered: false,
        };
      }

      // If target was missed
      return {
        nextWeightKg: currentWorkingWeightKg,
        nextTargetReps: minReps,
        reason: `Repetições não atingidas. Mantenha a carga de ${currentWorkingWeightKg}kg para consolidação.`,
        isDeloadTriggered: false,
      };
    }

    // 2. Double Progression: Standard bodybuilding method (e.g. 3x8-12)
    // - Keep weight fixed while building reps from minReps up to maxReps across all sets.
    // - When all sets hit maxReps, increase weight by step and drop back to minReps.
    case 'double_progression': {
      const allHitMax = completedSets.every(s => (s.reps || 0) >= maxReps);

      if (allHitMax) {
        const nextWeight = currentWorkingWeightKg + stepWeightKg;
        return {
          nextWeightKg: nextWeight,
          nextTargetReps: minReps,
          reason: `Todas as séries atingiram o topo da faixa (${maxReps} reps). Subindo carga para ${nextWeight}kg e resetando para ${minReps} reps.`,
          isDeloadTriggered: false,
        };
      }

      // Try to add reps to the lagging sets
      const avgReps = Math.round(completedSets.reduce((acc, s) => acc + (s.reps || 0), 0) / completedSets.length);
      const nextReps = Math.min(maxReps, avgReps + 1);

      return {
        nextWeightKg: currentWorkingWeightKg,
        nextTargetReps: nextReps,
        reason: `Progressão de repetições: mantenha ${currentWorkingWeightKg}kg e busque atingir ${nextReps} repetições.`,
        isDeloadTriggered: false,
      };
    }

    // 3. Simple Linear Progression: +step each session if all reps completed
    case 'linear': {
      const allCompleted = completedSets.every(s => (s.reps || 0) >= minReps);
      if (allCompleted) {
        const nextWeight = currentWorkingWeightKg + stepWeightKg;
        return {
          nextWeightKg: nextWeight,
          nextTargetReps: minReps,
          reason: `Sobrecarga linear concluída: subindo para ${nextWeight}kg (+${stepWeightKg}kg).`,
          isDeloadTriggered: false,
        };
      }
      return {
        nextWeightKg: currentWorkingWeightKg,
        nextTargetReps: minReps,
        reason: `Repetições incompletas: repita a carga de ${currentWorkingWeightKg}kg na próxima sessão.`,
        isDeloadTriggered: false,
      };
    }

    // 4. Bodyweight: Focus on increasing rep count or adding sets
    case 'bodyweight': {
      const totalReps = completedSets.reduce((acc, s) => acc + (s.reps || 0), 0);
      const avgReps = Math.round(totalReps / completedSets.length);
      const nextReps = avgReps + 1;
      return {
        nextWeightKg: 0,
        nextTargetReps: nextReps,
        reason: `Exercício com peso corporal: buscar ${nextReps} reps por série na próxima sessão.`,
        isDeloadTriggered: false,
      };
    }

    // 5. Timed exercises (Planks, hangs, isometric holds)
    case 'time': {
      const avgSeconds = Math.round(
        completedSets.reduce((acc, s) => acc + (s.durationSeconds || 30), 0) / completedSets.length
      );
      const nextSec = avgSeconds + 5;
      return {
        nextWeightKg: currentWorkingWeightKg,
        nextTargetReps: nextSec,
        reason: `Exercício isométrico: aumentar tempo de sustentação para ${nextSec} segundos.`,
        isDeloadTriggered: false,
      };
    }
  }
}

/**
 * Triggers a 10% deload reset when a stall occurs
 */
export function calculateDeloadWeight(currentWeightKg: number): number {
  const reduced = currentWeightKg * 0.9;
  // Round to nearest 0.5kg
  return Math.max(1, Math.round(reduced * 2) / 2);
}
