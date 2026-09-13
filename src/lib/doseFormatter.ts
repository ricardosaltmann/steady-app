import { Compound, Protocol } from '../types';

/**
 * Formata a dose e unidade para exibição amigável ao usuário.
 * Trata o caso de compostos em mcg (como peptídeos GHRP/GHRH, CJC-1295, etc.)
 * cujo valor armazenado no banco/estado é em miligramas (mg) (ex: 0.1 mg para 100 mcg).
 */
export function formatCompoundDose(dose: number, unit?: string): {
  displayValue: number;
  displayUnit: string;
  fullText: string;
} {
  const isMcg = unit === 'mcg';
  if (isMcg) {
    // Se a dose está salva em mg (ex: 0.1 mg), multiplica por 1000 para mcg
    // Se o valor já for maior que 20, assume que já está na escala de mcg
    const val = dose <= 20 ? dose * 1000 : dose;
    const displayValue = parseFloat(val.toFixed(1));
    return {
      displayValue,
      displayUnit: 'mcg',
      fullText: `${displayValue} mcg`,
    };
  }

  const displayValue = parseFloat(dose.toFixed(2));
  const displayUnit = unit || 'mg';
  return {
    displayValue,
    displayUnit,
    fullText: `${displayValue} ${displayUnit}`,
  };
}

/**
 * Retorna a dose formatada com a via de aplicação: "100 mcg (SubQ)" ou "125 mg (IM)".
 */
export function formatProtocolDoseWithRoute(p: Protocol, comp?: Compound): string {
  const formatted = formatCompoundDose(p.dose, comp?.unit);
  return `${formatted.fullText} (${p.route})`;
}

/**
 * Calcula o total semanal equivalente de um protocolo.
 * Caso a unidade seja mcg, converte o total em mg para mcg (ex: 0.1 mg * 7 = 0.7 mg -> 700 mcg/semana).
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

  const isMcg = comp?.unit === 'mcg';
  if (isMcg) {
    const weeklyMg = p.dose * multiplier;
    const weeklyVal = weeklyMg <= 100 ? weeklyMg * 1000 : weeklyMg;
    return `${parseFloat(weeklyVal.toFixed(1))} mcg/semana`;
  }

  const total = (p.dose * multiplier).toFixed(1);
  return `${total} ${comp?.unit || 'mg'}/semana`;
}
