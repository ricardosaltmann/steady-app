import { Compound, Injection, Protocol, LabResult } from '../types';

export interface CurveDataPoint {
  timestamp: number;        // ms
  dateLabel: string;        // '12/09 14:00'
  dayLabel: string;         // '12 Set'
  isFuture: boolean;
  actualLevel: number;      // based on logged injections
  projectedLevel: number;   // includes scheduled future protocol doses
  injectionPoint?: {
    dose: number;
    unit: string;
    compoundName: string;
    site: string;
  };
  labPoint?: {
    markerCode: string;
    value: number;
    unit: string;
  };
}

export interface SerumSummary {
  currentLevel: number;
  unit: string;
  status: 'peak' | 'dropping' | 'trough' | 'steady';
  trendPercentage24h: number;
  lastInjection?: Injection;
  nextProjectedDose?: {
    date: Date;
    dose: number;
    protocolName: string;
  };
  estimatedPeakDate?: Date;
  estimatedPeakValue?: number;
  estimatedTroughValue?: number;
}

/**
 * Solves for ka given ke and desired Tmax using Newton's method.
 * Tmax = ln(ka / ke) / (ka - ke)
 */
export function calculateAbsorptionRate(halfLifeDays: number, peakHours: number): { ke: number; ka: number } {
  const ke = Math.LN2 / Math.max(0.2, halfLifeDays);
  const tmaxDays = Math.max(0.1, peakHours / 24);

  // If tmax is very small or close to ke, default to a sensible ratio
  let ka = 4.0 * ke;

  // 10 iterations of Newton-Raphson to match Tmax
  for (let i = 0; i < 12; i++) {
    if (Math.abs(ka - ke) < 1e-6) ka = ke + 0.05;
    const f = (Math.log(ka / ke) / (ka - ke)) - tmaxDays;
    // Derivative of f with respect to ka:
    // f'(ka) = [ (1/ka)*(ka - ke) - ln(ka/ke) ] / (ka - ke)^2
    const num = (1 - ke / ka) - Math.log(ka / ke);
    const den = Math.pow(ka - ke, 2);
    const fPrime = num / den;
    if (Math.abs(fPrime) < 1e-8) break;
    const nextKa = ka - f / fPrime;
    if (nextKa <= ke) {
      ka = ke * 1.5;
      break;
    }
    ka = nextKa;
  }

  return { ke, ka: Math.max(ka, ke * 1.2) };
}

/**
 * Single injection concentration at time delta (in days).
 * Bateman function: C(t) = D * F * (ka / (ka - ke)) * (e^(-ke * t) - e^(-ka * t))
 */
export function getSingleDoseConcentration(
  dose: number,
  deltaDays: number,
  halfLifeDays: number,
  peakHours: number,
  bioavailability: number = 1.0
): number {
  if (deltaDays < 0) return 0;
  const { ke, ka } = calculateAbsorptionRate(halfLifeDays, peakHours);
  
  // Normalization factor so the integral or scale behaves predictably
  const peakTmax = Math.log(ka / ke) / (ka - ke);
  const maxConcentrationUnscaled = (ka / (ka - ke)) * (Math.exp(-ke * peakTmax) - Math.exp(-ka * peakTmax));
  const scale = maxConcentrationUnscaled > 0 ? 1 / maxConcentrationUnscaled : 1;

  // Theoretical relative peak equals the administered dose * bioavailability
  const val = dose * bioavailability * scale * (ka / (ka - ke)) * (Math.exp(-ke * deltaDays) - Math.exp(-ka * deltaDays));
  return Math.max(0, val);
}

/**
 * Scales arbitrary relative dose release to standard biomarker ranges (e.g. ng/dL for testosterone)
 */
export function scaleToClinicalUnits(compound: Compound, relativeLevel: number): number {
  if (compound.category === 'steroid') {
    if (compound.subcategory === 'Testosterona' || compound.id.startsWith('test_') || compound.id === 'sustanon_blend') {
      // Steady state: ~100mg/week of cypionate yields ~700-800 ng/dL in standard responders
      return Math.round(relativeLevel * 8.5);
    }
    // Outros anabólicos (Deca, Primo, Masteron, Trembo, Boldenona): release rate ativo em mg
    return Number((relativeLevel * 0.75).toFixed(1));
  }

  switch (compound.category) {
    case 'estrogen':
      // 5mg valerate weekly yields ~150-300 pg/mL
      return Math.round(relativeLevel * 50);
    case 'peptide':
      // Tirzepatide/Semaglutide/BPC: shown in active circulating amount
      if (compound.unit === 'mcg') {
        return Math.round(relativeLevel * 1.5);
      }
      return Number((relativeLevel * 0.15).toFixed(2));
    case 'fertility':
      // hCG in circulating IU
      return Math.round(relativeLevel * 1.2);
    default:
      return Number(relativeLevel.toFixed(1));
  }
}

export function getDisplayUnit(compound: Compound): string {
  if (compound.category === 'steroid') {
    if (compound.subcategory === 'Testosterona' || compound.id.startsWith('test_') || compound.id === 'sustanon_blend') {
      return 'ng/dL';
    }
    return 'mg ativo';
  }

  switch (compound.category) {
    case 'estrogen':
      return 'pg/mL';
    case 'peptide':
      return compound.unit === 'mcg' ? 'mcg ativo' : 'mg ativo';
    case 'fertility':
      return 'IU';
    default:
      return 'índice';
  }
}

/**
 * Computes projected future dates for an active protocol
 */
export function getUpcomingProtocolDoses(
  protocol: Protocol,
  fromTime: number,
  daysForward: number
): { timestamp: number; dose: number; protocolName: string }[] {
  if (!protocol.active) return [];
  const results: { timestamp: number; dose: number; protocolName: string }[] = [];
  const startMs = new Date(protocol.startDate).getTime();
  const endMs = fromTime + daysForward * 86400000;

  if (protocol.frequency === 'daily') {
    let curr = Math.max(fromTime, startMs);
    while (curr <= endMs) {
      results.push({ timestamp: curr, dose: protocol.dose, protocolName: protocol.name });
      curr += 86400000;
    }
  } else if (protocol.frequency === 'eod') {
    let curr = startMs;
    while (curr <= endMs) {
      if (curr >= fromTime) {
        results.push({ timestamp: curr, dose: protocol.dose, protocolName: protocol.name });
      }
      curr += 2 * 86400000;
    }
  } else if (protocol.frequency === 'every_3_5_days') {
    let curr = startMs;
    let stepCount = 0;
    while (curr <= endMs) {
      if (curr >= fromTime) {
        results.push({ timestamp: curr, dose: protocol.dose, protocolName: protocol.name });
      }
      curr += (stepCount % 2 === 0 ? 3.5 : 3.5) * 86400000;
      stepCount++;
    }
  } else if (protocol.frequency === 'weekly') {
    let curr = startMs;
    while (curr <= endMs) {
      if (curr >= fromTime) {
        results.push({ timestamp: curr, dose: protocol.dose, protocolName: protocol.name });
      }
      curr += 7 * 86400000;
    }
  } else if (protocol.frequency === 'every_x_days' && protocol.intervalDays) {
    let curr = startMs;
    const intervalMs = protocol.intervalDays * 86400000;
    while (curr <= endMs) {
      if (curr >= fromTime) {
        results.push({ timestamp: curr, dose: protocol.dose, protocolName: protocol.name });
      }
      curr += intervalMs;
    }
  }

  return results;
}

/**
 * Builds the complete time series curve for rendering in Recharts
 */
export function generateSerumCurve(
  compound: Compound,
  injections: Injection[],
  protocols: Protocol[],
  labs: LabResult[] = [],
  options: { daysPast?: number; daysFuture?: number; stepHours?: number } = {}
): { points: CurveDataPoint[]; summary: SerumSummary } {
  const daysPast = options.daysPast ?? 21;
  const daysFuture = options.daysFuture ?? 14;
  const stepHours = options.stepHours ?? 6;

  const now = Date.now();
  const startTime = now - daysPast * 86400000;
  const endTime = now + daysFuture * 86400000;
  const stepMs = stepHours * 3600000;

  // Filter injections relevant to this compound
  const relevantInjections = injections.filter(inj => inj.compoundId === compound.id);
  const activeProtocols = protocols.filter(p => p.compoundId === compound.id && p.active);

  // Generate future scheduled doses
  const futureDoses: { timestamp: number; dose: number; protocolName: string }[] = [];
  activeProtocols.forEach(proto => {
    const doses = getUpcomingProtocolDoses(proto, now, daysFuture + 5);
    futureDoses.push(...doses);
  });

  const points: CurveDataPoint[] = [];

  // Helper to format dates
  const formatDateLabel = (d: Date) => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    return `${day}/${month} ${hour}h`;
  };

  const formatDayLabel = (d: Date) => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${d.getDate()} ${months[d.getMonth()]}`;
  };

  let currentLevel = 0;
  let level24hAgo = 0;
  const nowMinus24h = now - 86400000;

  for (let t = startTime; t <= endTime; t += stepMs) {
    const isFuture = t > now;
    const dateObj = new Date(t);

    // Sum actual injections
    let actualSum = 0;
    relevantInjections.forEach(inj => {
      const injTime = new Date(inj.date).getTime();
      if (t >= injTime) {
        const deltaDays = (t - injTime) / 86400000;
        actualSum += getSingleDoseConcentration(
          inj.dose,
          deltaDays,
          compound.halfLifeDays,
          compound.peakHours,
          compound.bioavailability ?? 1.0
        );
      }
    });

    // Projected level includes both past injections and planned future doses
    let projectedSum = actualSum;
    if (isFuture) {
      futureDoses.forEach(dose => {
        if (t >= dose.timestamp) {
          const deltaDays = (t - dose.timestamp) / 86400000;
          projectedSum += getSingleDoseConcentration(
            dose.dose,
            deltaDays,
            compound.halfLifeDays,
            compound.peakHours,
            compound.bioavailability ?? 1.0
          );
        }
      });
    }

    const scaledActual = scaleToClinicalUnits(compound, actualSum);
    const scaledProjected = scaleToClinicalUnits(compound, projectedSum);

    // Check if an injection happened close to this step
    const matchedInj = relevantInjections.find(inj => {
      const injMs = new Date(inj.date).getTime();
      return Math.abs(injMs - t) <= stepMs / 2;
    });

    // Check if a lab result exists close to this time
    let labMatch: { markerCode: string; value: number; unit: string } | undefined;
    labs.forEach(lab => {
      const labMs = new Date(lab.date).getTime();
      if (Math.abs(labMs - t) <= 12 * 3600000) {
        const relevantMarker = lab.markers.find(m => {
          if (compound.category === 'steroid' && (compound.subcategory === 'Testosterona' || compound.id.startsWith('test_') || compound.id === 'sustanon_blend') && (m.markerCode === 'total_t' || m.markerCode === 'tot_t')) return true;
          if (compound.category === 'estrogen' && m.markerCode === 'e2') return true;
          return false;
        });
        if (relevantMarker) {
          labMatch = {
            markerCode: relevantMarker.markerCode,
            value: relevantMarker.value,
            unit: relevantMarker.unit,
          };
        }
      }
    });

    // Record values for summary calculation
    if (Math.abs(t - now) < stepMs) {
      currentLevel = scaledActual;
    }
    if (Math.abs(t - nowMinus24h) < stepMs) {
      level24hAgo = scaledActual;
    }

    points.push({
      timestamp: t,
      dateLabel: formatDateLabel(dateObj),
      dayLabel: formatDayLabel(dateObj),
      isFuture,
      actualLevel: isFuture ? (null as unknown as number) : scaledActual,
      projectedLevel: scaledProjected,
      injectionPoint: matchedInj ? {
        dose: matchedInj.dose,
        unit: compound.unit,
        compoundName: compound.name,
        site: matchedInj.site,
      } : undefined,
      labPoint: labMatch,
    });
  }

  // Summary trends
  const trend = level24hAgo > 0 
    ? Number((((currentLevel - level24hAgo) / level24hAgo) * 100).toFixed(1))
    : 0;

  let status: SerumSummary['status'] = 'steady';
  if (trend > 5) status = 'peak';
  else if (trend < -5) status = 'dropping';
  else status = 'steady';

  // Find next projected dose
  const nextDose = futureDoses
    .filter(d => d.timestamp > now)
    .sort((a, b) => a.timestamp - b.timestamp)[0];

  // Latest injection
  const sortedInjections = [...relevantInjections].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const lastInjection = sortedInjections[0];

  const summary: SerumSummary = {
    currentLevel,
    unit: getDisplayUnit(compound),
    status,
    trendPercentage24h: trend,
    lastInjection,
    nextProjectedDose: nextDose ? {
      date: new Date(nextDose.timestamp),
      dose: nextDose.dose,
      protocolName: nextDose.protocolName,
    } : undefined,
  };

  return { points, summary };
}
