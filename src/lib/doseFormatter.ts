import { Compound, Protocol } from '../types';

/**
 * Formata a dose e unidade para exibição amigável ao usuário.
 * 
 * Regras:
 * 1. Se o protocolo/chamada tiver unidade explícita ('mg' ou 'mcg'):
 *    - Se 'mg': exibe sempre em mg (ex: 1 mg, 2.5 mg, 50 mg).
 *    - Se 'mcg': se dose >= 1000, entende e exibe como mg (ex: 1000 mcg = 1 mg). Caso contrário, exibe em mcg.
 * 2. Se não houver unidade explícita especificada:
 *    - Se a dose for >= 1000: entende como mcg >= 1000 e converte para mg (ex: 1000 -> 1 mg).
 *    - Se a dose for de 1 em diante (ex: 1, 2.5, 5, 50, 125, 250): entende como mg!
 *    - Se a dose for menor que 1 (ex: 0.1, 0.25): entende como fração de mg e converte para mcg (0.1 mg -> 100 mcg).
 */
export function formatCompoundDose(
  dose: number,
  compoundUnit?: string,
  protocolUnit?: 'mg' | 'mcg'
): {
  displayValue: number;
  displayUnit: string;
  fullText: string;
} {
  // 1. Respeita a unidade explícita se informada
  if (protocolUnit === 'mg') {
    const val = parseFloat(dose.toFixed(2));
    return {
      displayValue: val,
      displayUnit: 'mg',
      fullText: `${val} mg`,
    };
  }

  if (protocolUnit === 'mcg') {
    // 1000mcg em diante entende e exibe como mg (ex: 1000 mcg = 1 mg)
    if (dose >= 1000) {
      const inMg = parseFloat((dose / 1000).toFixed(2));
      return {
        displayValue: inMg,
        displayUnit: 'mg',
        fullText: `${inMg} mg`,
      };
    }
    const val = parseFloat(dose.toFixed(1));
    return {
      displayValue: val,
      displayUnit: 'mcg',
      fullText: `${val} mcg`,
    };
  }

  // 2. Regra inteligente automática para valores genéricos:
  // Se for >= 1000 (ex: 1000mcg): entende como mg
  if (dose >= 1000) {
    const inMg = parseFloat((dose / 1000).toFixed(2));
    return {
      displayValue: inMg,
      displayUnit: 'mg',
      fullText: `${inMg} mg`,
    };
  }

  // De 1 em diante: entende como mg (ex: 1 mg, 2.5 mg, 5 mg, 50 mg, 125 mg)
  if (dose >= 1) {
    const inMg = parseFloat(dose.toFixed(2));
    const unit = compoundUnit === 'mcg' && dose < 10 ? 'mg' : (compoundUnit || 'mg');
    return {
      displayValue: inMg,
      displayUnit: unit,
      fullText: `${inMg} ${unit}`,
    };
  }

  // Frações menores que 1 (ex: 0.1 mg, 0.25 mg): exibe em mcg
  const inMcg = parseFloat((dose * 1000).toFixed(1));
  return {
    displayValue: inMcg,
    displayUnit: 'mcg',
    fullText: `${inMcg} mcg`,
  };
}

/**
 * Retorna a dose formatada com a via de aplicação: "100 mcg (SubQ)" ou "2.5 mg (SubQ)".
 */
export function formatProtocolDoseWithRoute(p: Protocol, comp?: Compound): string {
  const formatted = formatCompoundDose(p.dose, comp?.unit, p.unit);
  return `${formatted.fullText} (${p.route})`;
}

/**
 * Calcula o total semanal equivalente de um protocolo.
 * Se o total semanal for de 1 em diante, exibe em mg (ex: 2.5 mg/semana, 17.5 mg/semana).
 * Se o total semanal for menor que 1 mg (ex: 0.1 mg * 7 = 0.7 mg), exibe em mcg (700 mcg/semana).
 */
export function getWeeklyTotalDose(p: Protocol, comp?: Compound): string {
  let multiplier = 1;
  switch (p.frequency) {
    case 'daily': multiplier = 7; break;
    case 'eod': multiplier = 3.5; break;
    case 'every_3_5_days': multiplier = 2; break;
    case 'weekly': multiplier = 1; break;
    case 'biweekly': multiplier = 0.5; break;
    case 'monthly': multiplier = 0.25; break;
    case 'every_x_days': multiplier = p.intervalDays ? 7 / p.intervalDays : 2; break;
  }

  // Normalizar a dose por aplicação em mg
  let doseInMg = p.dose;
  if (p.unit === 'mcg') {
    doseInMg = p.dose / 1000;
  } else if (p.dose >= 1000) {
    doseInMg = p.dose / 1000;
  }

  const weeklyMg = doseInMg * multiplier;

  // De 1 em diante, exibe em mg
  if (weeklyMg >= 1) {
    return `${parseFloat(weeklyMg.toFixed(2))} mg/semana`;
  }

  // Frações menores que 1 mg: exibe em mcg
  const weeklyMcg = parseFloat((weeklyMg * 1000).toFixed(1));
  return `${weeklyMcg} mcg/semana`;
}
