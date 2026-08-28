'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured, localStore } from '../lib/supabase/client';
import { getAvatarUrl } from '../lib/utils';

const AuthContext = createContext({
  user: null,
  profile: null,
  isLoading: true,
  isConfigured: false,
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  signInAsGuest: () => {},
  signOut: async () => {},
  updateProfile: async () => {}
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (isSupabaseConfigured() && supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            setUser(session.user);
            await fetchSupabaseProfile(session.user.id);
          } else {
            checkLocalGuestUser();
          }

          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
              setUser(session.user);
              await fetchSupabaseProfile(session.user.id);
            } else {
              setUser(null);
              setProfile(null);
              checkLocalGuestUser();
            }
          });

          return () => subscription.unsubscribe();
        } else {
          checkLocalGuestUser();
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        checkLocalGuestUser();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const checkLocalGuestUser = () => {
    const localUser = localStore.getUser();
    if (localUser) {
      setUser(localUser);
      setProfile(localUser);
    }
  };

  const fetchSupabaseProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) {
        setProfile(data);
      } else {
        const fallbackProfile = {
          id: userId,
          username: `user_${userId.substring(0, 6)}`,
          display_name: 'SuperSonic Jammer',
          avatar_url: getAvatarUrl(userId)
        };
        setProfile(fallbackProfile);
      }
    } catch (err) {
      console.warn('Profile fetch failed:', err);
    }
  };

  const signInWithEmail = async (email, password) => {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase is not configured with live API keys yet. Please use Guest Mode or provide Supabase keys in .env.local.');
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signUpWithEmail = async (email, password, username, displayName) => {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase is not configured with live API keys yet. Please use Guest Mode or provide Supabase keys in .env.local.');
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username || email.split('@')[0],
          display_name: displayName || username || 'SuperSonic Jammer'
        }
      }
    });
    if (error) throw error;
    return data;
  };

  const signInAsGuest = (customName) => {
    const randomId = 'guest_' + Math.random().toString(36).substring(2, 9);
    const guestName = customName?.trim() || `Jammer #${Math.floor(1000 + Math.random() * 9000)}`;
    const guestUser = {
      id: randomId,
      username: guestName.toLowerCase().replace(/\s+/g, '_'),
      display_name: guestName,
      avatar_url: getAvatarUrl(randomId),
      isGuest: true
    };

    localStore.setUser(guestUser);
    setUser(guestUser);
    setProfile(guestUser);
    return guestUser;
  };

  const signOut = async () => {
    if (isSupabaseConfigured() && supabase) {
      await supabase.auth.signOut();
    }
    localStore.clearUser();
    setUser(null);
    setProfile(null);
  };

  const updateProfile = async (updates) => {
    if (isSupabaseConfigured() && supabase && user && !user.isGuest) {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);
      if (error) throw error;
      setProfile(prev => ({ ...prev, ...updates }));
    } else if (user) {
      const updated = { ...user, ...updates };
      localStore.setUser(updated);
      setUser(updated);
      setProfile(updated);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      isLoading,
      isConfigured: isSupabaseConfigured(),
      signInWithEmail,
      signUpWithEmail,
      signInAsGuest,
      signOut,
      updateProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
