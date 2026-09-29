import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Service to handle unevictable native file mirroring and native share-sheet export.
 * Solves WebView localStorage eviction and WebView blob download failures on Android/iOS.
 */
export const nativeFileMirror = {
  /**
   * Asynchronously writes a JSON mirror to Directory.Data.
   * This directory is unevictable by Android/iOS system storage cleanup.
   */
  saveSnapshot: async (userId: string, data: Record<string, any>): Promise<void> => {
    if (!Capacitor.isNativePlatform()) return;

    try {
      const fileName = `steadysync_vault_${userId}.json`;
      await Filesystem.writeFile({
        path: fileName,
        data: JSON.stringify(data),
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });
    } catch (err) {
      console.warn('[NativeFileMirror] Erro ao espelhar dados no Filesystem:', err);
    }
  },

  /**
   * Recovers snapshot from Directory.Data if localStorage was evicted.
   */
  readSnapshot: async (userId: string): Promise<Record<string, any> | null> => {
    if (!Capacitor.isNativePlatform()) return null;

    try {
      const fileName = `steadysync_vault_${userId}.json`;
      const res = await Filesystem.readFile({
        path: fileName,
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });

      if (typeof res.data === 'string') {
        return JSON.parse(res.data);
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Deletes native vault file on account deletion.
   */
  deleteSnapshot: async (userId: string): Promise<void> => {
    if (!Capacitor.isNativePlatform()) return;

    try {
      const fileName = `steadysync_vault_${userId}.json`;
      await Filesystem.deleteFile({
        path: fileName,
        directory: Directory.Data,
      });
    } catch {
      // Ignore if file does not exist
    }
  },

  /**
   * Exports backup JSON using native Capacitor Share sheet on Android/iOS,
   * falling back to standard Web Blob download on browser.
   */
  exportAndShareBackup: async (filename: string, payload: Record<string, any>): Promise<boolean> => {
    const jsonStr = JSON.stringify(payload, null, 2);

    if (Capacitor.isNativePlatform()) {
      try {
        // Write to Cache directory first
        const cacheFile = await Filesystem.writeFile({
          path: filename,
          data: jsonStr,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });

        // Open native share sheet
        await Share.share({
          title: 'Backup SteadySync',
          text: `Backup de dados de saúde e protocolos SteadySync (${filename})`,
          url: cacheFile.uri,
          dialogTitle: 'Compartilhar ou Salvar Backup',
        });
        return true;
      } catch (err) {
        console.error('[NativeFileMirror] Falha ao compartilhar via Share Sheet:', err);
        return false;
      }
    } else {
      // Standard Web Blob fallback
      try {
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return true;
      } catch (e) {
        console.error('[NativeFileMirror] Falha no download web:', e);
        return false;
      }
    }
  },
};
