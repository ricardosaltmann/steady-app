import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { storage } from './lib/storage';
import { syncOutbox } from './lib/syncOutbox';
import { syncEngine } from './lib/syncEngine';
import { auth } from './lib/auth';
import { getLocalDateKey, getLocalTimeKey } from './lib/dateUtils';
import { isProtocolDueToday } from './lib/notifications';
import { formatCompoundDose } from './lib/doseFormatter';
import { Compound, Injection, Protocol, LabResult, SymptomLog, UserProfile, DailyWaterData, NotificationSettings, UserAccount } from './types';
import { useAuth } from './hooks/useAuth';
import { useReminders } from './hooks/useReminders';
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
import { WaterCard } from './components/Water/WaterCard';
import { WaterModal } from './components/Water/WaterModal';
import { NotificationModal } from './components/Notifications/NotificationModal';
import { ChevronRight, Heart } from 'lucide-react';

export function App() {
  const { currentUser, setCurrentUser, handleLoginSuccess, handleLogout } = useAuth();

  const [compounds, setCompounds] = useState<Compound[]>([]);
  const [selectedCompoundId, setSelectedCompoundId] = useState<string>('test_cypionate');
  const [injections, setInjections] = useState<Injection[]>([]);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [labs, setLabs] = useState<LabResult[]>([]);
  const [symptoms, setSymptoms] = useState<SymptomLog[]>([]);
  const [profile, setProfile] = useState<UserProfile>({ name: '', gender: 'male' });
  const [waterData, setWaterData] = useState<DailyWaterData>(() => storage.getWaterData());
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(() => storage.getNotificationSettings());

  const [currentTab, setCurrentTab] = useState<NavTab>('chart');
  const [isInjectionModalOpen, setIsInjectionModalOpen] = useState(false);
  const [quickLogProtocol, setQuickLogProtocol] = useState<Protocol | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'compounds' | 'profile' | 'backup'>('compounds');
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isWaterModalOpen, setIsWaterModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

  // Load data for active user (single unified call per session)
  const loadAllData = useCallback((targetUserId?: string) => {
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
    const loadedWater = storage.getWaterData(undefined, uid);
    const loadedNotifications = storage.getNotificationSettings(uid);

    setCompounds(loadedCompounds);
    setInjections(loadedInjections);
    setProtocols(loadedProtocols);
    setLabs(loadedLabs);
    setSymptoms(loadedSymptoms);
    setProfile(loadedProfile);
    setWaterData(loadedWater);
    setNotificationSettings(loadedNotifications);
    
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

    // 2. Resilient Background Cloud Sync via SyncEngine (Pull + Two-Way Merge + Outbox Push)
    if (!uid.startsWith('user_demo')) {
      syncEngine.pullAll(uid).then(result => {
        if (result) {
          setInjections(result.injections);
          setProtocols(result.protocols);
          setLabs(result.labs);
          setSymptoms(result.symptoms);
          if (result.profile) setProfile(result.profile);
          if (result.water) setWaterData(result.water);
        }
      });
    }
  }, [currentUser?.id]);

  // Unified single initialization effect per active session (Fix for Bug #29)
  useEffect(() => {
    if (currentUser?.id) {
      loadAllData(currentUser.id);
      syncEngine.init(currentUser.id);
    }
    return () => {
      syncEngine.stop();
    };
  }, [currentUser?.id, loadAllData]);

  // Hook for background medication and hydration reminders
  useReminders({
    userId: currentUser?.id,
    protocols,
    compounds,
    waterData,
    notificationSettings,
    setNotificationSettings,
  });

  // Injection Handlers
  const handleSaveInjection = (newInj: Injection) => {
    const updated = storage.addInjection(newInj, currentUser?.id);
    setInjections(updated);
    if (currentUser?.id) {
      syncOutbox.enqueue('injection', 'upsert', newInj.id, newInj, currentUser.id);
      syncEngine.processOutbox(currentUser.id);
    }
  };

  const handleDeleteInjection = (id: string) => {
    const updated = storage.deleteInjection(id, currentUser?.id);
    setInjections(updated);
    if (currentUser?.id) {
      syncOutbox.enqueue('injection', 'delete', id, undefined, currentUser.id);
      syncEngine.processOutbox(currentUser.id);
    }
  };

  // Protocol Handlers
  const handleSaveProtocol = (protocol: Protocol) => {
    // Se estava registrado como deletado, remove para permitir salvar/recriar
    storage.removeDeletedProtocolId(protocol.id, currentUser?.id);

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
      syncOutbox.enqueue('protocol', 'upsert', protocol.id, protocol, currentUser.id);
      syncEngine.processOutbox(currentUser.id);
    }
  };

  const handleDeleteProtocol = async (id: string): Promise<boolean> => {
    // 1. Registrar o ID nos itens excluídos para blindar contra qualquer re-importação futura (Tombstone)
    storage.addDeletedProtocolId(id, currentUser?.id);

    // 2. Atualizar imediatamente o estado visual e o storage local
    const updated = protocols.filter(p => p.id !== id);
    storage.saveProtocols(updated, currentUser?.id);
    setProtocols(updated);

    // 3. Enfileirar deleção transacional na Outbox para replicação offline-first no Supabase
    if (currentUser?.id) {
      syncOutbox.enqueue('protocol', 'delete', id, undefined, currentUser.id);
      syncEngine.processOutbox(currentUser.id);
    }
    return true;
  };

  const handleToggleProtocolActive = (id: string) => {
    const updated = protocols.map(p => 
      p.id === id ? { ...p, active: !p.active } : p
    );
    storage.saveProtocols(updated, currentUser?.id);
    setProtocols(updated);
    const target = updated.find(p => p.id === id);
    if (target && currentUser?.id) {
      syncOutbox.enqueue('protocol', 'upsert', target.id, target, currentUser.id);
      syncEngine.processOutbox(currentUser.id);
    }
  };

  const handleQuickLogFromProtocol = (protocol: Protocol) => {
    setSelectedCompoundId(protocol.compoundId);
    setQuickLogProtocol(protocol);
    setIsInjectionModalOpen(true);
  };

  // Lab Handlers
  const handleSaveLab = (lab: LabResult) => {
    const updated = [lab, ...labs.filter(l => l.id !== lab.id)];
    storage.saveLabs(updated, currentUser?.id);
    setLabs(updated);
    if (currentUser?.id) {
      syncOutbox.enqueue('lab', 'upsert', lab.id, lab, currentUser.id);
      syncEngine.processOutbox(currentUser.id);
    }
  };

  const handleDeleteLab = (id: string) => {
    const updated = labs.filter(l => l.id !== id);
    storage.saveLabs(updated, currentUser?.id);
    setLabs(updated);
    if (currentUser?.id) {
      syncOutbox.enqueue('lab', 'delete', id, undefined, currentUser.id);
      syncEngine.processOutbox(currentUser.id);
    }
  };

  // Symptom Handlers
  const handleSaveSymptom = (log: SymptomLog) => {
    const today = getLocalDateKey();
    const enrichedLog: SymptomLog = {
      ...log,
      waterMl: log.waterMl !== undefined ? log.waterMl : (log.date === today ? waterData.totalMl : undefined),
    };
    const updated = [enrichedLog, ...symptoms.filter(s => s.id !== enrichedLog.id)];
    storage.saveSymptoms(updated, currentUser?.id);
    setSymptoms(updated);
    if (currentUser?.id) {
      syncOutbox.enqueue('symptom', 'upsert', enrichedLog.id, enrichedLog, currentUser.id);
      syncEngine.processOutbox(currentUser.id);
    }
  };

  const handleSaveSymptoms = (newLogs: SymptomLog[]) => {
    if (!newLogs || newLogs.length === 0) return;
    const newMap = new Map(newLogs.map(l => [l.id, l]));
    const updated = [...newLogs, ...symptoms.filter(s => !newMap.has(s.id))];
    storage.saveSymptoms(updated, currentUser?.id);
    setSymptoms(updated);
    if (currentUser?.id) {
      newLogs.forEach(l => syncOutbox.enqueue('symptom', 'upsert', l.id, l, currentUser.id));
      syncEngine.processOutbox(currentUser.id);
    }
  };

  const handleDeleteSymptom = (id: string) => {
    const updated = symptoms.filter(s => s.id !== id);
    storage.saveSymptoms(updated, currentUser?.id);
    setSymptoms(updated);
    if (currentUser?.id) {
      syncOutbox.enqueue('symptom', 'delete', id, undefined, currentUser.id);
      syncEngine.processOutbox(currentUser.id);
    }
  };

  // Water Handlers
  const handleAddWater = (amountMl: number, targetMl?: number) => {
    const updated = storage.addWaterLog(amountMl, targetMl, undefined, currentUser?.id);
    setWaterData(updated);
    if (currentUser?.id) {
      syncOutbox.enqueue('water', 'upsert', updated.date, updated, currentUser.id);
      syncEngine.processOutbox(currentUser.id);
    }
  };

  const handleDeleteWaterEntry = (id: string) => {
    const updated = storage.deleteWaterLog(id, undefined, currentUser?.id);
    setWaterData(updated);
    if (currentUser?.id) {
      syncOutbox.enqueue('water', 'upsert', updated.date, updated, currentUser.id);
      syncEngine.processOutbox(currentUser.id);
    }
  };

  const handleUpdateWaterTarget = (targetMl: number) => {
    const updated = { ...waterData, targetMl };
    storage.saveWaterData(updated, currentUser?.id);
    setWaterData(updated);
    if (currentUser?.id) {
      syncOutbox.enqueue('water', 'upsert', updated.date, updated, currentUser.id);
      syncEngine.processOutbox(currentUser.id);
    }
  };

  const handleUpdateNotificationSettings = (settings: NotificationSettings) => {
    storage.saveNotificationSettings(settings, currentUser?.id);
    setNotificationSettings(settings);
  };

  // Profile & Compound Handlers
  const handleSaveProfile = (newProfile: UserProfile, updatedAccount?: Partial<UserAccount>) => {
    storage.saveProfile(newProfile, currentUser?.id);
    setProfile(newProfile);
    if (currentUser) {
      const mergedAccount: Partial<UserAccount> = {
        name: newProfile.name,
        phone: newProfile.phone,
        age: newProfile.age,
        gender: newProfile.gender,
        heightCm: newProfile.heightCm,
        weightKg: newProfile.weightKg,
        targetWeightKg: newProfile.targetWeightKg,
        bodyFatPercent: newProfile.bodyFatPercent,
        goal: newProfile.goal,
        activityLevel: newProfile.activityLevel,
        marketingConsent: newProfile.marketingConsent,
        ...updatedAccount,
      };
      const updated = auth.updateProfile(currentUser.id, mergedAccount);
      if (updated) {
        setCurrentUser(updated);
      }
      syncOutbox.enqueue('profile', 'upsert', currentUser.id, newProfile, currentUser.id);
      syncEngine.processOutbox(currentUser.id);
    }
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

  const todayStr = getLocalDateKey();
  const pendingDueProtocols = useMemo(() => {
    return protocols.filter(p => {
      if (!p.active || !isProtocolDueToday(p)) return false;
      const takenToday = injections.some(inj => 
        (inj.protocolId === p.id || inj.compoundId === p.compoundId) &&
        inj.date.startsWith(todayStr)
      );
      return !takenToday;
    });
  }, [protocols, injections, todayStr]);

  const hasDueReminders = Boolean(notificationSettings.medicationReminders && pendingDueProtocols.length > 0);
  const currentHourMinute = getLocalTimeKey();
  const isAlarmActive = Boolean(hasDueReminders && currentHourMinute >= (notificationSettings.medicationTime || '08:00'));

  // If user is not authenticated, present AuthScreen
  if (!currentUser) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Header */}
      <Header
        currentUser={currentUser}
        todayWaterMl={waterData.totalMl}
        onLogout={handleLogout}
        onOpenAdmin={() => setIsAdminPanelOpen(true)}
        onOpenNewInjection={() => setIsInjectionModalOpen(true)}
        onOpenSettings={(tab) => {
          setSettingsTab(tab || 'compounds');
          setIsSettingsModalOpen(true);
        }}
        onOpenWaterModal={() => setIsWaterModalOpen(true)}
        onOpenNotificationsModal={() => setIsNotificationModalOpen(true)}
        hasDueReminders={hasDueReminders}
        isAlarmActive={isAlarmActive}
      />

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

            {/* Quick stats, Water & Rotation Guide */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <BodySiteRotationCard injections={injections} />

              <WaterCard
                waterData={waterData}
                onQuickAdd={handleAddWater}
                onOpenModal={() => setIsWaterModalOpen(true)}
              />

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
                              {formatCompoundDose(proto.dose, comp?.unit).fullText} • {comp?.name}
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
              gender={profile?.gender || 'male'}
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
              onSaveSymptoms={handleSaveSymptoms}
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
        currentUser={currentUser}
        compounds={compounds}
        onSaveProfile={handleSaveProfile}
        onAddCustomCompound={handleAddCustomCompound}
        onToggleCompound={handleToggleCompound}
        onToggleAllInCategory={handleToggleAllInCategory}
        onReloadAllData={loadAllData}
        onLogout={handleLogout}
        initialTab={settingsTab}
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

      {/* Water Tracking Modal */}
      {isWaterModalOpen && (
        <WaterModal
          waterData={waterData}
          notificationSettings={notificationSettings}
          onAddWater={handleAddWater}
          onDeleteEntry={handleDeleteWaterEntry}
          onUpdateTarget={handleUpdateWaterTarget}
          onUpdateNotificationSettings={handleUpdateNotificationSettings}
          onClose={() => setIsWaterModalOpen(false)}
        />
      )}

      {/* Notifications & Reminders Modal */}
      {isNotificationModalOpen && (
        <NotificationModal
          protocols={protocols}
          compounds={compounds}
          injections={injections}
          settings={notificationSettings}
          onSaveSettings={handleUpdateNotificationSettings}
          onQuickLogDose={handleQuickLogFromProtocol}
          onClose={() => setIsNotificationModalOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
