'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import Navbar from '../../../components/Navbar';
import TrackUploadModal from '../../../components/TrackUploadModal';
import { generateRoomCode } from '../../../lib/utils';
import { 
  Music, 
  Youtube, 
  Plus, 
  Trash2, 
  Sparkles, 
  ArrowRight, 
  Flame, 
  Radio,
  Layers,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { io } from 'socket.io-client';

const SOCKET_SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_URL ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001');

export default function CreateRoomPage() {
  const router = useRouter();
  const { user, profile, isLoading } = useAuth();

  const [roomName, setRoomName] = useState('Cyber Jam Session');
  const [tracks, setTracks] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && !user) router.replace('/auth');
  }, [user, isLoading, router]);

  if (isLoading || !user) return null;

  // Handle Adding Track from Modal
  const handleAddTrack = (track) => {
    setTracks(prev => [...prev, track]);
  };

  // Handle Remove Track
  const handleRemoveTrack = (index) => {
    setTracks(prev => prev.filter((_, idx) => idx !== index));
  };

  // Move Track Up/Down
  const handleMoveTrack = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= tracks.length) return;
    const updated = [...tracks];
    const [moved] = updated.splice(index, 1);
    updated.splice(target, 0, moved);
    setTracks(updated);
  };

  // Launch Party Room
  const handleLaunchParty = () => {
    if (!roomName.trim()) {
      setError('Please provide a party room name.');
      return;
    }

    if (tracks.length === 0) {
      setError('Please add at least one MP3 audio track or YouTube link.');
      return;
    }

    setIsCreating(true);
    const newRoomCode = generateRoomCode();
    const activeUserId = user?.id || `host_${Date.now()}`;
    const activeUserName = profile?.display_name || user?.display_name || 'Party Host';

    // Register room on real-time sync server
    try {
      const socket = io(SOCKET_SERVER_URL, { transports: ['websocket', 'polling'] });
      
      socket.emit('room:init', {
        roomId: newRoomCode,
        hostId: activeUserId,
        hostName: activeUserName,
        roomName: roomName.trim(),
        initialTracks: tracks
      }, (res) => {
        socket.disconnect();
        // Redirect to live room
        router.push(`/room/${newRoomCode}?host=true`);
      });

      // Fallback redirect if server doesn't ack immediately
      setTimeout(() => {
        router.push(`/room/${newRoomCode}?host=true`);
      }, 1000);
    } catch (err) {
      console.warn('Socket registration fallback:', err);
      router.push(`/room/${newRoomCode}?host=true`);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main className="container" style={{ flex: 1, padding: '40px 24px', maxWidth: '880px' }}>
        <div className="glass-panel glass-panel-glow animate-fade-in" style={{
          padding: '36px',
          borderRadius: 'var(--radius-xl)',
          background: 'linear-gradient(180deg, rgba(20, 27, 54, 0.9) 0%, rgba(10, 14, 28, 0.98) 100%)'
        }}>
          {/* Header */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px rgba(139, 92, 246, 0.5)'
              }}>
                <Flame size={24} color="#ffffff" />
              </div>
              <h1 style={{ fontSize: '2rem', fontWeight: '800', color: '#fff' }}>
                Create Synchronized Music Party
              </h1>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              Add your MP3 tracks or YouTube links to start a synchronized broadcast room for up to 2,000 listeners.
            </p>
          </div>

          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.9rem',
              marginBottom: '20px'
            }}>
              {error}
            </div>
          )}

          {/* Party Name Input */}
          <div style={{ marginBottom: '28px' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#fff', marginBottom: '8px' }}>
              Party Room Name
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Cyberpunk Synthwave Night"
              value={roomName}
              onChange={(e) => { setRoomName(e.target.value); setError(''); }}
            />
          </div>

          {/* Playlist Staging Section */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Music size={18} color="var(--primary-light)" />
                <h3 style={{ fontSize: '1.15rem', color: '#fff' }}>Party Playlist Queue</h3>
                <span className="badge badge-host">{tracks.length} Tracks</span>
              </div>

              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="btn-primary"
                style={{ padding: '8px 18px', fontSize: '0.85rem' }}
              >
                <Plus size={16} /> Add Track (MP3 / YouTube)
              </button>
            </div>

            {/* Track Queue Items */}
            {tracks.length === 0 ? (
              <div
                onClick={() => setIsAddModalOpen(true)}
                style={{
                  border: '2px dashed var(--border-glow)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '40px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: 'rgba(255, 255, 255, 0.02)',
                  transition: 'all var(--transition-normal)'
                }}
              >
                <div style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  background: 'rgba(139, 92, 246, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px'
                }}>
                  <Plus size={24} color="var(--primary-light)" />
                </div>
                <h4 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '4px' }}>Add Your First Song</h4>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                  Upload an MP3 audio file from your device or paste any YouTube video link.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {tracks.map((track, index) => (
                  <div
                    key={track.id || index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', fontSize: '0.9rem', width: '20px' }}>
                        {index + 1}
                      </span>

                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '8px',
                        background: track.thumbnail_url 
                          ? `url(${track.thumbnail_url}) center/cover no-repeat` 
                          : 'rgba(255,255,255,0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {!track.thumbnail_url && (
                          track.source_type === 'youtube' ? <Youtube size={18} color="#ef4444" /> : <Music size={18} color="var(--primary-light)" />
                        )}
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontWeight: '600', color: '#fff', fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {track.title}
                        </p>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {track.artist || track.author || 'Host Track'} • <span style={{ textTransform: 'uppercase' }}>{track.source_type}</span>
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        className="btn-icon"
                        style={{ width: '30px', height: '30px' }}
                        disabled={index === 0}
                        onClick={() => handleMoveTrack(index, -1)}
                      >
                        <ArrowUp size={14} />
                      </button>

                      <button
                        type="button"
                        className="btn-icon"
                        style={{ width: '30px', height: '30px' }}
                        disabled={index === tracks.length - 1}
                        onClick={() => handleMoveTrack(index, 1)}
                      >
                        <ArrowDown size={14} />
                      </button>

                      <button
                        type="button"
                        className="btn-icon"
                        style={{ width: '30px', height: '30px', color: '#f87171' }}
                        onClick={() => handleRemoveTrack(index)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Launch Button */}
          <button
            type="button"
            onClick={handleLaunchParty}
            disabled={isCreating || tracks.length === 0}
            className="btn-primary"
            style={{ width: '100%', padding: '16px', fontSize: '1.1rem' }}
          >
            <Radio size={20} /> Launch & Host Party Room <ArrowRight size={20} />
          </button>
        </div>
      </main>

      {/* Track Upload Modal */}
      <TrackUploadModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddTrack={handleAddTrack}
      />
    </div>
  );
}
