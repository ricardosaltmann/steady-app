import { LabMarker, LabResult } from '../types';
import { DEFAULT_LAB_MARKERS } from './defaultCompounds';

export interface MarkerStatusResult {
  status: 'normal' | 'high' | 'low' | 'proportional';
  label: string;
  badgeClass: string;
  description?: string;
  ratioTE2?: number;
}

export interface TE2RatioResult {
  ratio: number;
  totalT: number;
  e2: number;
  isOptimal: boolean;
  status: 'optimal' | 'high_e2' | 'low_e2';
  text: string;
  badgeClass: string;
}

/**
 * Calcula a relação Testosterona Total / Estradiol (T:E2).
 * Relação ideal/saudável em usuários de TRT: entre 14:1 e 20:1.
 */
export function getTE2Ratio(
  currentLab: LabResult,
  allLabs?: LabResult[]
): TE2RatioResult | null {
  const e2Val = currentLab.markers.find(m => m.markerCode === 'e2')?.value;
  if (!e2Val || e2Val <= 0) return null;

  // Busca Testosterona Total no mesmo exame
  let totalTVal = currentLab.markers.find(m => m.markerCode === 'total_t')?.value;

  // Se não encontrar no mesmo exame, busca no exame mais próximo cronologicamente
  if ((!totalTVal || totalTVal <= 0) && allLabs && allLabs.length > 0) {
    const labsWithT = allLabs
      .filter(l => l.id !== currentLab.id && l.markers.some(m => m.markerCode === 'total_t' && m.value > 0))
      .sort((a, b) => Math.abs(new Date(a.date).getTime() - new Date(currentLab.date).getTime()) - Math.abs(new Date(b.date).getTime() - new Date(currentLab.date).getTime()));
    
    totalTVal = labsWithT[0]?.markers.find(m => m.markerCode === 'total_t')?.value;
  }

  if (!totalTVal || totalTVal <= 0) return null;

  const ratio = totalTVal / e2Val;
  const roundedRatio = parseFloat(ratio.toFixed(1));

  if (ratio >= 14 && ratio <= 20) {
    return {
      ratio: roundedRatio,
      totalT: totalTVal,
      e2: e2Val,
      isOptimal: true,
      status: 'optimal',
      text: `${roundedRatio}:1 • Proporcional (Ideal TRT 14-20:1)`,
      badgeClass: 'text-emerald-400 bg-emerald-950/60 border-emerald-600/50',
    };
  }

  if (ratio < 14) {
    return {
      ratio: roundedRatio,
      totalT: totalTVal,
      e2: e2Val,
      isOptimal: false,
      status: 'high_e2',
      text: `${roundedRatio}:1 • E2 Elevado para a Testo (< 14:1)`,
      badgeClass: 'text-rose-400 bg-rose-950/60 border-rose-600/50',
    };
  }

  return {
    ratio: roundedRatio,
    totalT: totalTVal,
    e2: e2Val,
    isOptimal: false,
    status: 'low_e2',
    text: `${roundedRatio}:1 • E2 Baixo para a Testo (> 20:1)`,
    badgeClass: 'text-amber-400 bg-amber-950/60 border-amber-600/50',
  };
}

/**
 * Avalia o status do marcador laboratorial considerando faixas de referência
 * e validação inteligente (Smart Alert) de Estradiol em TRT.
 */
export function evaluateMarkerStatus(
  code: string,
  value: number,
  labMarkers?: { markerCode: string; value: number }[],
  gender: 'male' | 'female' | 'other' = 'male',
  allLabs?: LabResult[],
  currentLab?: LabResult
): MarkerStatusResult {
  const markerDef = DEFAULT_LAB_MARKERS.find(m => m.code === code);
  const ref = gender === 'female' ? markerDef?.femaleRef : markerDef?.maleRef;

  // Lógica Especial (Smart Alert) para Estradiol em TRT
  if (code === 'e2') {
    let totalTVal = labMarkers?.find(m => m.markerCode === 'total_t')?.value;
    
    // Se não encontrou no mesmo exame e temos currentLab e allLabs
    if ((!totalTVal || totalTVal <= 0) && currentLab && allLabs) {
      const te2Data = getTE2Ratio(currentLab, allLabs);
      if (te2Data) totalTVal = te2Data.totalT;
    }

    if (totalTVal && totalTVal > 0 && value > 0) {
      const ratio = totalTVal / value;
      const roundedRatio = parseFloat(ratio.toFixed(1));

      // Se o Estradiol estiver acima do valor de referência padrão,
      // mas a relação Testo/E2 estiver entre 14 e 20:
      if (ref && value > ref.max && ratio >= 14 && ratio <= 20) {
        return {
          status: 'proportional',
          label: 'OK (TRT)',
          badgeClass: 'text-teal-300 bg-teal-950/60 border-teal-600/60',
          description: `Relação T:E2: ${roundedRatio}:1 (Ideal: 14-20:1)`,
          ratioTE2: roundedRatio,
        };
      }

      // Se o Estradiol estiver acima do valor de referência e relação < 14:
      if (ref && value > ref.max && ratio < 14) {
        return {
          status: 'high',
          label: 'ALTO',
          badgeClass: 'text-rose-400 bg-rose-950/60 border-rose-700/60',
          description: `Relação T:E2: ${roundedRatio}:1 (E2 desproporcional)`,
          ratioTE2: roundedRatio,
        };
      }

      // Se o Estradiol estiver dentro da referência normal
      if (ref && value >= ref.min && value <= ref.max) {
        return {
          status: 'normal',
          label: 'OK',
          badgeClass: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40',
          description: `Relação T:E2: ${roundedRatio}:1`,
          ratioTE2: roundedRatio,
        };
      }

      // Se estiver abaixo do mínimo
      if (ref && value < ref.min) {
        return {
          status: 'low',
          label: 'BAIXO',
          badgeClass: 'text-amber-400 bg-amber-950/60 border-amber-700/60',
          description: `E2 Suprimido (${roundedRatio}:1)`,
          ratioTE2: roundedRatio,
        };
      }
    }
  }

  // Lógica padrão para todos os demais marcadores
  if (!ref) {
    return {
      status: 'normal',
      label: 'OK',
      badgeClass: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40',
    };
  }

  if (value > ref.max) {
    return {
      status: 'high',
      label: 'ALTO',
      badgeClass: 'text-rose-400 bg-rose-950/60 border-rose-700/60',
      description: `Acima do ref (${ref.max})`,
    };
  }

  if (value < ref.min) {
    return {
      status: 'low',
      label: 'BAIXO',
      badgeClass: 'text-amber-400 bg-amber-950/60 border-amber-700/60',
      description: `Abaixo do ref (${ref.min})`,
    };
  }

  return {
    status: 'normal',
    label: 'OK',
    badgeClass: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40',
    description: `Dentro da faixa (${ref.min} - ${ref.max})`,
  };
}
