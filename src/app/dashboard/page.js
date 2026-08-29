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
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [historyTab, setHistoryTab] = useState('hosted');

  useEffect(() => {
    if (!isLoading && !user) router.replace('/auth');
    const history = localStore.getPartyHistory();
    setPartyHistory(history);
  }, [user, isLoading, router]);

  if (isLoading || !user) return null;

  const visibleHistory = partyHistory.filter((item) =>
    historyTab === 'hosted' ? item.role !== 'participated' : item.role === 'participated'
  );

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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
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
              <h3 style={{ fontSize: '1.25rem', color: '#fff' }}>History</h3>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button type="button" className={historyTab === 'hosted' ? 'btn-primary' : 'btn-secondary'} onClick={() => setHistoryTab('hosted')} style={{ padding: '7px 12px', fontSize: '0.8rem' }}>Hosted</button>
              <button type="button" className={historyTab === 'participated' ? 'btn-primary' : 'btn-secondary'} onClick={() => setHistoryTab('participated')} style={{ padding: '7px 12px', fontSize: '0.8rem' }}>Participated</button>
            </div>
          </div>

          {visibleHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
              <Sparkles size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <p style={{ fontSize: '1rem', color: '#fff', fontWeight: '600', marginBottom: '4px' }}>No Previous Parties Yet</p>
              <p style={{ fontSize: '0.85rem' }}>Create a room and host your first synchronized party session!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {visibleHistory.map((item, index) => (
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
                      {historyTab === 'participated' && item.hostName ? `Host: ${item.hostName} • ` : ''}{new Date(item.endedAt || item.startedAt).toLocaleDateString()}
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
                    <button type="button" className="btn-secondary" onClick={() => setSelectedHistory(item)} style={{ padding: '7px 12px', fontSize: '0.8rem' }}>
                      See More <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedHistory && (
          <div className="glass-panel" style={{ marginTop: '20px', padding: '28px', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ color: '#fff', fontSize: '1.25rem' }}>{selectedHistory.name || 'Room Details'}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{new Date(selectedHistory.endedAt || selectedHistory.startedAt).toLocaleString()}</p>
              </div>
              <button type="button" className="btn-secondary" onClick={() => setSelectedHistory(null)} style={{ padding: '6px 12px' }}>Close</button>
            </div>
            <h4 style={{ color: '#fff', marginBottom: '10px' }}>Music Played</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(selectedHistory.tracksPlayed || []).map((track, index) => (
                <div key={track.id || index} style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>
                  {index + 1}. {track.title || track} {track.source_type ? `— ${track.source_type.toUpperCase()}` : ''}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
