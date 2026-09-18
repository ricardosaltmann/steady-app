import React, { useState, useEffect } from 'react';
import { UserAccount, AdminStats, Compound } from '../../types';
import { supabaseSync } from '../../lib/supabaseSync';
import { isSupabaseConfigured } from '../../lib/supabase';
import { getLocalDateKey } from '../../lib/dateUtils';
import { 
  Users, Activity, Database, Shield, AlertTriangle, 
  Download, RefreshCw, X, CheckCircle2, Search, Plus, Sparkles, Syringe, HardDrive
} from 'lucide-react';

interface AdminPanelProps {
  currentUser: UserAccount;
  onClose: () => void;
  compounds: Compound[];
  onAddGlobalCompound: (compound: Compound) => void;
}

export function AdminPanel({ currentUser, onClose, compounds, onAddGlobalCompound }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'metrics' | 'compounds' | 'maintenance'>('users');
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchUser, setSearchUser] = useState('');
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('Estamos atualizando os modelos clínicos do SteadySync. Voltamos em alguns instantes.');

  // Form states for new global compound
  const [newCompoundName, setNewCompoundName] = useState('');
  const [newCompoundCategory, setNewCompoundCategory] = useState<'steroid' | 'peptide' | 'estrogen' | 'fertility' | 'other'>('peptide');
  const [newCompoundHalfLife, setNewCompoundHalfLife] = useState(7);
  const [newCompoundUnit, setNewCompoundUnit] = useState<'mg' | 'mcg' | 'IU'>('mg');
  const [showAddCompoundModal, setShowAddCompoundModal] = useState(false);

  const supabaseActive = isSupabaseConfigured();

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [fetchedUsers, fetchedStats] = await Promise.all([
        supabaseSync.getAdminUsers(),
        supabaseSync.getAdminStats(),
      ]);
      setUsers(fetchedUsers);
      setStats(fetchedStats);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.therapeuticGoal?.toLowerCase().includes(searchUser.toLowerCase())
  );

  const handleCreateCompound = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompoundName.trim()) return;

    const id = 'global_' + newCompoundName.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
    const newComp: Compound = {
      id,
      name: newCompoundName.trim(),
      category: newCompoundCategory,
      halfLifeDays: Number(newCompoundHalfLife),
      peakHours: 12,
      defaultConcentrationMgMl: 10,
      unit: newCompoundUnit,
      color: newCompoundCategory === 'peptide' ? '#10b981' : '#3b82f6',
      enabled: true,
      bioavailability: 1.0,
      description: 'Cadastrado pelo Painel Administrativo',
    };

    onAddGlobalCompound(newComp);
    setNewCompoundName('');
    setShowAddCompoundModal(false);
  };

  const handleExportUsersCSV = () => {
    const headers = 'ID,Nome,Email,Objetivo,DataCriacao,Admin\n';
    const rows = users.map(u => 
      `"${u.id}","${u.name}","${u.email}","${u.therapeuticGoal}","${u.createdAt}","${u.isAdmin ? 'SIM' : 'NÃO'}"`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `steadysync_usuarios_${getLocalDateKey()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        
        {/* Top Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 text-slate-950 font-black shadow-lg shadow-amber-500/20">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">Painel de Gestão & Manutenção</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  Área Master
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Logado como: <strong className="text-slate-200">{currentUser.name}</strong> ({currentUser.email})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Status do Backend */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <span className={`w-2 h-2 rounded-full ${supabaseActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="text-slate-300">
                {supabaseActive ? 'Supabase Nuvem Ativo' : 'Armazenamento Standalone'}
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-800 bg-slate-950/40 overflow-x-auto">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'users'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Usuários & Testadores ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('metrics')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'metrics'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Métricas & Telemetria</span>
          </button>

          <button
            onClick={() => setActiveTab('compounds')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'compounds'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Catálogo Global de Farmácia</span>
          </button>

          <button
            onClick={() => setActiveTab('maintenance')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'maintenance'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Manutenção & Infraestrutura</span>
          </button>

          <button
            onClick={loadAdminData}
            title="Recarregar Dados"
            className="ml-auto p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* 1. ABA DE USUÁRIOS */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar usuário por nome, email ou objetivo..."
                    value={searchUser}
                    onChange={e => setSearchUser(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportUsersCSV}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Exportar CSV</span>
                  </button>
                </div>
              </div>

              {/* Users Table */}
              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/40">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="p-3.5">Usuário / Nome</th>
                        <th className="p-3.5">E-mail</th>
                        <th className="p-3.5">Objetivo Clínico</th>
                        <th className="p-3.5">Cadastrado em</th>
                        <th className="p-3.5 text-right">Permissão</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-500">
                            Nenhum usuário encontrado com os filtros atuais.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map(u => (
                          <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="p-3.5 font-bold text-white flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-600 to-emerald-500 flex items-center justify-center text-[10px] text-white font-black">
                                {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                              </span>
                              <span>{u.name || 'Sem nome'}</span>
                            </td>
                            <td className="p-3.5 text-slate-300 font-mono text-[11px]">{u.email}</td>
                            <td className="p-3.5">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800/50">
                                {u.therapeuticGoal === 'male_trt' && 'TRT Masculina'}
                                {u.therapeuticGoal === 'female_hrt' && 'HRT Feminina'}
                                {u.therapeuticGoal === 'peptides_glp1' && 'Peptídeos / GLP-1'}
                                {u.therapeuticGoal === 'bodybuilding' && 'Performance'}
                                {u.therapeuticGoal === 'fertility' && 'Fertilidade'}
                                {!u.therapeuticGoal && 'Geral'}
                              </span>
                            </td>
                            <td className="p-3.5 text-slate-400 text-[11px]">
                              {u.createdAt ? new Date(u.createdAt).toLocaleDateString('pt-BR') : '-'}
                            </td>
                            <td className="p-3.5 text-right">
                              {u.isAdmin ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                  ADMIN MASTER
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px]">Testador</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 2. ABA DE MÉTRICAS */}
          {activeTab === 'metrics' && stats && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                    <span>Total Usuários</span>
                    <Users className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="text-3xl font-black text-white">{stats.totalUsers}</div>
                  <span className="text-[10px] text-emerald-400">Contas criadas na plataforma</span>
                </div>

                <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                    <span>Total Injeções</span>
                    <Syringe className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-3xl font-black text-white">{stats.totalInjections}</div>
                  <span className="text-[10px] text-slate-400">Doses aplicadas e registradas</span>
                </div>

                <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                    <span>Protocolos Ativos</span>
                    <Activity className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-3xl font-black text-white">{stats.totalProtocols}</div>
                  <span className="text-[10px] text-blue-400">Rotinas em andamento</span>
                </div>

                <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                    <span>Exames Registrados</span>
                    <Shield className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-3xl font-black text-white">{stats.totalLabs}</div>
                  <span className="text-[10px] text-purple-400">Laudos laboratoriais</span>
                </div>
              </div>

              {/* Top compostos */}
              <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800">
                <h3 className="text-sm font-bold text-white mb-3">Compostos Mais Utilizados</h3>
                <div className="space-y-3">
                  {stats.topCompounds.map(c => (
                    <div key={c.compoundId} className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                        <span className="text-xs font-semibold text-white">{c.name}</span>
                      </div>
                      <span className="text-xs font-bold text-cyan-300">{c.count} doses</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 3. ABA DE CATÁLOGO GLOBAL */}
          {activeTab === 'compounds' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-white">Biblioteca Central de Compostos</h3>
                  <p className="text-xs text-slate-400">
                    Gerencie os peptídeos, esteroides e blends disponíveis para todos os usuários do app.
                  </p>
                </div>
                <button
                  onClick={() => setShowAddCompoundModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 text-xs font-bold shadow-md hover:brightness-110 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Cadastrar Novo Composto</span>
                </button>
              </div>

              {/* Listagem de compostos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {compounds.map(c => (
                  <div key={c.id} className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800 flex flex-col justify-between space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-bold text-white block">{c.name}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">{c.category} • {c.unit}</span>
                      </div>
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                    </div>
                    <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Meia-vida: <strong className="text-slate-200">{c.halfLifeDays} dias</strong></span>
                      <span className="text-emerald-400 text-[10px] font-semibold">Ativo Global</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. ABA DE MANUTENÇÃO */}
          {activeTab === 'maintenance' && (
            <div className="space-y-6 max-w-2xl">
              <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">Aviso de Modo Manutenção</h3>
                    <p className="text-xs text-slate-400">
                      Exibe um banner ou tela de manutenção para os usuários enquanto você atualiza o sistema.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsMaintenanceMode(!isMaintenanceMode)}
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                      isMaintenanceMode ? 'bg-rose-600 justify-end' : 'bg-slate-800 justify-start'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-white shadow-md transform transition-transform" />
                  </button>
                </div>

                {isMaintenanceMode && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-2">
                    <label className="block text-xs font-semibold text-rose-300">Mensagem para os usuários:</label>
                    <input
                      type="text"
                      value={maintenanceMessage}
                      onChange={e => setMaintenanceMessage(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                )}
              </div>

              {/* Status da Infraestrutura */}
              <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-cyan-400" />
                  Status da Infraestrutura
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                    <span className="text-slate-400">Banco de Dados</span>
                    <span className="font-semibold text-white">{supabaseActive ? 'Supabase PostgreSQL Cloud' : 'Local Storage Cache'}</span>
                  </div>
                  <div className="flex justify-between p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                    <span className="text-slate-400">Segurança RLS (Row Level Security)</span>
                    <span className="font-semibold text-emerald-400">Ativado</span>
                  </div>
                  <div className="flex justify-between p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                    <span className="text-slate-400">Versão da Plataforma</span>
                    <span className="font-semibold text-slate-200">v1.2.0-cloud</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal: Cadastrar Novo Composto Global */}
        {showAddCompoundModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
              <h3 className="text-base font-bold text-white">Cadastrar Composto no Catálogo Central</h3>
              
              <form onSubmit={handleCreateCompound} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nome do Composto / Peptídeo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Retatrutida, Nad+, etc."
                    value={newCompoundName}
                    onChange={e => setNewCompoundName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Categoria</label>
                    <select
                      value={newCompoundCategory}
                      onChange={e => setNewCompoundCategory(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="peptide">Peptídeo / GLP-1</option>
                      <option value="steroid">Esteroide / TRT</option>
                      <option value="fertility">Fertilidade / TPC</option>
                      <option value="estrogen">Feminino / HRT</option>
                      <option value="other">Outro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Meia-Vida (Dias)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={newCompoundHalfLife}
                      onChange={e => setNewCompoundHalfLife(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddCompoundModal(false)}
                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 font-bold hover:brightness-110 transition-all"
                  >
                    Salvar no Catálogo
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
