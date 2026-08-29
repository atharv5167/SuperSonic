'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { localStore } from '../../lib/supabase/client';
import Navbar from '../../components/Navbar';
import { 
  PlusCircle, 
  Radio, 
  Clock, 
  Users, 
  Music, 
  Sparkles, 
  ArrowRight, 
  History, 
  Play,
  Share2
} from 'lucide-react';
import { formatDuration } from '../../lib/utils';

export default function DashboardPage() {
  const router = useRouter();
  const { user, profile, isLoading } = useAuth();
  const [partyHistory, setPartyHistory] = useState([]);
  const [quickCode, setQuickCode] = useState('');

  useEffect(() => {
    if (!isLoading && !user) router.replace('/auth');
    const history = localStore.getPartyHistory();
    setPartyHistory(history);
  }, [user, isLoading, router]);

  if (isLoading || !user) return null;

  const handleJoin = (e) => {
    e.preventDefault();
    if (quickCode.trim()) {
      router.push(`/room/${quickCode.trim().toUpperCase()}`);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main className="container" style={{ flex: 1, padding: '40px 24px' }}>
        {/* Welcome Header */}
        <div className="glass-panel glass-panel-glow" style={{
          padding: '32px',
          borderRadius: 'var(--radius-xl)',
          background: 'linear-gradient(135deg, rgba(28, 38, 75, 0.8) 0%, rgba(13, 18, 36, 0.95) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '24px',
          marginBottom: '36px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <img
              src={profile?.avatar_url || user?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=user`}
              alt="avatar"
              style={{
                width: '74px',
                height: '74px',
                borderRadius: '20px',
                background: '#1e293b',
                boxShadow: '0 8px 24px rgba(139, 92, 246, 0.4)',
                border: '2px solid var(--border-glow)'
              }}
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ fontSize: '1.8rem', color: '#fff' }}>
                  {profile?.display_name || user?.display_name || 'Jammer'}
                </h1>
                <span className="badge badge-sync">Authenticated Account</span>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '4px' }}>
                Ready to host or join a synchronized music party?
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <Link href="/room/create" className="btn-primary" style={{ padding: '14px 28px' }}>
              <PlusCircle size={18} /> Create New Party
            </Link>
          </div>
        </div>

        {/* Action Grid: Quick Join & Quick Info */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px',
          marginBottom: '40px'
        }}>
          {/* Quick Join Room Card */}
          <div className="glass-panel" style={{ padding: '28px', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Radio size={22} color="var(--accent-cyan)" />
              <h3 style={{ fontSize: '1.2rem', color: '#fff' }}>Join an Active Room</h3>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '18px' }}>
              Have a 6-character room code from a host? Enter it below to jump directly into the live jam.
            </p>

            <form onSubmit={handleJoin} style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. JAM-892"
                value={quickCode}
                onChange={(e) => setQuickCode(e.target.value)}
                style={{ textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}
              />
              <button type="submit" className="btn-cyan" style={{ whiteSpace: 'nowrap' }}>
                Join <ArrowRight size={16} />
              </button>
            </form>
          </div>

          {/* Quick Create Highlight Card */}
          <div className="glass-panel" style={{ padding: '28px', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Music size={22} color="var(--primary-light)" />
              <h3 style={{ fontSize: '1.2rem', color: '#fff' }}>Host Your Own Room</h3>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '18px' }}>
              Upload local MP3 tracks or paste YouTube links. Get an instant QR code to share with up to 2,000 friends.
            </p>

            <Link href="/room/create" className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
              Launch Party Wizard <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {/* Lightweight Party History Section */}
        <div className="glass-panel" style={{ padding: '28px', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <History size={20} color="var(--accent-amber)" />
              <h3 style={{ fontSize: '1.25rem', color: '#fff' }}>Party History & Lightweight Summaries</h3>
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
              Completed Sessions ({partyHistory.length})
            </span>
          </div>

          {partyHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
              <Sparkles size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <p style={{ fontSize: '1rem', color: '#fff', fontWeight: '600', marginBottom: '4px' }}>No Previous Parties Yet</p>
              <p style={{ fontSize: '0.85rem' }}>Create a room and host your first synchronized party session!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {partyHistory.map((item, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '16px',
                    padding: '16px 20px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  <div>
                    <h4 style={{ fontSize: '1.05rem', color: '#fff', marginBottom: '4px' }}>
                      {item.name || `Party Room ${item.roomId}`}
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                      Room Code: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>{item.roomId}</span> • {new Date(item.endedAt || item.startedAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <Clock size={16} color="var(--primary-light)" />
                      <span>{formatDuration(item.durationSeconds || 0)}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <Users size={16} color="var(--accent-cyan)" />
                      <span>{item.peakParticipants || 1} Jammers</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <Music size={16} color="var(--accent-amber)" />
                      <span>{item.tracksPlayed?.length || 0} Songs</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
