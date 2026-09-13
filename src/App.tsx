import React, { useState, useEffect, useMemo } from 'react';
import { storage } from './lib/storage';
import { auth } from './lib/auth';
import { supabaseSync } from './lib/supabaseSync';
import { Compound, Injection, Protocol, LabResult, SymptomLog, UserProfile, UserAccount } from './types';
import { AuthScreen } from './components/Auth/AuthScreen';
import { Header } from './components/Navigation/Header';
import { BottomNav, NavTab } from './components/Navigation/BottomNav';
import { PharmacokineticChart } from './components/Curve/PharmacokineticChart';
import { InjectionModal } from './components/Injections/InjectionModal';
import { InjectionList } from './components/Injections/InjectionList';
import { BodySiteRotationCard } from './components/Injections/BodySiteRotationCard';
import { ProtocolManager } from './components/Protocols/ProtocolManager';
import { LabTracker } from './components/Labs/LabTracker';
import { SymptomTracker } from './components/Symptoms/SymptomTracker';
import { SettingsModal } from './components/Settings/SettingsModal';
import { PeptideDilutionCalculator } from './components/Calculator/PeptideDilutionCalculator';
import { AdminPanel } from './components/Admin/AdminPanel';
import { Syringe, Sparkles, ChevronRight, Activity, Calendar, Heart } from 'lucide-react';

export function App() {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => auth.getCurrentUser());

  const [compounds, setCompounds] = useState<Compound[]>([]);
  const [selectedCompoundId, setSelectedCompoundId] = useState<string>('test_cypionate');
  const [injections, setInjections] = useState<Injection[]>([]);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [labs, setLabs] = useState<LabResult[]>([]);
  const [symptoms, setSymptoms] = useState<SymptomLog[]>([]);
  const [profile, setProfile] = useState<UserProfile>({ name: '', gender: 'male' });

  const [currentTab, setCurrentTab] = useState<NavTab>('chart');
  const [isInjectionModalOpen, setIsInjectionModalOpen] = useState(false);
  const [quickLogProtocol, setQuickLogProtocol] = useState<Protocol | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);

  // Load data for active user
  const loadAllData = (targetUserId?: string) => {
    const uid = targetUserId || currentUser?.id;
    if (!uid) return;

    // 1. Instant local load
    const loadedCompounds = storage.getCompounds(uid);
    const loadedInjections = storage.getInjections(uid);
    const loadedProtocols = storage.getProtocols(uid);
    const loadedLabs = storage.getLabs(uid);
    const loadedSymptoms = storage.getSymptoms(uid);
    const loadedProfile = storage.getProfile(uid);
    const activeId = storage.getActiveCompoundId(uid);

    setCompounds(loadedCompounds);
    setInjections(loadedInjections);
    setProtocols(loadedProtocols);
    setLabs(loadedLabs);
    setSymptoms(loadedSymptoms);
    setProfile(loadedProfile);
    
    // Ensure selectedCompoundId exists and is an enabled compound
    const activeComp = loadedCompounds.find(c => c.id === activeId && c.enabled !== false);
    if (activeComp) {
      setSelectedCompoundId(activeComp.id);
    } else {
      const firstEnabled = loadedCompounds.find(c => c.enabled !== false) || loadedCompounds[0];
      if (firstEnabled) {
        setSelectedCompoundId(firstEnabled.id);
        storage.setActiveCompoundId(firstEnabled.id, uid);
      }
    }

    // 2. Background Cloud Sync from Supabase if active
    if (!uid.startsWith('user_demo')) {
      supabaseSync.getInjections(uid).then(cloudInjs => {
        if (cloudInjs && cloudInjs.length > 0) {
          setInjections(cloudInjs);
          storage.saveInjections(cloudInjs, uid);
        }
      });

      supabaseSync.getProtocols(uid).then(cloudProtos => {
        if (cloudProtos && cloudProtos.length > 0) {
          setProtocols(cloudProtos);
          storage.saveProtocols(cloudProtos, uid);
        }
      });

      supabaseSync.getLabs(uid).then(cloudLabs => {
        if (cloudLabs && cloudLabs.length > 0) {
          setLabs(cloudLabs);
          storage.saveLabs(cloudLabs, uid);
        }
      });

      supabaseSync.getSymptoms(uid).then(cloudSymptoms => {
        if (cloudSymptoms && cloudSymptoms.length > 0) {
          setSymptoms(cloudSymptoms);
          storage.saveSymptoms(cloudSymptoms, uid);
        }
      });
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadAllData(currentUser.id);
    }
  }, [currentUser?.id]);

  const handleSelectCompound = (id: string) => {
    setSelectedCompoundId(id);
    if (currentUser) {
      storage.setActiveCompoundId(id, currentUser.id);
    }
  };

  const handleLogout = () => {
    auth.signOut();
    setCurrentUser(null);
  };

  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    loadAllData(user.id);
  };

  // Injection Handlers
  const handleSaveInjection = (newInj: Injection) => {
    const updated = storage.addInjection(newInj, currentUser?.id);
    setInjections(updated);
    if (currentUser?.id) {
      supabaseSync.saveInjection(newInj, currentUser.id);
    }
  };

  const handleDeleteInjection = (id: string) => {
    const updated = storage.deleteInjection(id, currentUser?.id);
    setInjections(updated);
    if (currentUser?.id) {
      supabaseSync.deleteInjection(id, currentUser.id);
    }
  };

  // Protocol Handlers
  const handleSaveProtocol = (protocol: Protocol) => {
    const current = [...protocols];
    const index = current.findIndex(p => p.id === protocol.id);
    if (index >= 0) {
      current[index] = protocol;
    } else {
      current.push(protocol);
    }
    storage.saveProtocols(current, currentUser?.id);
    setProtocols(current);
    if (currentUser?.id) {
      supabaseSync.saveProtocol(protocol, currentUser.id);
    }
  };

  const handleDeleteProtocol = (id: string) => {
    const updated = protocols.filter(p => p.id !== id);
    storage.saveProtocols(updated, currentUser?.id);
    setProtocols(updated);
    if (currentUser?.id) {
      supabaseSync.deleteProtocol(id, currentUser.id);
    }
  };

  const handleToggleProtocolActive = (id: string) => {
    const updated = protocols.map(p => 
      p.id === id ? { ...p, active: !p.active } : p
    );
    storage.saveProtocols(updated, currentUser?.id);
    setProtocols(updated);
    const target = updated.find(p => p.id === id);
    if (target && currentUser?.id) {
      supabaseSync.saveProtocol(target, currentUser.id);
    }
  };

  const handleQuickLogFromProtocol = (protocol: Protocol) => {
    setSelectedCompoundId(protocol.compoundId);
    setQuickLogProtocol(protocol);
    setIsInjectionModalOpen(true);
  };

  // Lab Handlers
  const handleSaveLab = (lab: LabResult) => {
    const updated = [lab, ...labs];
    storage.saveLabs(updated, currentUser?.id);
    setLabs(updated);
    if (currentUser?.id) {
      supabaseSync.saveLab(lab, currentUser.id);
    }
  };

  const handleDeleteLab = (id: string) => {
    const updated = labs.filter(l => l.id !== id);
    storage.saveLabs(updated, currentUser?.id);
    setLabs(updated);
    if (currentUser?.id) {
      supabaseSync.deleteLab(id, currentUser.id);
    }
  };

  // Symptom Handlers
  const handleSaveSymptom = (log: SymptomLog) => {
    const updated = [log, ...symptoms];
    storage.saveSymptoms(updated, currentUser?.id);
    setSymptoms(updated);
    if (currentUser?.id) {
      supabaseSync.saveSymptom(log, currentUser.id);
    }
  };

  const handleDeleteSymptom = (id: string) => {
    const updated = symptoms.filter(s => s.id !== id);
    storage.saveSymptoms(updated, currentUser?.id);
    setSymptoms(updated);
    if (currentUser?.id) {
      supabaseSync.deleteSymptom(id, currentUser.id);
    }
  };

  // Profile & Compound Handlers
  const handleSaveProfile = (newProfile: UserProfile) => {
    storage.saveProfile(newProfile, currentUser?.id);
    setProfile(newProfile);
  };

  const handleAddCustomCompound = (newCompound: Compound) => {
    const updated = [...compounds, newCompound];
    storage.saveCompounds(updated, currentUser?.id);
    setCompounds(updated);
    setSelectedCompoundId(newCompound.id);
  };

  const handleToggleCompound = (id: string, enabled: boolean) => {
    const updated = storage.toggleCompoundEnabled(id, enabled, currentUser?.id);
    setCompounds(updated);
    if (!enabled && selectedCompoundId === id) {
      const remaining = updated.filter(c => c.enabled !== false);
      if (remaining.length > 0) {
        setSelectedCompoundId(remaining[0].id);
        storage.setActiveCompoundId(remaining[0].id, currentUser?.id);
      }
    }
  };

  const handleToggleAllInCategory = (category: string, enabled: boolean) => {
    const updated = storage.toggleAllCompoundsInCategory(category, enabled, currentUser?.id);
    setCompounds(updated);
    const remaining = updated.filter(c => c.enabled !== false);
    if (remaining.length > 0 && !remaining.some(c => c.id === selectedCompoundId)) {
      setSelectedCompoundId(remaining[0].id);
      storage.setActiveCompoundId(remaining[0].id, currentUser?.id);
    }
  };

  // Only compounds that are enabled are shown in daily dropdowns & selectors
  const enabledCompounds = useMemo(() => {
    const list = compounds.filter(c => c.enabled !== false);
    return list.length > 0 ? list : compounds;
  }, [compounds]);

  const activeCompound = compounds.find(c => c.id === selectedCompoundId) || enabledCompounds[0] || compounds[0];
  const lastUsedSite = injections[0]?.site;

  // If user is not authenticated, present AuthScreen
  if (!currentUser) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Header */}
      {enabledCompounds.length > 0 && (
        <Header
          compounds={enabledCompounds}
          selectedCompoundId={selectedCompoundId}
          currentUser={currentUser}
          onLogout={handleLogout}
          onOpenAdmin={() => setIsAdminPanelOpen(true)}
          onSelectCompound={handleSelectCompound}
          onOpenNewInjection={() => setIsInjectionModalOpen(true)}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-36 sm:pb-32 space-y-6">
        {/* TAB 1: DASHBOARD & CURVA */}
        {currentTab === 'chart' && activeCompound && (
          <div className="space-y-6 animate-fadeIn">
            {/* Main Serum Curve with Multi-Metric Drop List & Weight correlation */}
            <PharmacokineticChart
              compound={activeCompound}
              compounds={compounds}
              injections={injections}
              protocols={protocols}
              labs={labs}
              symptoms={symptoms}
              onOpenLogDose={() => setIsInjectionModalOpen(true)}
            />

            {/* Quick stats & Rotation Guide */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <BodySiteRotationCard injections={injections} />

              {/* Protocol status summary card */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Protocolos Ativos
                    </span>
                    <button
                      onClick={() => setCurrentTab('protocols')}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
                    >
                      Gerenciar <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2 pt-1">
                    {protocols.filter(p => p.active).map(proto => {
                      const comp = compounds.find(c => c.id === proto.compoundId);
                      return (
                        <div
                          key={proto.id}
                          className="flex items-center justify-between p-3 bg-slate-950/70 border border-slate-800/80 rounded-2xl"
                        >
                          <div className="truncate pr-2">
                            <span className="text-xs font-bold text-white block truncate">
                              {proto.name}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {proto.dose} {comp?.unit || 'mg'} • {comp?.name}
                            </span>
                          </div>
                          <button
                            onClick={() => handleQuickLogFromProtocol(proto)}
                            className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold shrink-0 transition-colors"
                          >
                            Tomar Dose
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="p-3 bg-gradient-to-r from-blue-950/40 via-purple-950/40 to-slate-950 border border-slate-800/80 rounded-2xl flex items-center justify-between text-xs">
                  <span className="text-slate-300 flex items-center gap-2">
                    <Heart className="w-4 h-4 text-rose-400" />
                    Check-in de bem-estar de hoje
                  </span>
                  <button
                    onClick={() => setCurrentTab('symptoms')}
                    className="font-bold text-rose-400 hover:text-rose-300 transition-colors"
                  >
                    Registrar Agora →
                  </button>
                </div>
              </div>
            </div>

            {/* Quick latest injections */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                  Últimas Doses Registradas
                </h3>
                <button
                  onClick={() => setCurrentTab('injections')}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                >
                  Ver Todas ({injections.length})
                </button>
              </div>
              <InjectionList
                injections={injections.slice(0, 3)}
                compounds={compounds}
                onDeleteInjection={handleDeleteInjection}
                onOpenNewInjection={() => setIsInjectionModalOpen(true)}
              />
            </div>
          </div>
        )}

        {/* TAB 2: INJEÇÕES & ROTAÇÃO */}
        {currentTab === 'injections' && (
          <div className="space-y-6 animate-fadeIn">
            <BodySiteRotationCard injections={injections} />
            <InjectionList
              injections={injections}
              compounds={compounds}
              onDeleteInjection={handleDeleteInjection}
              onOpenNewInjection={() => setIsInjectionModalOpen(true)}
            />
          </div>
        )}

        {/* TAB 3: PROTOCOLOS */}
        {currentTab === 'protocols' && (
          <div className="animate-fadeIn">
            <ProtocolManager
              protocols={protocols}
              compounds={enabledCompounds}
              onSaveProtocol={handleSaveProtocol}
              onDeleteProtocol={handleDeleteProtocol}
              onToggleActive={handleToggleProtocolActive}
              onQuickLogFromProtocol={handleQuickLogFromProtocol}
            />
          </div>
        )}

        {/* TAB 4: CALCULADORA DE DILUIÇÃO (MODELO CELLGENIC) */}
        {currentTab === 'calc' && (
          <div className="animate-fadeIn">
            <PeptideDilutionCalculator
              onApplyCalculatedDose={() => {
                setIsInjectionModalOpen(true);
              }}
            />
          </div>
        )}

        {/* TAB 5: EXAMES DE SANGUE */}
        {currentTab === 'labs' && (
          <div className="animate-fadeIn">
            <LabTracker
              labs={labs}
              onSaveLab={handleSaveLab}
              onDeleteLab={handleDeleteLab}
            />
          </div>
        )}

        {/* TAB 6: SAÚDE, PESO & SINTOMAS */}
        {currentTab === 'symptoms' && (
          <div className="animate-fadeIn">
            <SymptomTracker
              symptoms={symptoms}
              onSaveSymptom={handleSaveSymptom}
              onDeleteSymptom={handleDeleteSymptom}
              profile={profile}
              onSaveProfile={handleSaveProfile}
              injections={injections}
            />
          </div>
        )}

        {/* Espaçador de segurança para nunca sobrepor a barra inferior fixa */}
        <div className="h-32 sm:h-40 w-full shrink-0 pointer-events-none" aria-hidden="true" />
      </main>

      {/* Bottom Navigation */}
      <BottomNav currentTab={currentTab} onChangeTab={setCurrentTab} />

      {/* Modals */}
      {enabledCompounds.length > 0 && (
        <InjectionModal
          isOpen={isInjectionModalOpen}
          onClose={() => {
            setIsInjectionModalOpen(false);
            setQuickLogProtocol(null);
          }}
          compounds={enabledCompounds}
          defaultCompoundId={selectedCompoundId}
          onSaveInjection={handleSaveInjection}
          lastUsedSite={lastUsedSite}
          protocols={protocols}
          selectedProtocol={quickLogProtocol}
          onOpenDilutionCalculator={() => {
            setIsInjectionModalOpen(false);
            setQuickLogProtocol(null);
            setCurrentTab('calc');
          }}
        />
      )}

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        profile={profile}
        compounds={compounds}
        onSaveProfile={handleSaveProfile}
        onAddCustomCompound={handleAddCustomCompound}
        onToggleCompound={handleToggleCompound}
        onToggleAllInCategory={handleToggleAllInCategory}
        onReloadAllData={loadAllData}
      />

      {/* Admin Management Panel */}
      {isAdminPanelOpen && currentUser && (
        <AdminPanel
          currentUser={currentUser}
          onClose={() => setIsAdminPanelOpen(false)}
          compounds={compounds}
          onAddGlobalCompound={handleAddCustomCompound}
        />
      )}
    </div>
  );
}

export default App;
