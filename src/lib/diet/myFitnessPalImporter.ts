import { DailyDietData, FoodItem, MealType } from '../../types';
import { dietStorage } from './dietStorage';

export interface MyFitnessPalImportResult {
  success: boolean;
  daysImported: number;
  totalFoodsImported: number;
  message: string;
}

export function parseMyFitnessPalDate(rawDate: string): string | null {
  const clean = rawDate.trim().replace(/"/g, '');
  if (!clean) return null;

  // Format 1: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }

  // Format 2: DD/MM/YYYY or MM/DD/YYYY
  const parts = clean.split(/[-/.]/);
  if (parts.length === 3) {
    let year = parts[2];
    if (year.length === 2) year = '20' + year;

    const p0 = parseInt(parts[0], 10);
    const p1 = parseInt(parts[1], 10);

    // If p0 > 12, it is definitely DD/MM/YYYY
    if (p0 > 12) {
      const month = String(p1).padStart(2, '0');
      const day = String(p0).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } else {
      // Default to YYYY-MM-DD assuming MM/DD/YYYY (standard US MFP) or DD/MM
      const month = String(p0).padStart(2, '0');
      const day = String(p1).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return null;
}

function normalizeMealType(rawMeal: string): MealType {
  const lower = (rawMeal || '').toLowerCase().trim();
  if (lower.includes('café') || lower.includes('breakfast') || lower.includes('manha') || lower.includes('manhã')) {
    return 'breakfast';
  }
  if (lower.includes('almoço') || lower.includes('lunch') || lower.includes('almoco')) {
    return 'lunch';
  }
  if (lower.includes('jantar') || lower.includes('dinner') || lower.includes('ceia')) {
    return 'dinner';
  }
  return 'snack';
}

export const myFitnessPalImporter = {
  /**
   * Importa arquivo CSV exportado do MyFitnessPal
   */
  importCsv(csvContent: string, userId?: string): MyFitnessPalImportResult {
    if (!csvContent || !csvContent.trim()) {
      return { success: false, daysImported: 0, totalFoodsImported: 0, message: 'Arquivo CSV vazio.' };
    }

    const lines = csvContent
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0);

    if (lines.length < 2) {
      return { success: false, daysImported: 0, totalFoodsImported: 0, message: 'O arquivo não contém registros suficientes.' };
    }

    // Determine delimiter (comma or semicolon)
    const headerLine = lines[0];
    const delimiter = headerLine.includes(';') ? ';' : ',';

    const parseRow = (line: string): string[] => {
      // Regex handling quoted CSV values
      const pattern = new RegExp(
        `(?:^|${delimiter})(?:"([^"]*(?:""[^"]*)*)"|([^"${delimiter}]*))`,
        'g'
      );
      const matches: string[] = [];
      let match;
      while ((match = pattern.exec(line)) !== null) {
        matches.push((match[1] !== undefined ? match[1].replace(/""/g, '"') : match[2]).trim());
      }
      return matches;
    };

    const headers = parseRow(headerLine).map(h => h.toLowerCase());

    const dateIdx = headers.findIndex(h => h.includes('date') || h.includes('data'));
    const mealIdx = headers.findIndex(h => h.includes('meal') || h.includes('refeiç') || h.includes('refeic'));
    const foodIdx = headers.findIndex(h => h.includes('food') || h.includes('item') || h.includes('alimento') || h.includes('descri'));
    const calIdx = headers.findIndex(h => h.includes('calorie') || h.includes('caloria') || h.includes('kcal'));
    const proteinIdx = headers.findIndex(h => h.includes('protein') || h.includes('proteína') || h.includes('proteina'));
    const carbsIdx = headers.findIndex(h => h.includes('carb'));
    const fatIdx = headers.findIndex(h => h.includes('fat') || h.includes('gordura'));

    if (dateIdx === -1 || (calIdx === -1 && proteinIdx === -1)) {
      return {
        success: false,
        daysImported: 0,
        totalFoodsImported: 0,
        message: 'Estrutura do CSV não reconhecida como exportação do MyFitnessPal (colunas de Data e Calorias/Proteínas ausentes).',
      };
    }

    const daysMap = new Map<string, DailyDietData>();
    let totalFoodsCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const row = parseRow(lines[i]);
      if (row.length <= dateIdx) continue;

      const dateStr = parseMyFitnessPalDate(row[dateIdx]);
      if (!dateStr) continue;

      let dietData = daysMap.get(dateStr);
      if (!dietData) {
        dietData = dietStorage.getDietData(dateStr, userId);
        daysMap.set(dateStr, dietData);
      }

      const rawCalories = calIdx >= 0 ? parseFloat(row[calIdx]?.replace(',', '.') || '0') : 0;
      const rawProtein = proteinIdx >= 0 ? parseFloat(row[proteinIdx]?.replace(',', '.') || '0') : 0;
      const rawCarbs = carbsIdx >= 0 ? parseFloat(row[carbsIdx]?.replace(',', '.') || '0') : 0;
      const rawFat = fatIdx >= 0 ? parseFloat(row[fatIdx]?.replace(',', '.') || '0') : 0;

      const rawMeal = mealIdx >= 0 ? row[mealIdx] : 'snack';
      const mealType = normalizeMealType(rawMeal);
      const foodName = foodIdx >= 0 && row[foodIdx]
        ? row[foodIdx]
        : (mealIdx >= 0 ? `Refeição (${row[mealIdx]})` : 'Registro MyFitnessPal');

      if (rawCalories > 0 || rawProtein > 0 || rawCarbs > 0 || rawFat > 0) {
        const item: FoodItem = {
          id: `mfp_${Date.now()}_${i}`,
          name: foodName,
          calories: Math.round(rawCalories),
          protein: Math.round(rawProtein * 10) / 10,
          carbs: Math.round(rawCarbs * 10) / 10,
          fat: Math.round(rawFat * 10) / 10,
          portion: 'Importado MFP',
          loggedAt: '12:00',
        };

        dietData.meals[mealType].push(item);
        totalFoodsCount++;
      }
    }

    // Save all updated days to local storage
    for (const [_, dietData] of daysMap.entries()) {
      dietStorage.saveDietData(dietData, userId);
    }

    return {
      success: true,
      daysImported: daysMap.size,
      totalFoodsImported: totalFoodsCount,
      message: `Migração concluída com sucesso! ${daysMap.size} dias e ${totalFoodsCount} alimentos importados do MyFitnessPal.`,
    };
  },
};
