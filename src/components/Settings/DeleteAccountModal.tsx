import React, { useState } from 'react';
import { AlertTriangle, Trash2, X, Lock } from 'lucide-react';
import { nativeFileMirror } from '../../lib/nativeFileMirror';
import { supabase } from '../../lib/supabase';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  onAccountDeleted: () => void;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  isOpen,
  onClose,
  userId,
  onAccountDeleted,
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const isConfirmed = confirmText.trim().toUpperCase() === 'EXCLUIR';

  const handleDelete = async () => {
    if (!isConfirmed || isDeleting) return;

    setIsDeleting(true);
    setErrorMsg(null);

    try {
      const uid = userId || 'user_demo';

      // 1. Apagar do Supabase se o usuário estiver autenticado
      if (supabase && uid && !uid.startsWith('user_demo')) {
        try {
          // Chamada para RPC de auto-exclusão ou delete das tabelas do usuário
          await supabase.from('profiles').delete().eq('id', uid);
          await supabase.from('injections').delete().eq('user_id', uid);
          await supabase.from('protocols').delete().eq('user_id', uid);
          await supabase.from('labs').delete().eq('user_id', uid);
          await supabase.from('symptoms').delete().eq('user_id', uid);
          await supabase.from('water_logs').delete().eq('user_id', uid);
          await supabase.from('workouts').delete().eq('user_id', uid);
          await supabase.from('sync_tombstones').delete().eq('user_id', uid);
          await supabase.auth.signOut();
        } catch (cloudErr) {
          console.warn('[DeleteAccount] Aviso ao limpar dados da nuvem:', cloudErr);
        }
      }

      // 2. Apagar cofre nativo de arquivos
      await nativeFileMirror.deleteSnapshot(uid);

      // 3. Limpar chaves locais do usuário
      const prefix = `steady_${uid}_`;
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(prefix) || key.includes(uid)) {
          localStorage.removeItem(key);
        }
      });

      // 4. Concluir processo
      onAccountDeleted();
      onClose();
    } catch (err: any) {
      console.error('[DeleteAccount] Erro ao excluir conta:', err);
      setErrorMsg('Ocorreu um erro ao excluir a conta. Tente novamente.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-rose-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Exclusão Permanente de Conta</h3>
              <p className="text-xs text-rose-400 font-semibold">Ação irreversível (Direito ao Esquecimento)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Content */}
        <div className="p-3.5 bg-rose-950/40 border border-rose-900/60 rounded-2xl text-xs text-slate-300 space-y-2 leading-relaxed">
          <p>
            Em conformidade com a LGPD e as diretrizes do Google Play, esta ação apagará permanentemente:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
            <li>Todos os registros de injeções e histórico farmacocinético</li>
            <li>Protocolos ativos e compostos customizados</li>
            <li>Exames laboratoriais e check-ins de saúde</li>
            <li>Histórico de treinos de musculação e cargas</li>
            <li>Cópias locais e espelhamento em nuvem</li>
          </ul>
        </div>

        {/* Confirmation Input */}
        <div className="space-y-2">
          <label className="text-xs text-slate-300 font-medium block">
            Digite <strong className="text-rose-400 uppercase">EXCLUIR</strong> para confirmar:
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            placeholder="EXCLUIR"
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono tracking-wider focus:outline-none focus:border-rose-500 text-center"
            autoFocus
          />
        </div>

        {errorMsg && (
          <p className="text-xs text-rose-400 bg-rose-950/60 p-2.5 rounded-xl border border-rose-800/80">
            {errorMsg}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!isConfirmed || isDeleting}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md ${
              isConfirmed && !isDeleting
                ? 'bg-rose-600 hover:bg-rose-500 text-white cursor-pointer active:scale-95'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isDeleting ? 'Apagando tudo...' : 'Excluir Definitivamente'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
