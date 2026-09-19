import { SymptomLog } from '../../types';
import { toLocalDateString } from '../dateUtils';

export class ImportProvider {
  id = 'import';
  name = 'Importação Manual / CSV';

  /**
   * Parse CSV exportado de balanças, Fitbit ou Google Takeout
   */
  parseFitbitCsv(csvText: string, heightCm: number = 175): SymptomLog[] {
    const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];

    const headers = lines[0].toLowerCase().split(/[,;\t]/).map(h => h.trim().replace(/['"]/g, ''));
    
    let dateIdx = headers.findIndex(h => h.includes('date') || h.includes('data'));
    let weightIdx = headers.findIndex(h => h.includes('weight') || h.includes('peso') || h.includes('massa'));
    let fatIdx = headers.findIndex(h => h.includes('fat') || h.includes('gordura') || h.includes('bf'));

    if (dateIdx === -1) dateIdx = 0;
    if (weightIdx === -1) weightIdx = 1;

    const parsedLogs: SymptomLog[] = [];
    const seenDates = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(/[,;\t]/).map(p => p.trim().replace(/['"]/g, ''));
      if (parts.length <= Math.max(dateIdx, weightIdx)) continue;

      const rawDate = parts[dateIdx];
      const rawWeight = parts[weightIdx];
      const rawFat = fatIdx !== -1 && parts[fatIdx] ? parts[fatIdx] : undefined;

      let formattedDate = toLocalDateString(rawDate);
      if (!formattedDate) {
        if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}/.test(rawDate)) {
          const dparts = rawDate.split(/[\/-]/);
          const day = dparts[0].padStart(2, '0');
          const month = dparts[1].padStart(2, '0');
          const year = dparts[2].slice(0, 4);
          formattedDate = `${year}-${month}-${day}`;
        }
      }

      if (!formattedDate || seenDates.has(formattedDate)) continue;

      const cleanWeight = rawWeight.replace(/[^\d.,]/g, '').replace(',', '.');
      const weightVal = parseFloat(cleanWeight);

      if (isNaN(weightVal) || weightVal < 30 || weightVal > 300) continue;

      let fatVal: number | undefined;
      if (rawFat) {
        const cleanFat = rawFat.replace(/[^\d.,]/g, '').replace(',', '.');
        const parsedFat = parseFloat(cleanFat);
        if (!isNaN(parsedFat) && parsedFat > 0 && parsedFat < 60) {
          fatVal = parsedFat <= 1.0 ? parsedFat * 100 : parsedFat;
        }
      }

      seenDates.add(formattedDate);
      parsedLogs.push({
        id: 'symp_csv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        date: formattedDate,
        weightKg: weightVal,
        bodyFatPercent: fatVal,
        heightCm,
        dataSource: 'csv_import',
        dataKind: 'measured',
        notes: 'Importado de arquivo Fitbit / Google Health CSV',
        updatedAt: new Date().toISOString(),
      });
    }

    return parsedLogs;
  }
}

export const importProvider = new ImportProvider();
