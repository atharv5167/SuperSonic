import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const isConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('placeholder') && 
  !supabaseAnonKey.includes('placeholder')
);

// Create real Supabase client if keys are present
export const supabase = isConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseConfigured = () => isConfigured;

/**
 * Fallback Local Profile / Room Store (Active when Supabase keys are not yet configured)
 */
export const localStore = {
  getUser: () => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem('supersonic_guest_user');
    if (stored) {
      try { return JSON.parse(stored); } catch (e) { return null; }
    }
    return null;
  },
  setUser: (user) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('supersonic_guest_user', JSON.stringify(user));
  },
  clearUser: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('supersonic_guest_user');
  },
  getPartyHistory: () => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('supersonic_party_history');
    if (stored) {
      try { return JSON.parse(stored); } catch (e) { return []; }
    }
    return [];
  },
  savePartyHistory: (party) => {
    if (typeof window === 'undefined') return;
    const current = localStore.getPartyHistory();
    const updated = [party, ...current.filter(p => p.roomId !== party.roomId)].slice(0, 30);
    localStorage.setItem('supersonic_party_history', JSON.stringify(updated));
  }
};
