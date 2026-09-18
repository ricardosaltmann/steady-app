import { describe, it, expect } from 'vitest';
import { formatCompoundDose, getWeeklyTotalDose } from '../doseFormatter';
import { Protocol } from '../../types';

describe('doseFormatter', () => {
  it('formats mg doses explicitly', () => {
    const res = formatCompoundDose(125, 'mg', 'mg');
    expect(res.fullText).toBe('125 mg');
    expect(res.displayUnit).toBe('mg');
    expect(res.displayValue).toBe(125);
  });

  it('converts mcg >= 1000 to mg', () => {
    const res = formatCompoundDose(2500, 'mcg', 'mcg');
    expect(res.fullText).toBe('2.5 mg');
    expect(res.displayUnit).toBe('mg');
    expect(res.displayValue).toBe(2.5);
  });

  it('preserves mcg < 1000 as mcg', () => {
    const res = formatCompoundDose(250, 'mcg', 'mcg');
    expect(res.fullText).toBe('250 mcg');
    expect(res.displayUnit).toBe('mcg');
    expect(res.displayValue).toBe(250);
  });

  it('converts fraction of mg to mcg when no unit specified', () => {
    const res = formatCompoundDose(0.25);
    expect(res.fullText).toBe('250 mcg');
    expect(res.displayUnit).toBe('mcg');
    expect(res.displayValue).toBe(250);
  });

  it('calculates weekly total dose accurately for weekly frequency', () => {
    const protocol: Protocol = {
      id: 'p1',
      name: 'TRT Semanal',
      compoundId: 'test_cypionate',
      dose: 100,
      unit: 'mg',
      frequency: 'weekly',
      route: 'IM',
      startDate: '2026-01-01',
      active: true,
    };
    expect(getWeeklyTotalDose(protocol)).toBe('100 mg/semana');
  });

  it('calculates weekly total dose accurately for daily frequency with microdosing', () => {
    const protocol: Protocol = {
      id: 'p2',
      name: 'GH Diário',
      compoundId: 'hgh',
      dose: 300,
      unit: 'mcg',
      frequency: 'daily',
      route: 'SubQ',
      startDate: '2026-01-01',
      active: true,
    };
    // 300 mcg * 7 = 2100 mcg = 2.1 mg
    expect(getWeeklyTotalDose(protocol)).toBe('2.1 mg/semana');
  });

  it('calculates weekly total dose in mcg if under 1 mg/week', () => {
    const protocol: Protocol = {
      id: 'p3',
      name: 'Microdose',
      compoundId: 'peptide',
      dose: 100,
      unit: 'mcg',
      frequency: 'eod', // 3.5 per week => 350 mcg
      route: 'SubQ',
      startDate: '2026-01-01',
      active: true,
    };
    expect(getWeeklyTotalDose(protocol)).toBe('350 mcg/semana');
  });
});
