import { describe, it, expect } from 'vitest';
import {
  estimateOneRm,
  rpeToRir,
  rirToRpe,
  getEffortDescription,
  calculateNextProgression,
  calculateDeloadWeight,
  DEFAULT_EXERCISES,
  STARTER_ROUTINES,
} from '../index';
import { WorkoutSet } from '../../../types';

describe('Gym Domain Engine Tests', () => {
  describe('1RM Estimations', () => {
    it('returns exact weight for 1 rep', () => {
      const res = estimateOneRm(100, 1);
      expect(res).not.toBeNull();
      expect(res?.oneRmKg).toBe(100);
      expect(res?.formula).toBe('brzycki');
      expect(res?.percentages).toHaveLength(6);
    });

    it('estimates 1RM using Brzycki formula for <= 10 reps', () => {
      // 100kg x 5 reps -> 100 / (1.0278 - 0.0278 * 5) ≈ 112.5 kg
      const res = estimateOneRm(100, 5);
      expect(res).not.toBeNull();
      expect(res?.oneRmKg).toBe(112.5);
      expect(res?.formula).toBe('brzycki');
    });

    it('estimates 1RM using Epley formula for reps between 11 and 12', () => {
      // 80kg x 12 reps -> 80 * (1 + 12 / 30) = 112 kg
      const res = estimateOneRm(80, 12);
      expect(res).not.toBeNull();
      expect(res?.oneRmKg).toBe(112);
      expect(res?.formula).toBe('epley');
    });

    it('returns null for reps above 12 to prevent unreliable estimations', () => {
      const res = estimateOneRm(60, 15);
      expect(res).toBeNull();
    });

    it('handles negative or zero values safely', () => {
      expect(estimateOneRm(0, 5)).toBeNull();
      expect(estimateOneRm(100, 0)).toBeNull();
    });
  });

  describe('Effort Mapping (RPE / RIR)', () => {
    it('correctly maps RPE to RIR', () => {
      expect(rpeToRir(10)).toBe(0); // Failure
      expect(rpeToRir(9)).toBe(1);
      expect(rpeToRir(8)).toBe(2);
      expect(rpeToRir(7)).toBe(3);
    });

    it('correctly maps RIR to RPE', () => {
      expect(rirToRpe(0)).toBe(10);
      expect(rirToRpe(1)).toBe(9);
      expect(rirToRpe(2)).toBe(8);
      expect(rirToRpe(3)).toBe(7);
    });

    it('returns informative clinical exertion descriptions', () => {
      expect(getEffortDescription({ rir: 0 })).toContain('Falha');
      expect(getEffortDescription({ rir: 2 })).toContain('Hipertrofia');
      expect(getEffortDescription({ rpe: 10 })).toContain('Falha');
    });
  });

  describe('Progression Overload Rules', () => {
    const mockSets = (repsList: number[]): WorkoutSet[] => {
      return repsList.map((reps, idx) => ({
        id: `set_${idx}`,
        setNumber: idx + 1,
        type: 'normal',
        reps,
        completed: true,
      }));
    };

    it('Greyskull LP: triggers double jump when AMRAP >= 2x minimum reps', () => {
      // Target range [5, 8], minReps = 5. AMRAP set hits 10 reps (2x min)
      const sets = mockSets([5, 5, 10]);
      const res = calculateNextProgression('greyskull', sets, [5, 8], 80, 2.5);

      expect(res.nextWeightKg).toBe(85); // 80 + 2.5 * 2 = 85
      expect(res.reason).toContain('Salto duplo');
      expect(res.isDeloadTriggered).toBe(false);
    });

    it('Greyskull LP: triggers single jump when target is reached normally', () => {
      const sets = mockSets([5, 5, 6]);
      const res = calculateNextProgression('greyskull', sets, [5, 8], 80, 2.5);

      expect(res.nextWeightKg).toBe(82.5); // 80 + 2.5 = 82.5
      expect(res.reason).toContain('+2.5kg');
    });

    it('Double Progression: increases weight when all sets reach maxReps', () => {
      // Target range [8, 12]. All sets hit 12
      const sets = mockSets([12, 12, 12]);
      const res = calculateNextProgression('double_progression', sets, [8, 12], 50, 2.5);

      expect(res.nextWeightKg).toBe(52.5);
      expect(res.nextTargetReps).toBe(8); // resets to bottom of rep range
      expect(res.reason).toContain('Subindo carga');
    });

    it('Double Progression: increments target reps when not at maxReps yet', () => {
      // Sets hit 9, 9, 8 (avg ~9)
      const sets = mockSets([9, 9, 8]);
      const res = calculateNextProgression('double_progression', sets, [8, 12], 50, 2.5);

      expect(res.nextWeightKg).toBe(50); // weight remains fixed
      expect(res.nextTargetReps).toBe(10); // asks for +1 rep
    });

    it('Deload reset: calculates clean 10% reduction rounded to 0.5kg', () => {
      expect(calculateDeloadWeight(100)).toBe(90);
      expect(calculateDeloadWeight(82.5)).toBe(74.5);
    });
  });

  describe('Database and Starters Integrity', () => {
    it('contains comprehensive default exercises', () => {
      expect(DEFAULT_EXERCISES.length).toBeGreaterThanOrEqual(15);
      expect(DEFAULT_EXERCISES.some(e => e.bodyPart === 'chest')).toBe(true);
      expect(DEFAULT_EXERCISES.some(e => e.bodyPart === 'back')).toBe(true);
      expect(DEFAULT_EXERCISES.some(e => e.bodyPart === 'quads')).toBe(true);
    });

    it('contains valid starter routines', () => {
      expect(STARTER_ROUTINES).toHaveLength(3);
      expect(STARTER_ROUTINES[0].name).toContain('Push');
      expect(STARTER_ROUTINES[1].name).toContain('Pull');
      expect(STARTER_ROUTINES[2].name).toContain('Legs');
      expect(STARTER_ROUTINES[0].exercises.length).toBeGreaterThan(0);
    });
  });
});
