import React, { useState, useEffect, useMemo } from 'react';
import { App as CapApp } from '@capacitor/app';
import { storage } from './lib/storage';
import { auth } from './lib/auth';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { supabaseSync } from './lib/supabaseSync';
import { mergeCollections } from './lib/syncMerge';
import { notificationsService, isProtocolDueToday } from './lib/notifications';
import { formatCompoundDose } from './lib/doseFormatter';
import { Compound, Injection, Protocol, LabResult, SymptomLog, UserProfile, UserAccount, DailyWaterData, NotificationSettings } from './types';
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
import { Syringe, Sparkles, ChevronRight, Activity, Calendar, Heart, User, LogOut } from 'lucide-react';

export function App() {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => auth.getCurrentUser());

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

  // Deep Link listener for OAuth redirect (steadysync://login-callback)
  useEffect(() => {
    let isMounted = true;

    const setupDeepLinkListener = async () => {
      try {
        const handler = await CapApp.addListener('appUrlOpen', async (data: { url: string }) => {
          if (!data?.url) return;

          // Process steadysync:// callback
          if (data.url.startsWith('steadysync://') || data.url.includes('access_token=') || data.url.includes('code=')) {
            // 1. If URL has hash with access_token (implicit flow)
            if (data.url.includes('#access_token') || data.url.includes('access_token=')) {
              const hashIndex = data.url.indexOf('#');
              const hashString = hashIndex !== -1 ? data.url.substring(hashIndex + 1) : data.url.split('?')[1] || '';
              const params = new URLSearchParams(hashString);
              const accessToken = params.get('access_token');
              const refreshToken = params.get('refresh_token');

              if (accessToken && refreshToken && isSupabaseConfigured()) {
                const { data: sessionData, error } = await supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                });

                if (!error && sessionData.user && isMounted) {
                  const isAdmin = await supabaseSync.checkIsAdmin(sessionData.user.id);
                  const cachedUser: UserAccount = {
                    id: sessionData.user.id,
                    name: sessionData.user.user_metadata?.name || sessionData.user.email?.split('@')[0] || 'Usuário',
                    email: sessionData.user.email || '',
                    gender: sessionData.user.user_metadata?.gender || 'male',
                    therapeuticGoal: sessionData.user.user_metadata?.therapeutic_goal || 'male_trt',
                    createdAt: sessionData.user.created_at,
                    isAdmin,
                  };
                  handleLoginSuccess(cachedUser);
                }
              }
            }

            // 2. If URL has authorization code (PKCE flow)
            if (data.url.includes('code=') && isSupabaseConfigured()) {
              const queryIndex = data.url.indexOf('?');
              if (queryIndex !== -1) {
                const queryString = data.url.substring(queryIndex + 1);
                const params = new URLSearchParams(queryString);
                const code = params.get('code');
                if (code) {
                  const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);
                  if (!error && sessionData.user && isMounted) {
                    const isAdmin = await supabaseSync.checkIsAdmin(sessionData.user.id);
                    const cachedUser: UserAccount = {
                      id: sessionData.user.id,
                      name: sessionData.user.user_metadata?.name || sessionData.user.email?.split('@')[0] || 'Usuário',
                      email: sessionData.user.email || '',
                      gender: sessionData.user.user_metadata?.gender || 'male',
                      therapeuticGoal: sessionData.user.user_metadata?.therapeutic_goal || 'male_trt',
                      createdAt: sessionData.user.created_at,
                      isAdmin,
                    };
                    handleLoginSuccess(cachedUser);
                  }
                }
              }
            }
          }
        });

        return () => {
          handler.remove();
        };
      } catch {
        // Fallback for non-Capacitor environment
      }
    };

    setupDeepLinkListener();

    return () => {
      isMounted = false;
    };
  }, []);

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

    // 2. Safe Background Cloud Sync from Supabase with Merge Logic
    if (!uid.startsWith('user_demo')) {
      supabaseSync.getInjections(uid).then(cloudInjs => {
        if (cloudInjs && cloudInjs.length > 0) {
          const currentLocal = storage.getInjections(uid);
          const { merged, itemsToPushToCloud } = mergeCollections(currentLocal, cloudInjs);
          setInjections(merged);
          storage.saveInjections(merged, uid);
          itemsToPushToCloud.forEach(inj => supabaseSync.saveInjection(inj, uid));
        }
      });

      supabaseSync.getProtocols(uid).then(cloudProtos => {
        if (cloudProtos && cloudProtos.length > 0) {
          const deletedIds = storage.getDeletedProtocolIds(uid);

          // Purgar do Supabase qualquer item retornado que o usuário já tenha excluído
          const resurrectedInCloud = cloudProtos.filter(p => deletedIds.has(p.id));
          resurrectedInCloud.forEach(p => {
            console.log('[Supabase Sync] Purgando protocolo previamente excluído pelo usuário:', p.id);
            supabaseSync.deleteProtocol(p.id, uid);
          });

          // Filtra apenas protocolos válidos (não excluídos)
          const validCloudProtos = cloudProtos.filter(p => !deletedIds.has(p.id));
          const currentLocal = storage.getProtocols(uid).filter(p => !deletedIds.has(p.id));
          const { merged, itemsToPushToCloud } = mergeCollections(currentLocal, validCloudProtos);
          const finalMerged = merged.filter(p => !deletedIds.has(p.id));

          setProtocols(finalMerged);
          storage.saveProtocols(finalMerged, uid);
          itemsToPushToCloud
            .filter(p => !deletedIds.has(p.id))
            .forEach(p => supabaseSync.saveProtocol(p, uid));
        }
      });

      supabaseSync.getLabs(uid).then(cloudLabs => {
        if (cloudLabs && cloudLabs.length > 0) {
          const currentLocal = storage.getLabs(uid);
          const { merged, itemsToPushToCloud } = mergeCollections(currentLocal, cloudLabs);
          setLabs(merged);
          storage.saveLabs(merged, uid);
          itemsToPushToCloud.forEach(l => supabaseSync.saveLab(l, uid));
        }
      });

      supabaseSync.getSymptoms(uid).then(cloudSymptoms => {
        if (cloudSymptoms && cloudSymptoms.length > 0) {
          const currentLocal = storage.getSymptoms(uid);
          const { merged, itemsToPushToCloud } = mergeCollections(currentLocal, cloudSymptoms);
          setSymptoms(merged);
          storage.saveSymptoms(merged, uid);
          itemsToPushToCloud.forEach(s => supabaseSync.saveSymptom(s, uid));
        }
      });

      // Profile sync from Supabase
      supabaseSync.getProfile(uid).then(cloudProfile => {
        if (cloudProfile) {
          const currentLocal = storage.getProfile(uid);
          const mergedProfile: UserProfile = {
            ...currentLocal,
            ...cloudProfile,
          };
          setProfile(mergedProfile);
          storage.saveProfile(mergedProfile, uid);
        }
      });

      // Today's water sync from Supabase
      const today = new Date().toISOString().slice(0, 10);
      supabaseSync.getWaterData(today, uid).then(cloudWater => {
        if (cloudWater && cloudWater.entries.length > 0) {
          const localWater = storage.getWaterData(today, uid);
          const existingIds = new Set(localWater.entries.map(e => e.id));
          const newFromCloud = cloudWater.entries.filter(e => !existingIds.has(e.id));
          if (newFromCloud.length > 0) {
            const mergedEntries = [...localWater.entries, ...newFromCloud];
            const totalMl = mergedEntries.reduce((acc, curr) => acc + curr.amountMl, 0);
            const merged: DailyWaterData = {
              ...localWater,
              totalMl,
              entries: mergedEntries,
            };
            setWaterData(merged);
            storage.saveWaterData(merged, uid);
          }
        }
      });
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadAllData(currentUser.id);
    }
  }, [currentUser?.id]);

  // Periodic background check for due medications & water reminders
  useEffect(() => {
    if (!currentUser) return;

    const checkReminders = () => {
      const now = new Date();
      const currentHourMinute = now.toTimeString().slice(0, 5);
      const todayStr = now.toISOString().slice(0, 10);

      // 1. Medication reminder check
      if (notificationSettings.medicationReminders) {
        const activeProtos = protocols.filter(p => p.active);
        const due = activeProtos.filter(p => isProtocolDueToday(p));

        if (due.length > 0 && notificationSettings.lastMedReminderDate !== todayStr) {
          if (currentHourMinute >= (notificationSettings.medicationTime || '08:00')) {
            const first = due[0];
            const comp = compounds.find(c => c.id === first.compoundId);
            const compDoseStr = formatCompoundDose(first.dose, comp?.unit).fullText;
            notificationsService.sendMedicationReminder(
              first.name,
              compDoseStr,
              notificationSettings.soundEnabled
            );
            const updated = { ...notificationSettings, lastMedReminderDate: todayStr };
            setNotificationSettings(updated);
            storage.saveNotificationSettings(updated, currentUser.id);
          }
        }
      }

      // 2. Water reminder check
      if (notificationSettings.waterReminders) {
        const lastTimestamp = notificationSettings.lastWaterReminderTimestamp || 0;
        const intervalMs = (notificationSettings.waterIntervalHours || 2) * 3600000;
        if (Date.now() - lastTimestamp >= intervalMs) {
          const remaining = Math.max(0, (waterData.targetMl || 2500) - waterData.totalMl);
          if (remaining > 0) {
            notificationsService.sendWaterReminder(remaining, notificationSettings.soundEnabled);
          }
          const updated = { ...notificationSettings, lastWaterReminderTimestamp: Date.now() };
          setNotificationSettings(updated);
          storage.saveNotificationSettings(updated, currentUser.id);
        }
      }
    };

    checkReminders();
    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, [currentUser, protocols, compounds, waterData, notificationSettings]);

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
      supabaseSync.saveProtocol(protocol, currentUser.id);
    }
  };

  const handleDeleteProtocol = async (id: string): Promise<boolean> => {
    const protocolToDelete = protocols.find(p => p.id === id);
    const protocolName = protocolToDelete?.name || 'Protocolo';

    // 1. Exclusão Definitiva no Supabase ANTES de atualizar o estado visual
    if (currentUser?.id && !currentUser.id.startsWith('user_demo') && isSupabaseConfigured()) {
      const res = await supabaseSync.deleteProtocol(id, currentUser.id);
      if (!res.success) {
        alert(`Erro ao excluir o protocolo "${protocolName}" no banco de dados: ${res.error || 'Erro desconhecido'}.\n\nO item NÃO foi removido da tela.`);
        return false;
      }
    }

    // 2. Registrar o ID nos itens excluídos para blindar contra qualquer re-importação futura
    storage.addDeletedProtocolId(id, currentUser?.id);

    // 3. Atualizar imediatamente o estado visual e o storage local após o sucesso
    const updated = protocols.filter(p => p.id !== id);
    storage.saveProtocols(updated, currentUser?.id);
    setProtocols(updated);
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
    const today = new Date().toISOString().slice(0, 10);
    const enrichedLog: SymptomLog = {
      ...log,
      waterMl: log.waterMl !== undefined ? log.waterMl : (log.date === today ? waterData.totalMl : undefined),
    };
    const updated = [enrichedLog, ...symptoms.filter(s => s.id !== enrichedLog.id)];
    storage.saveSymptoms(updated, currentUser?.id);
    setSymptoms(updated);
    if (currentUser?.id) {
      supabaseSync.saveSymptom(enrichedLog, currentUser.id);
    }
  };

  const handleSaveSymptoms = (newLogs: SymptomLog[]) => {
    if (!newLogs || newLogs.length === 0) return;
    const newMap = new Map(newLogs.map(l => [l.id, l]));
    const updated = [...newLogs, ...symptoms.filter(s => !newMap.has(s.id))];
    storage.saveSymptoms(updated, currentUser?.id);
    setSymptoms(updated);
    if (currentUser?.id) {
      newLogs.forEach(l => supabaseSync.saveSymptom(l, currentUser.id));
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

  // Water Handlers
  const handleAddWater = (amountMl: number, targetMl?: number) => {
    const updated = storage.addWaterLog(amountMl, targetMl, undefined, currentUser?.id);
    setWaterData(updated);
    if (currentUser?.id && updated.entries[0]) {
      supabaseSync.saveWaterEntry(updated.entries[0], updated.date, updated.targetMl, currentUser.id);
    }
  };

  const handleDeleteWaterEntry = (id: string) => {
    const updated = storage.deleteWaterLog(id, undefined, currentUser?.id);
    setWaterData(updated);
    if (currentUser?.id) {
      supabaseSync.deleteWaterEntry(id, currentUser.id);
    }
  };

  const handleUpdateWaterTarget = (targetMl: number) => {
    const updated = { ...waterData, targetMl };
    storage.saveWaterData(updated, currentUser?.id);
    setWaterData(updated);
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
      supabaseSync.saveProfile(newProfile, currentUser.id);
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

  const todayStr = new Date().toISOString().slice(0, 10);
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
  const currentHourMinute = new Date().toTimeString().slice(0, 5);
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
