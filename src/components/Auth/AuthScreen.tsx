import React, { useState } from 'react';
import { auth } from '../../lib/auth';
import { UserAccount } from '../../types';
import { Activity, Shield, Sparkles, User, Mail, Lock, Target, ArrowRight, AlertCircle } from 'lucide-react';

interface AuthScreenProps {
  onLoginSuccess: (user: UserAccount) => void;
}

export function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [goal, setGoal] = useState<UserAccount['therapeuticGoal']>('male_trt');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        const res = await auth.signUp(name, email, password, goal);
        if (res.success && res.user) {
          onLoginSuccess(res.user);
        } else {
          setError(res.error || 'Erro ao criar conta');
        }
      } else {
        const res = await auth.signIn(email, password);
        if (res.success && res.user) {
          onLoginSuccess(res.user);
        } else {
          setError(res.error || 'Erro ao entrar');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro inesperado');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    const demoUser = auth.signInAsDemo();
    onLoginSuccess(demoUser);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      {/* Glow ambient background lights */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-tr from-cyan-500 to-emerald-400 shadow-xl shadow-cyan-500/20 mb-3">
            <Activity className="w-8 h-8 text-slate-950 stroke-[2.5]" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-3xl font-black tracking-tight text-white">Steady</h1>
            <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/60">
              v1.0 Beta
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Plataforma clínica para farmacocinética de hormônios e peptídeos
          </p>
        </div>

        {/* 1-Click Fast Demo Card for Testers */}
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-emerald-950/40 border border-cyan-500/30 shadow-lg shadow-cyan-950/40 relative overflow-hidden">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Modo Demonstração para Testadores</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Explore o app imediatamente com perfil e curva de testosterona já calibrados.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDemoLogin}
            className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 font-bold text-sm shadow-md shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 group cursor-pointer"
          >
            <span>Entrar com 1 Clique (Conta Demo)</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        {/* Main Auth Form Box */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-2xl">
          {/* Tabs: Login / Register */}
          <div className="grid grid-cols-2 p-1 bg-slate-950/80 rounded-xl border border-slate-800 mb-5">
            <button
              type="button"
              onClick={() => { setIsRegister(false); setError(null); }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                !isRegister 
                  ? 'bg-slate-800 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Entrar na Conta
            </button>
            <button
              type="button"
              onClick={() => { setIsRegister(true); setError(null); }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                isRegister 
                  ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-600/30' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Criar Nova Conta
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-cyan-400" />
                    Seu Nome ou Apelido
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Silva"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-cyan-400" />
                    Objetivo Principal
                  </label>
                  <select
                    value={goal}
                    onChange={e => setGoal(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
                  >
                    <option value="male_trt">TRT Masculina (Reposição de Testosterona)</option>
                    <option value="female_hrt">HRT Feminina (Menopausa / Reposição)</option>
                    <option value="peptides_glp1">Peptídeos & Emagrecimento (GLP-1 / Tirzepatida)</option>
                    <option value="bodybuilding">Otimização de Performance / Blast & Cruise</option>
                    <option value="fertility">Fertilidade / Manutenção de Espermatogênese</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-cyan-400" />
                E-mail
              </label>
              <input
                type="email"
                required
                placeholder={isRegister ? "seu.email@exemplo.com" : "demo@steady.app"}
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-cyan-400" />
                Senha
              </label>
              <input
                type="password"
                required
                placeholder={isRegister ? "Mínimo 4 caracteres" : "Sua senha"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-white text-slate-950 font-semibold text-sm transition-all shadow-md mt-2 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{loading ? 'Processando...' : (isRegister ? 'Criar Minha Conta' : 'Acessar Conta')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Privacy badge */}
          <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sessão isolada. Seus dados de injeções ficam salvos em sigilo.</span>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center mt-4">
          <p className="text-[11px] text-slate-400">
            © {new Date().getFullYear()} Steady Protocol Tracker • Feito para testes clínicos e esportivos
          </p>
        </div>
      </div>
    </div>
  );
}
