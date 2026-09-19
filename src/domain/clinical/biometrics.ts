export interface IMCResult {
  value: number;
  label: string;
  color: string;
  badgeBg: string;
}

/**
 * Calcula o Índice de Massa Corporal (IMC) com classificação clínica segundo a OMS.
 */
export function calculateIMC(weightKg: number, heightCm: number): IMCResult {
  if (!weightKg || !heightCm || heightCm <= 0) {
    return { value: 0, label: 'Indefinido', color: 'text-slate-400', badgeBg: 'bg-slate-800 text-slate-300' };
  }
  const heightM = heightCm / 100;
  const imc = parseFloat((weightKg / (heightM * heightM)).toFixed(1));

  if (imc < 18.5) return { value: imc, label: 'Abaixo do peso', color: 'text-sky-400', badgeBg: 'bg-sky-950/70 border border-sky-800/60 text-sky-300' };
  if (imc < 25.0) return { value: imc, label: 'Peso Saudável', color: 'text-emerald-400', badgeBg: 'bg-emerald-950/70 border border-emerald-800/60 text-emerald-300' };
  if (imc < 30.0) return { value: imc, label: 'Sobrepeso', color: 'text-amber-400', badgeBg: 'bg-amber-950/70 border border-amber-800/60 text-amber-300' };
  if (imc < 35.0) return { value: imc, label: 'Obesidade Grau I', color: 'text-orange-400', badgeBg: 'bg-orange-950/70 border border-orange-800/60 text-orange-300' };
  if (imc < 40.0) return { value: imc, label: 'Obesidade Grau II', color: 'text-rose-400', badgeBg: 'bg-rose-950/70 border border-rose-800/60 text-rose-300' };
  return { value: imc, label: 'Obesidade Grau III', color: 'text-red-400', badgeBg: 'bg-red-950/70 border border-red-800/60 text-red-300' };
}
