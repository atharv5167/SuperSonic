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
 * Local party history cache. Authentication always comes from Supabase.
 */
export const localStore = {
  getPartyHistory: (userId) => {
    if (typeof window === 'undefined') return [];
    if (!userId) return [];
    const stored = localStorage.getItem(`supersonic_party_history_${userId}`);
    if (stored) {
      try { return JSON.parse(stored); } catch (e) { return []; }
    }
    return [];
  },
  savePartyHistory: (party) => {
    if (typeof window === 'undefined') return;
    if (!party?.userId) return;
    const storageKey = `supersonic_party_history_${party.userId}`;
    const current = localStore.getPartyHistory(party.userId);
    const updated = [party, ...current.filter(p => p.roomId !== party.roomId)].slice(0, 30);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  }
};
