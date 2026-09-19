import { UserAccount, CompoundCategory } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';

const AUTH_STORAGE_KEYS = {
  USERS: 'steady_users_v1',
  CURRENT_USER_ID: 'steady_current_user_id_v1',
  CACHED_USER: 'steady_cached_user_v1',
};

// Pure server-driven admin validation helper
export const isUserAdmin = (dbIsAdmin?: boolean | null, roles?: string[]): boolean => {
  if (roles && roles.includes('admin')) return true;
  return dbIsAdmin === true;
};

// Default pre-seeded demo user so testers can log in with 1 click
export const DEMO_USER: UserAccount = {
  id: 'user_demo',
  name: 'Usuário Teste / Atleta SteadySync',
  email: 'demo@steadysync.app',
  phone: '(11) 99999-8888',
  age: 34,
  gender: 'male',
  selectedCategories: ['steroid', 'peptide', 'fertility'],
  createdAt: new Date().toISOString(),
  therapeuticGoal: 'male_trt',
  isAdmin: false, // Modo demo isolado não possui privilégios de produção
};

export const auth = {
  getUsers: (): UserAccount[] => {
    const raw = localStorage.getItem(AUTH_STORAGE_KEYS.USERS);
    if (!raw) {
      localStorage.setItem(AUTH_STORAGE_KEYS.USERS, JSON.stringify([DEMO_USER]));
      return [DEMO_USER];
    }
    try {
      const list = JSON.parse(raw) as UserAccount[];
      if (!list.some(u => u.id === DEMO_USER.id)) {
        list.unshift(DEMO_USER);
        localStorage.setItem(AUTH_STORAGE_KEYS.USERS, JSON.stringify(list));
      }
      return list;
    } catch {
      return [DEMO_USER];
    }
  },

  getCurrentUser: (): UserAccount | null => {
    // 1. Check cached active user
    const rawCached = localStorage.getItem(AUTH_STORAGE_KEYS.CACHED_USER);
    if (rawCached) {
      try {
        return JSON.parse(rawCached);
      } catch {
        // ignore
      }
    }

    const currentId = localStorage.getItem(AUTH_STORAGE_KEYS.CURRENT_USER_ID);
    if (!currentId) return null;

    if (currentId === DEMO_USER.id) return DEMO_USER;

    const users = auth.getUsers();
    return users.find(u => u.id === currentId) || null;
  },

  signIn: async (email: string, password: string): Promise<{ success: boolean; user?: UserAccount; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Acesso direto ao Modo Demo
    if (cleanEmail === DEMO_USER.email || cleanEmail === 'demo@steady.app') {
      const demoUser = auth.signInAsDemo();
      return { success: true, user: demoUser };
    }

    // 2. Autenticação oficial e segura via Supabase Auth
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) {
          return { success: false, error: error.message };
        }

        if (data.user) {
          // Busca perfil no banco
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          const isAdmin = isUserAdmin(profile?.is_admin);

          const userAccount: UserAccount = {
            id: data.user.id,
            name: profile?.name || data.user.user_metadata?.name || splitEmail(cleanEmail),
            email: cleanEmail,
            phone: profile?.phone || data.user.user_metadata?.phone,
            age: profile?.age || data.user.user_metadata?.age,
            gender: profile?.gender || data.user.user_metadata?.gender || 'male',
            heightCm: profile?.height_cm ? Number(profile.height_cm) : undefined,
            weightKg: profile?.weight_kg ? Number(profile.weight_kg) : undefined,
            targetWeightKg: profile?.target_weight_kg ? Number(profile.target_weight_kg) : undefined,
            bodyFatPercent: profile?.body_fat_percent ? Number(profile.body_fat_percent) : undefined,
            goal: profile?.goal || undefined,
            activityLevel: profile?.activity_level || 'moderate',
            marketingConsent: profile?.marketing_consent ?? true,
            selectedCategories: profile?.selected_categories || data.user.user_metadata?.selected_categories,
            createdAt: data.user.created_at,
            therapeuticGoal: profile?.therapeutic_goal || data.user.user_metadata?.therapeutic_goal || 'male_trt',
            isAdmin,
          };

          localStorage.setItem(AUTH_STORAGE_KEYS.CURRENT_USER_ID, userAccount.id);
          localStorage.setItem(AUTH_STORAGE_KEYS.CACHED_USER, JSON.stringify(userAccount));
          return { success: true, user: userAccount };
        }
      } catch (err: any) {
        return { success: false, error: err.message || 'Erro ao conectar ao Supabase' };
      }
    }

    return { 
      success: false, 
      error: 'Serviço de autenticação indisponível offline. Utilize o botão "Experimentar Modo Demo" para testar a aplicação.' 
    };
  },

  signUp: async (
    name: string,
    email: string,
    password: string,
    phone?: string,
    age?: number,
    gender: 'male' | 'female' | 'other' = 'male',
    selectedCategories: CompoundCategory[] = ['peptide', 'steroid'],
    therapeuticGoal: UserAccount['therapeuticGoal'] = 'male_trt'
  ): Promise<{ success: boolean; user?: UserAccount; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();

    if (!name.trim()) {
      return { success: false, error: 'Informe seu nome ou apelido.' };
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Informe um e-mail válido.' };
    }

    if (!password || password.length < 4) {
      return { success: false, error: 'A senha deve ter pelo menos 4 caracteres.' };
    }

    // 1. Supabase Cloud Signup
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              name: name.trim(),
              phone: phone?.trim() || null,
              age: age ? Number(age) : null,
              gender,
              selected_categories: selectedCategories,
              therapeutic_goal: therapeuticGoal,
            },
          },
        });

        if (error) {
          return { success: false, error: error.message };
        }

        if (data.user) {
          try {
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('id')
              .eq('id', data.user.id)
              .single();

            if (!existingProfile) {
              await supabase.from('profiles').insert({
                id: data.user.id,
                email: cleanEmail,
                name: name.trim(),
                phone: phone?.trim() || null,
                age: age ? Number(age) : null,
                gender,
                selected_categories: selectedCategories,
                therapeutic_goal: therapeuticGoal,
                updated_at: new Date().toISOString(),
              });
            }
          } catch {
            // ignore
          }

          const userAccount: UserAccount = {
            id: data.user.id,
            name: name.trim(),
            email: cleanEmail,
            phone: phone?.trim() || undefined,
            age: age ? Number(age) : undefined,
            gender,
            selectedCategories,
            createdAt: data.user.created_at || new Date().toISOString(),
            therapeuticGoal,
            isAdmin: false,
          };

          localStorage.setItem(AUTH_STORAGE_KEYS.CURRENT_USER_ID, userAccount.id);
          localStorage.setItem(AUTH_STORAGE_KEYS.CACHED_USER, JSON.stringify(userAccount));
          return { success: true, user: userAccount };
        }
      } catch (err: any) {
        return { success: false, error: err.message || 'Erro ao criar conta no Supabase' };
      }
    }

    return {
      success: false,
      error: 'O cadastro de novas contas requer conexão com o servidor. Para experimentar a plataforma sem cadastro, utilize o Modo Demo.'
    };
  },

  signInAsDemo: (): UserAccount => {
    localStorage.setItem(AUTH_STORAGE_KEYS.CURRENT_USER_ID, DEMO_USER.id);
    localStorage.setItem(AUTH_STORAGE_KEYS.CACHED_USER, JSON.stringify(DEMO_USER));
    return DEMO_USER;
  },

  isDemoUser: (userId?: string): boolean => {
    return userId === DEMO_USER.id || (userId?.startsWith('user_demo') ?? false);
  },

  signOut: async (): Promise<void> => {
    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch {
        // ignore
      }
    }
    localStorage.removeItem(AUTH_STORAGE_KEYS.CURRENT_USER_ID);
    localStorage.removeItem(AUTH_STORAGE_KEYS.CACHED_USER);
  },

  updateProfile: (userId: string, updates: Partial<UserAccount>): UserAccount | null => {
    const users = auth.getUsers();
    const index = users.findIndex(u => u.id === userId);
    let updated: UserAccount;

    if (index !== -1) {
      users[index] = { ...users[index], ...updates };
      localStorage.setItem(AUTH_STORAGE_KEYS.USERS, JSON.stringify(users));
      updated = users[index];
    } else {
      const cached = auth.getCurrentUser() || DEMO_USER;
      updated = { ...cached, ...updates };
    }

    localStorage.setItem(AUTH_STORAGE_KEYS.CACHED_USER, JSON.stringify(updated));

    if (isSupabaseConfigured() && !userId.startsWith('user_demo')) {
      supabase.from('profiles').update({
        name: updates.name,
        phone: updates.phone,
        age: updates.age,
        gender: updates.gender,
        height_cm: updates.heightCm,
        weight_kg: updates.weightKg,
        target_weight_kg: updates.targetWeightKg,
        body_fat_percent: updates.bodyFatPercent,
        goal: updates.goal,
        activity_level: updates.activityLevel,
        marketing_consent: updates.marketingConsent,
        therapeutic_goal: updates.therapeuticGoal,
        updated_at: new Date().toISOString(),
      }).eq('id', userId).then();
    }

    return updated;
  },

  resetPassword: async (email: string): Promise<{ success: boolean; message: string; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, error: 'Por favor, informe seu e-mail cadastrado.', message: '' };
    }

    if (isSupabaseConfigured()) {
      try {
        // Garantir que o link do e-mail NUNCA aponte para localhost
        const redirectTo = 'https://willowy-naiad-b45d00.netlify.app';

        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo,
        });
        if (error) {
          return { success: false, error: error.message, message: '' };
        }
        return { 
          success: true, 
          message: `Código/link de recuperação enviado para ${cleanEmail}. Você pode inserir o código de verificação recebido diretamente aqui ou abrir o link.` 
        };
      } catch (err: any) {
        return { success: false, error: err.message || 'Erro ao conectar ao serviço de autenticação.', message: '' };
      }
    }

    return { 
      success: false, 
      error: 'Serviço de redefinição de senha indisponível offline. Conecte-se à internet para solicitar a recuperação oficial por e-mail.', 
      message: '' 
    };
  },

  verifyOtpAndResetPassword: async (
    email: string,
    token: string,
    newPassword: string
  ): Promise<{ success: boolean; user?: UserAccount; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = token.trim();

    if (!cleanToken) {
      return { success: false, error: 'Por favor, informe o código de verificação recebido no e-mail.' };
    }
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'A nova senha deve ter no mínimo 6 caracteres.' };
    }

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: cleanToken,
          type: 'recovery',
        });

        if (error) {
          return { success: false, error: error.message || 'Código de verificação inválido ou expirado.' };
        }

        // Token validado com sucesso, atualizar para a nova senha
        const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
        if (updateError) {
          return { success: false, error: updateError.message };
        }

        if (data.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          const userAccount: UserAccount = {
            id: data.user.id,
            name: profile?.name || data.user.user_metadata?.name || splitEmail(cleanEmail),
            email: cleanEmail,
            phone: profile?.phone || data.user.user_metadata?.phone,
            age: profile?.age || data.user.user_metadata?.age,
            gender: profile?.gender || data.user.user_metadata?.gender || 'male',
            selectedCategories: profile?.selected_categories || data.user.user_metadata?.selected_categories || ['steroid', 'peptide'],
            createdAt: data.user.created_at,
            therapeuticGoal: profile?.therapeutic_goal || data.user.user_metadata?.therapeutic_goal || 'male_trt',
            isAdmin: isUserAdmin(profile?.is_admin),
          };

          localStorage.setItem(AUTH_STORAGE_KEYS.CURRENT_USER_ID, userAccount.id);
          localStorage.setItem(AUTH_STORAGE_KEYS.CACHED_USER, JSON.stringify(userAccount));
          return { success: true, user: userAccount };
        }
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || 'Erro ao validar código no Supabase.' };
      }
    }

    return { success: false, error: 'Validação de código requer conexão com o servidor.' };
  },

  updatePassword: async (newPassword: string): Promise<{ success: boolean; user?: UserAccount; error?: string }> => {
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'A nova senha deve ter pelo menos 6 caracteres.' };
    }

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) {
          return { success: false, error: error.message };
        }

        if (data.user) {
          const cleanEmail = data.user.email?.toLowerCase() || '';
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          const userAccount: UserAccount = {
            id: data.user.id,
            name: profile?.name || data.user.user_metadata?.name || splitEmail(cleanEmail),
            email: cleanEmail,
            phone: profile?.phone || data.user.user_metadata?.phone,
            age: profile?.age || data.user.user_metadata?.age,
            gender: profile?.gender || data.user.user_metadata?.gender || 'male',
            selectedCategories: profile?.selected_categories || data.user.user_metadata?.selected_categories || ['steroid', 'peptide'],
            createdAt: data.user.created_at,
            therapeuticGoal: profile?.therapeutic_goal || data.user.user_metadata?.therapeutic_goal || 'male_trt',
            isAdmin: isUserAdmin(profile?.is_admin),
          };

          localStorage.setItem(AUTH_STORAGE_KEYS.CURRENT_USER_ID, userAccount.id);
          localStorage.setItem(AUTH_STORAGE_KEYS.CACHED_USER, JSON.stringify(userAccount));
          return { success: true, user: userAccount };
        }
      } catch (err: any) {
        return { success: false, error: err.message || 'Erro ao redefinir a senha no Supabase.' };
      }
    }

    return { success: false, error: 'Redefinição de senha requer conexão com o servidor.' };
  },
};

function splitEmail(email: string): string {
  return email.split('@')[0] || 'Usuário';
}
