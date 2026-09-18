import { useState, useEffect, useCallback } from 'react';
import { UserAccount } from '../types';
import { auth } from '../lib/auth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { supabaseSync } from '../lib/supabaseSync';
import { syncEngine } from '../lib/syncEngine';
import { App as CapApp } from '@capacitor/app';

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // Handle successful login cleanly without triggering redundant data loads
  const handleLoginSuccess = useCallback((user: UserAccount) => {
    setCurrentUser(user);
    // Note: Data loading and sync initialization are handled by the active user effect,
    // eliminating duplicate loadAllData calls (Fix for Bug #29).
  }, []);

  const handleLogout = useCallback(() => {
    syncEngine.stop();
    auth.signOut();
    setCurrentUser(null);
  }, []);

  // Initial session recovery & Supabase onAuthStateChange listener
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        if (isSupabaseConfigured()) {
          const { data } = await supabase.auth.getSession();
          if (data.session?.user && isMounted) {
            const isAdmin = await supabaseSync.checkIsAdmin(data.session.user.id);
            const user: UserAccount = {
              id: data.session.user.id,
              name: data.session.user.user_metadata?.name || data.session.user.email?.split('@')[0] || 'Usuário',
              email: data.session.user.email || '',
              gender: data.session.user.user_metadata?.gender || 'male',
              therapeuticGoal: data.session.user.user_metadata?.therapeutic_goal || 'male_trt',
              createdAt: data.session.user.created_at,
              isAdmin,
            };
            handleLoginSuccess(user);
            setIsLoadingAuth(false);
            return;
          }
        }

        // Fallback to local session (e.g. demo mode)
        const localUser = auth.getCurrentUser();
        if (localUser && isMounted) {
          handleLoginSuccess(localUser);
        }
      } catch (err) {
        console.error('[useAuth] Erro ao recuperar sessão:', err);
      } finally {
        if (isMounted) setIsLoadingAuth(false);
      }
    };

    initAuth();

    // Supabase auth state change listener
    let subscription: any = null;
    if (isSupabaseConfigured()) {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!isMounted) return;
        if (event === 'SIGNED_IN' && session?.user) {
          const isAdmin = await supabaseSync.checkIsAdmin(session.user.id);
          const user: UserAccount = {
            id: session.user.id,
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuário',
            email: session.user.email || '',
            gender: session.user.user_metadata?.gender || 'male',
            therapeuticGoal: session.user.user_metadata?.therapeutic_goal || 'male_trt',
            createdAt: session.user.created_at,
            isAdmin,
          };
          handleLoginSuccess(user);
        } else if (event === 'SIGNED_OUT') {
          handleLogout();
        }
      });
      subscription = authListener?.subscription;
    }

    // Capacitor Deep Link listener for OAuth callbacks (steadysync://login-callback)
    let deepLinkHandler: any = null;
    const setupDeepLink = async () => {
      try {
        deepLinkHandler = await CapApp.addListener('appUrlOpen', async (data: { url: string }) => {
          if (!isMounted) return;

          // 1. URL fragment with access token
          if (data.url.includes('access_token=')) {
            const hashIndex = data.url.indexOf('#');
            if (hashIndex !== -1) {
              const hash = data.url.substring(hashIndex + 1);
              const params = new URLSearchParams(hash);
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
          }

          // 2. PKCE code flow
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
        });
      } catch {
        // Fallback for non-Capacitor environment
      }
    };

    setupDeepLink();

    return () => {
      isMounted = false;
      if (subscription) subscription.unsubscribe();
      if (deepLinkHandler && typeof deepLinkHandler.remove === 'function') {
        deepLinkHandler.remove();
      }
    };
  }, [handleLoginSuccess, handleLogout]);

  return {
    currentUser,
    isLoadingAuth,
    setCurrentUser,
    handleLoginSuccess,
    handleLogout,
  };
}
