import { ClinicalRule } from './clinicalRule';

export const DEFAULT_CLINICAL_RULES: ClinicalRule[] = [
  {
    id: 'rule_hematocrit_safety',
    version: '1.0.0',
    name: 'Alerta de Hematócrito Elevado (Eritrocitose)',
    description: 'Monitoramento de segurança cardiovascular em terapia de reposição androgênica.',
    source: 'Endocrine Society Clinical Practice Guideline (TRT Safety Monitoring)',
    applicablePopulation: 'male',
    category: 'safety',
    enabled: true,
    logic: {
      evaluate: (hematocritPercent: number) => {
        if (hematocritPercent >= 54) {
          return {
            passed: false,
            status: 'critical',
            message: 'Hematócrito ≥ 54%. Risco aumentado de hiperviscosidade sanguínea. Avaliar ajuste de dose ou sangria terapêutica com médico.',
            value: hematocritPercent,
          };
        }
        if (hematocritPercent >= 50) {
          return {
            passed: true,
            status: 'warning',
            message: 'Hematócrito em faixa de atenção (50-53%). Hidratação adequada e acompanhamento laboratorial recomendados.',
            value: hematocritPercent,
          };
        }
        return {
          passed: true,
          status: 'optimal',
          message: 'Hematócrito dentro dos limites terapêuticos seguros (< 50%).',
          value: hematocritPercent,
        };
      },
    },
  },
  {
    id: 'rule_testosterone_estradiol_ratio',
    version: '1.0.0',
    name: 'Relação Testosterona Total : Estradiol (T:E2)',
    description: 'Balanço estrogênico fisiológico em homens.',
    source: 'Consenso Clínico em Andrologia e Medicina Reprodutiva',
    applicablePopulation: 'male',
    category: 'hormones',
    enabled: true,
    logic: {
      evaluate: ({ testosteroneNgDl, estradiolPgMl }: { testosteroneNgDl: number; estradiolPgMl: number }) => {
        if (!testosteroneNgDl || !estradiolPgMl || estradiolPgMl <= 0) {
          return { passed: true, status: 'neutral', message: 'Dados insuficientes para cálculo da relação T:E2.' };
        }
        const ratio = parseFloat((testosteroneNgDl / estradiolPgMl).toFixed(1));
        if (ratio < 12) {
          return {
            passed: false,
            status: 'warning',
            message: `Relação T:E2 (${ratio}:1) relativamente baixa. Possível predomínio estrogênico.`,
            value: ratio,
          };
        }
        if (ratio > 30) {
          return {
            passed: false,
            status: 'warning',
            message: `Relação T:E2 (${ratio}:1) relativamente alta. Investigar eventual supressão excessiva de estradiol.`,
            value: ratio,
          };
        }
        return {
          passed: true,
          status: 'optimal',
          message: `Relação T:E2 equilibrada (${ratio}:1). Faixa típica fisiológica: 14:1 a 25:1.`,
          value: ratio,
        };
      },
    },
  },
];
