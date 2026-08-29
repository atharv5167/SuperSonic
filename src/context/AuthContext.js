'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import { getAvatarUrl } from '../lib/utils';

const AuthContext = createContext({
  user: null,
  profile: null,
  isLoading: true,
  isConfigured: false,
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
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
          }

          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
              setUser(session.user);
              await fetchSupabaseProfile(session.user.id);
            } else {
              setUser(null);
              setProfile(null);
            }
          });

          return () => subscription.unsubscribe();
        } else {
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

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
      throw new Error('Supabase is not configured. Please configure Supabase before signing in.');
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signUpWithEmail = async (email, password, username, displayName) => {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase is not configured. Please configure Supabase before creating an account.');
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

  const signOut = async () => {
    if (isSupabaseConfigured() && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
  };

  const updateProfile = async (updates) => {
    if (isSupabaseConfigured() && supabase && user) {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);
      if (error) throw error;
      setProfile(prev => ({ ...prev, ...updates }));
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
      signOut,
      updateProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
