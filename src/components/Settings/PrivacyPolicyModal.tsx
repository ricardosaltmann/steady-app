import React from 'react';
import { ShieldCheck, X, FileText, Lock, EyeOff } from 'lucide-react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Política de Privacidade & Termos de Uso</h3>
              <p className="text-xs text-slate-400">SteadySync • Versão 1.2 (Privacidade por Design)</p>
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

        {/* Scrollable Document Body */}
        <div className="flex-1 overflow-y-auto space-y-4 text-xs text-slate-300 pr-2 leading-relaxed">
          <section className="space-y-1.5">
            <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-cyan-400" />
              1. Arquitetura Local-First e Custódia dos Dados
            </h4>
            <p>
              O SteadySync foi projetado com a privacidade como pilar fundamental. Por padrão, todos os dados clínicos, históricos de dosagens, rotinas de treino e registros biométricos são gravados prioritariamente no armazenamento seguro do seu próprio dispositivo móvel.
            </p>
            <p>
              Backups no sistema operacional (Android Cloud Backup via ADB) são explicitamente desabilitados (<code className="text-cyan-400 font-mono">android:allowBackup="false"</code>) para impedir extrações desautorizadas por cabos ou backups de terceiros.
            </p>
          </section>

          <section className="space-y-1.5">
            <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-purple-400" />
              2. Integração com Health Connect e Google Fit
            </h4>
            <p>
              Quando autorizado explicitamente por você, o SteadySync realiza leitura estrita de dados como peso corporal, altura e percentual de gordura. O aplicativo <strong>não compartilha</strong>, não vende e não repassa informações do Health Connect a terceiros, corretores de dados ou plataformas de publicidade.
            </p>
          </section>

          <section className="space-y-1.5">
            <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
              <EyeOff className="w-4 h-4 text-emerald-400" />
              3. Ausência de Rastreamento Publicitário
            </h4>
            <p>
              Nenhum dado é utilizado para segmentação de anúncios, perfilamento comercial ou venda para seguradoras. O opt-in de marketing vem desativado por padrão e pode ser alternado livremente.
            </p>
          </section>

          <section className="space-y-1.5">
            <h4 className="font-bold text-white text-sm">4. Direito ao Esquecimento e Exclusão</h4>
            <p>
              A qualquer momento você pode solicitar a exclusão irrevogável de todos os seus dados locais e em nuvem através do botão "Excluir Conta Permanentemente" nas configurações, em conformidade com o Artigo 18 da LGPD (Lei Geral de Proteção de Dados) e o GDPR europeu.
            </p>
          </section>

          <section className="space-y-1.5">
            <h4 className="font-bold text-white text-sm">5. Isenção Médica</h4>
            <p className="text-slate-400 text-[11px]">
              O SteadySync é uma ferramenta de registro, rastreamento farmacocinético e diário de hipertrofia. O aplicativo não fornece prescrições médicas e não substitui o acompanhamento de um endocrinologista ou profissional de saúde qualificado.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
          >
            Entendido e Concordo
          </button>
        </div>
      </div>
    </div>
  );
};
