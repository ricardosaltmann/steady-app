import React, { useState, useEffect } from 'react';
import { auth } from '../../lib/auth';
import { storage } from '../../lib/storage';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { UserAccount, CompoundCategory } from '../../types';
import { 
  Activity, 
  Shield, 
  Sparkles, 
  User, 
  Mail, 
  Lock, 
  ArrowRight, 
  AlertCircle, 
  Phone, 
  Calendar, 
  Syringe, 
  Heart, 
  CheckCircle2, 
  Circle,
  Sliders,
  KeyRound
} from 'lucide-react';

interface AuthScreenProps {
  onLoginSuccess: (user: UserAccount) => void;
}

interface CategoryOption {
  id: CompoundCategory;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  colorClass: string;
  borderClass: string;
  bgActiveClass: string;
  textClass: string;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  {
    id: 'peptide',
    title: 'Peptídeos & GLP-1',
    subtitle: 'Tirzepatida, Retatrutida, Ozempic, BPC-157',
    icon: Sparkles,
    colorClass: 'text-emerald-400',
    borderClass: 'border-emerald-500/50',
    bgActiveClass: 'bg-emerald-950/40',
    textClass: 'text-emerald-300',
  },
  {
    id: 'steroid',
    title: 'Esteroides & TRT',
    subtitle: 'Testosterona, Deposteron, Enantato, Deca, Primo',
    icon: Syringe,
    colorClass: 'text-blue-400',
    borderClass: 'border-blue-500/50',
    bgActiveClass: 'bg-blue-950/40',
    textClass: 'text-blue-300',
  },
  {
    id: 'fertility',
    title: 'Fertilidade & TPC',
    subtitle: 'hCG, Clomid, Anastrozol, Protetores hepáticos',
    icon: Shield,
    colorClass: 'text-amber-400',
    borderClass: 'border-amber-500/50',
    bgActiveClass: 'bg-amber-950/40',
    textClass: 'text-amber-300',
  },
  {
    id: 'estrogen',
    title: 'Hormônios Femininos',
    subtitle: 'Estradiol, Progesterona, Reposição / HRT',
    icon: Heart,
    colorClass: 'text-pink-400',
    borderClass: 'border-pink-500/50',
    bgActiveClass: 'bg-pink-950/40',
    textClass: 'text-pink-300',
  },
];

export function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  
  // Credentials
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Extended Onboarding Profile
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [selectedCategories, setSelectedCategories] = useState<CompoundCategory[]>(['peptide', 'steroid']);

  const [isSettingNewPassword, setIsSettingNewPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPasswordSuccess, setNewPasswordSuccess] = useState(false);

  // In-app OTP code recovery states
  const [otpCode, setOtpCode] = useState('');
  const [hasSentResetEmail, setHasSentResetEmail] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Detect Supabase recovery hash on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash.includes('type=recovery')) {
      setIsSettingNewPassword(true);
    }

    if (isSupabaseConfigured() && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setIsSettingNewPassword(true);
        }
      });
      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 6) {
      setError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas digitadas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      const res = await auth.updatePassword(newPassword);
      if (res.success) {
        setNewPasswordSuccess(true);
        window.history.replaceState(null, '', window.location.pathname);
        setTimeout(() => {
          if (res.user) {
            onLoginSuccess(res.user);
          } else {
            setIsSettingNewPassword(false);
            setIsForgotPassword(false);
            setResetMessage('Senha atualizada com sucesso! Você já pode entrar com sua nova senha.');
          }
        }, 1200);
      } else {
        setError(res.error || 'Erro ao redefinir a senha.');
      }
    } catch (err: any) {
      setError(err.message || 'Erro inesperado ao definir nova senha.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetMessage(null);
    setResetLoading(true);

    try {
      const res = await auth.resetPassword(email);
      if (res.success) {
        setResetMessage(res.message);
        setHasSentResetEmail(true);
      } else {
        setError(res.error || 'Erro ao recuperar senha.');
      }
    } catch (err: any) {
      setError(err.message || 'Erro inesperado ao solicitar recuperação.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleVerifyOtpReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!otpCode.trim()) {
      setError('Por favor, informe o código de verificação recebido por e-mail.');
      return;
    }
    if (newPassword.length < 6) {
      setError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas digitadas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      const res = await auth.verifyOtpAndResetPassword(email, otpCode, newPassword);
      if (res.success) {
        setNewPasswordSuccess(true);
        setTimeout(() => {
          if (res.user) {
            onLoginSuccess(res.user);
          } else {
            setIsForgotPassword(false);
            setResetMessage('Senha atualizada com sucesso! Você já pode entrar.');
          }
        }, 1200);
      } else {
        setError(res.error || 'Código inválido ou erro ao atualizar a senha.');
      }
    } catch (err: any) {
      setError(err.message || 'Erro inesperado ao redefinir a senha.');
    } finally {
      setLoading(false);
    }
  };

  // Handle sex switch with intelligent category presets
  const handleGenderChange = (newGender: 'male' | 'female') => {
    setGender(newGender);
    if (newGender === 'male') {
      // Men typically track steroids + peptides, exclude estrogen
      setSelectedCategories(prev => {
        const next = prev.filter(c => c !== 'estrogen');
        if (!next.includes('steroid')) next.push('steroid');
        if (!next.includes('peptide')) next.push('peptide');
        return next;
      });
    } else {
      // Women typically track peptides + female HRT, exclude steroids
      setSelectedCategories(prev => {
        const next = prev.filter(c => c !== 'steroid');
        if (!next.includes('peptide')) next.push('peptide');
        if (!next.includes('estrogen')) next.push('estrogen');
        return next;
      });
    }
  };

  // Toggle individual category
  const toggleCategory = (catId: CompoundCategory) => {
    setSelectedCategories(prev => {
      if (prev.includes(catId)) {
        if (prev.length === 1) {
          // Keep at least 1 category selected
          return prev;
        }
        return prev.filter(c => c !== catId);
      } else {
        return [...prev, catId];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        if (!name.trim()) {
          setError('Por favor, informe seu nome ou apelido.');
          setLoading(false);
          return;
        }
        if (selectedCategories.length === 0) {
          setError('Selecione ao menos uma categoria para acompanhar.');
          setLoading(false);
          return;
        }

        // Determine matching therapeuticGoal
        let goal: UserAccount['therapeuticGoal'] = 'peptides_glp1';
        if (selectedCategories.includes('steroid')) {
          goal = 'male_trt';
        } else if (selectedCategories.includes('estrogen') && gender === 'female') {
          goal = 'female_hrt';
        } else if (selectedCategories.includes('peptide')) {
          goal = 'peptides_glp1';
        } else if (selectedCategories.includes('fertility')) {
          goal = 'fertility';
        }

        const res = await auth.signUp(
          name,
          email,
          password,
          phone || undefined,
          age ? Number(age) : undefined,
          gender,
          selectedCategories,
          goal
        );

        if (res.success && res.user) {
          // Initialize storage with strictly the chosen categories enabled
          storage.initializeUserPreferences(
            res.user.id,
            selectedCategories,
            gender,
            phone || undefined,
            age ? Number(age) : undefined,
            name.trim(),
            goal
          );
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
      {/* Ambient background glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className={`w-full ${isRegister ? 'max-w-lg' : 'max-w-md'} relative z-10 transition-all duration-300`}>
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-tr from-cyan-500 to-emerald-400 shadow-xl shadow-cyan-500/20 mb-3">
            <Activity className="w-8 h-8 text-slate-950 stroke-[2.5]" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-3xl font-black tracking-tight text-white">
              Steady<span className="text-cyan-400">Sync</span>
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/60">
              v1.0 Beta
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Plataforma clínica para farmacocinética de hormônios e peptídeos
          </p>
        </div>

        {/* 1-Click Fast Demo Card for Testers (shown on login tab) */}
        {!isRegister && !isForgotPassword && !isSettingNewPassword && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-emerald-950/40 border border-cyan-500/30 shadow-lg shadow-cyan-950/40 relative overflow-hidden">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>Modo Demonstração para Testadores</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Explore o app imediatamente com perfil e curva de testosterona e peptídeos já calibrados.
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
        )}

        {/* Main Auth Form Box */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl">
          {isSettingNewPassword ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-emerald-400" />
                  Definir Nova Senha
                </h2>
              </div>

              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Token de recuperação validado com sucesso! Digite sua nova senha de acesso abaixo.
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {newPasswordSuccess ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span className="font-medium">Senha alterada com sucesso! Conectando à sua conta...</span>
                </div>
              ) : (
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-cyan-400" />
                      Nova Senha
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Mínimo 6 caracteres"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-emerald-400" />
                      Confirmar Nova Senha
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Repita a nova senha"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-400 hover:from-emerald-400 hover:to-cyan-300 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <span>{loading ? 'Salvando nova senha...' : 'Salvar Nova Senha e Acessar'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          ) : isForgotPassword ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-cyan-400" />
                  Recuperar Senha
                </h2>
                <button
                  type="button"
                  onClick={() => { setIsForgotPassword(false); setError(null); setResetMessage(null); setHasSentResetEmail(false); }}
                  className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Voltar ao login
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {resetMessage && (
                <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{resetMessage}</span>
                </div>
              )}

              {!hasSentResetEmail ? (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <p className="text-xs text-slate-400 mb-2 leading-relaxed">
                    Informe seu e-mail cadastrado. Você receberá as instruções e o código de verificação para definir sua nova senha diretamente aqui no app.
                  </p>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-cyan-400" />
                      Seu E-mail Cadastrado
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="seu.email@exemplo.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <span>{resetLoading ? 'Solicitando...' : 'Enviar Código de Recuperação'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setHasSentResetEmail(true)}
                      className="text-xs text-cyan-400 hover:underline cursor-pointer"
                    >
                      Já recebeu o código por e-mail? Clique aqui para inserir
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtpReset} className="space-y-3.5">
                  <p className="text-xs text-slate-400 mb-2 leading-relaxed">
                    Insira o código de verificação recebido no seu e-mail e escolha sua nova senha:
                  </p>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-cyan-400" />
                      E-mail
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="seu.email@exemplo.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                      Código de Verificação do E-mail
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 123456 ou token"
                      value={otpCode}
                      onChange={e => setOtpCode(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors tracking-widest font-mono text-center font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-emerald-400" />
                      Nova Senha (mínimo 6 caracteres)
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Digite sua nova senha"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-emerald-400" />
                      Confirmar Nova Senha
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Repita a nova senha"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-400 hover:from-emerald-400 hover:to-cyan-300 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                  >
                    <span>{loading ? 'Validando e alterando senha...' : 'Confirmar e Redefinir Senha'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                    <button
                      type="button"
                      onClick={() => { setHasSentResetEmail(false); setError(null); }}
                      className="hover:text-cyan-400 transition-colors cursor-pointer"
                    >
                      ← Reenviar código
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsForgotPassword(false); setError(null); }}
                      className="hover:text-white transition-colors cursor-pointer"
                    >
                      Voltar ao Login
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <>
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
                {/* 1. Nome Completo ou Apelido */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-cyan-400" />
                    Seu Nome ou Apelido
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Letícia Santos ou Ricardo Silva"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
                  />
                </div>

                {/* 2. Telefone / WhatsApp */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="tel"
                    placeholder="Ex: (11) 98765-4321"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
                  />
                </div>

                {/* 3. Idade & Sexo Biológico */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                      Idade
                    </label>
                    <input
                      type="number"
                      min="18"
                      max="110"
                      placeholder="Ex: 32"
                      value={age}
                      onChange={e => setAge(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Sexo Biológico
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                      <button
                        type="button"
                        onClick={() => handleGenderChange('male')}
                        className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 ${
                          gender === 'male'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>♂️</span>
                        <span>Masculino</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleGenderChange('female')}
                        className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 ${
                          gender === 'female'
                            ? 'bg-pink-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>♀️</span>
                        <span>Feminino</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 4. Categorias de Acompanhamento (O que a pessoa pretende) */}
                <div className="pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                      O que você pretende acompanhar no SteadySync?
                    </label>
                    <span className="text-[10px] text-slate-400">Selecione 1 ou mais</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
                    Sua tela inicial exibirá apenas as categorias ativadas. Você pode ligar ou desligar qualquer composto a qualquer momento nas Configurações.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {CATEGORY_OPTIONS.map(cat => {
                      const isSelected = selectedCategories.includes(cat.id);
                      const Icon = cat.icon;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => toggleCategory(cat.id)}
                          className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                            isSelected
                              ? `${cat.bgActiveClass} ${cat.borderClass} ring-1 ${cat.borderClass}`
                              : 'bg-slate-950/60 border-slate-800/80 opacity-60 hover:opacity-90'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2">
                              <div className={`p-1.5 rounded-lg bg-slate-900 border border-slate-800 ${cat.colorClass}`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                                {cat.title}
                              </span>
                            </div>
                            {isSelected ? (
                              <CheckCircle2 className={`w-4 h-4 ${cat.colorClass} shrink-0`} />
                            ) : (
                              <Circle className="w-4 h-4 text-slate-600 shrink-0" />
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 leading-tight">
                            {cat.subtitle}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Email & Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-cyan-400" />
                E-mail
              </label>
              <input
                type="email"
                required
                placeholder={isRegister ? "seu.email@exemplo.com" : "demo@steadysync.app"}
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-cyan-400" />
                  Senha
                </label>
                {!isRegister && (
                  <button
                    type="button"
                    onClick={() => { setIsForgotPassword(true); setError(null); setResetMessage(null); }}
                    className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline transition-colors cursor-pointer"
                  >
                    Esqueceu a senha?
                  </button>
                )}
              </div>
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
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-cyan-500/20 mt-3 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{loading ? 'Configurando seu painel...' : (isRegister ? 'Criar Minha Conta Personalizada' : 'Acessar Conta')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
            </>
          )}

          {/* Privacy badge */}
          <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sessão segura e isolada. Seus protocolos e injeções ficam salvos em sigilo.</span>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center mt-4">
          <p className="text-[11px] text-slate-400">
            © {new Date().getFullYear()} SteadySync Protocol Tracker • Feito para testes clínicos e esportivos
          </p>
        </div>
      </div>
    </div>
  );
}
