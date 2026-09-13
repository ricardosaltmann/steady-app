import { UserAccount, CompoundCategory } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';

const AUTH_STORAGE_KEYS = {
  USERS: 'steady_users_v1',
  CURRENT_USER_ID: 'steady_current_user_id_v1',
  CACHED_USER: 'steady_cached_user_v1',
};

// Default pre-seeded demo user so testers can log in with 1 click
const DEMO_USER: UserAccount = {
  id: 'user_demo',
  name: 'Usuário Teste / Atleta SteadySync',
  email: 'demo@steadysync.app',
  phone: '(11) 99999-8888',
  age: 34,
  gender: 'male',
  selectedCategories: ['steroid', 'peptide', 'fertility'],
  passwordHash: 'steady123',
  createdAt: new Date().toISOString(),
  therapeuticGoal: 'male_trt',
  isAdmin: true, // Demo user can also view admin features
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

    // 1. If Supabase is active, authenticate via Supabase Auth
    if (isSupabaseConfigured() && cleanEmail !== DEMO_USER.email) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) {
          return { success: false, error: error.message };
        }

        if (data.user) {
          // Fetch profile details
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
            selectedCategories: profile?.selected_categories || data.user.user_metadata?.selected_categories,
            createdAt: data.user.created_at,
            therapeuticGoal: profile?.therapeutic_goal || data.user.user_metadata?.therapeutic_goal || 'male_trt',
            isAdmin: Boolean(profile?.is_admin || cleanEmail.startsWith('admin@')),
          };

          localStorage.setItem(AUTH_STORAGE_KEYS.CURRENT_USER_ID, userAccount.id);
          localStorage.setItem(AUTH_STORAGE_KEYS.CACHED_USER, JSON.stringify(userAccount));
          return { success: true, user: userAccount };
        }
      } catch (err: any) {
        return { success: false, error: err.message || 'Erro ao conectar ao Supabase' };
      }
    }

    // 2. Local fallback
    const users = auth.getUsers();
    const user = users.find(u => u.email.toLowerCase() === cleanEmail || (u.id === DEMO_USER.id && cleanEmail === 'demo@steady.app'));

    if (!user) {
      return { success: false, error: 'E-mail não encontrado. Crie uma conta ou use a conta Demo.' };
    }

    if (user.passwordHash !== password) {
      return { success: false, error: 'Senha incorreta. Verifique os dados digitados.' };
    }

    localStorage.setItem(AUTH_STORAGE_KEYS.CURRENT_USER_ID, user.id);
    localStorage.setItem(AUTH_STORAGE_KEYS.CACHED_USER, JSON.stringify(user));
    return { success: true, user };
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
            // Attempt upsert with full profile fields
            const { error: profileErr } = await supabase.from('profiles').upsert({
              id: data.user.id,
              name: name.trim(),
              phone: phone?.trim() || null,
              age: age ? Number(age) : null,
              gender,
              therapeutic_goal: therapeuticGoal,
              updated_at: new Date().toISOString(),
            });

            if (profileErr) {
              // Fallback to basic columns if extended columns don't exist yet
              await supabase.from('profiles').upsert({
                id: data.user.id,
                name: name.trim(),
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
            isAdmin: cleanEmail.startsWith('admin@'),
          };

          localStorage.setItem(AUTH_STORAGE_KEYS.CURRENT_USER_ID, userAccount.id);
          localStorage.setItem(AUTH_STORAGE_KEYS.CACHED_USER, JSON.stringify(userAccount));
          return { success: true, user: userAccount };
        }
      } catch (err: any) {
        return { success: false, error: err.message || 'Erro ao criar conta no Supabase' };
      }
    }

    // 2. Local Fallback Signup
    const users = auth.getUsers();
    if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: 'Este e-mail já está cadastrado.' };
    }

    const newUser: UserAccount = {
      id: 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: name.trim(),
      email: cleanEmail,
      phone: phone?.trim() || undefined,
      age: age ? Number(age) : undefined,
      gender,
      selectedCategories,
      passwordHash: password,
      createdAt: new Date().toISOString(),
      therapeuticGoal,
      isAdmin: cleanEmail.startsWith('admin@'),
    };

    users.push(newUser);
    localStorage.setItem(AUTH_STORAGE_KEYS.USERS, JSON.stringify(users));
    localStorage.setItem(AUTH_STORAGE_KEYS.CURRENT_USER_ID, newUser.id);
    localStorage.setItem(AUTH_STORAGE_KEYS.CACHED_USER, JSON.stringify(newUser));

    return { success: true, user: newUser };
  },

  signInAsDemo: (): UserAccount => {
    const users = auth.getUsers();
    let demo = users.find(u => u.id === DEMO_USER.id);
    if (!demo) {
      demo = DEMO_USER;
      users.unshift(demo);
      localStorage.setItem(AUTH_STORAGE_KEYS.USERS, JSON.stringify(users));
    }
    localStorage.setItem(AUTH_STORAGE_KEYS.CURRENT_USER_ID, demo.id);
    localStorage.setItem(AUTH_STORAGE_KEYS.CACHED_USER, JSON.stringify(demo));
    return demo;
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
    if (index === -1) return null;

    users[index] = { ...users[index], ...updates };
    localStorage.setItem(AUTH_STORAGE_KEYS.USERS, JSON.stringify(users));
    localStorage.setItem(AUTH_STORAGE_KEYS.CACHED_USER, JSON.stringify(users[index]));
    return users[index];
  },
};

function splitEmail(email: string): string {
  return email.split('@')[0] || 'Usuário';
}
