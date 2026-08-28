'use client';

import React from 'react';
import { Music, Youtube, Trash2, ArrowUp, ArrowDown, Play, ListMusic, Plus } from 'lucide-react';
import { formatDuration } from '../lib/utils';

export default function PlaylistManager({
  tracks = [],
  currentTrackIndex = 0,
  isHost = false,
  isPlaying = false,
  onSelectTrack,
  onRemoveTrack,
  onReorderTracks,
  onOpenAddModal
}) {
  const moveTrack = (index, direction) => {
    if (!isHost) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= tracks.length) return;

    const newTracks = [...tracks];
    const [moved] = newTracks.splice(index, 1);
    newTracks.splice(targetIndex, 0, moved);

    let newCurrentIndex = currentTrackIndex;
    if (currentTrackIndex === index) {
      newCurrentIndex = targetIndex;
    } else if (currentTrackIndex === targetIndex) {
      newCurrentIndex = index;
    }

    if (onReorderTracks) {
      onReorderTracks(newTracks, newCurrentIndex);
    }
  };

  return (
    <div className="glass-panel" style={{
      padding: '20px',
      borderRadius: 'var(--radius-lg)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: '400px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ListMusic size={20} color="var(--primary-light)" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fff' }}>Party Playlist</h3>
          <span className="badge" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-muted)' }}>
            {tracks.length}
          </span>
        </div>

        {isHost && (
          <button
            onClick={onOpenAddModal}
            className="btn-primary"
            style={{ padding: '7px 14px', fontSize: '0.8rem' }}
          >
            <Plus size={14} /> Add Song
          </button>
        )}
      </div>

      {/* Playlist Items */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        paddingRight: '4px'
      }}>
        {tracks.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 16px',
            color: 'var(--text-muted)'
          }}>
            <Music size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p style={{ fontSize: '0.9rem' }}>The playlist is currently empty.</p>
            {isHost && (
              <button
                onClick={onOpenAddModal}
                className="btn-secondary"
                style={{ marginTop: '12px', padding: '8px 16px', fontSize: '0.85rem' }}
              >
                Upload MP3 or YouTube
              </button>
            )}
          </div>
        ) : (
          tracks.map((track, idx) => {
            const isCurrent = idx === currentTrackIndex;

            return (
              <div
                key={track.id || idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: isCurrent 
                    ? 'linear-gradient(90deg, rgba(139, 92, 246, 0.25) 0%, rgba(6, 182, 212, 0.1) 100%)' 
                    : 'rgba(255, 255, 255, 0.02)',
                  border: isCurrent ? '1px solid var(--border-glow)' : '1px solid transparent',
                  transition: 'all var(--transition-fast)'
                }}
              >
                {/* Track Number / Play Button */}
                <div style={{ width: '28px', textAlign: 'center', flexShrink: 0 }}>
                  {isCurrent ? (
                    <div className="equalizer" style={{ height: '14px', justifyContent: 'center' }}>
                      <div className="equalizer-bar" style={{ width: '2px' }} />
                      <div className="equalizer-bar" style={{ width: '2px' }} />
                      <div className="equalizer-bar" style={{ width: '2px' }} />
                    </div>
                  ) : isHost ? (
                    <button
                      onClick={() => onSelectTrack(idx)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Play this track"
                    >
                      <Play size={14} />
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                      {idx + 1}
                    </span>
                  )}
                </div>

                {/* Track Thumbnail & Info */}
                <div
                  onClick={() => isHost && onSelectTrack(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    flex: 1,
                    minWidth: 0,
                    cursor: isHost ? 'pointer' : 'default'
                  }}
                >
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '6px',
                    background: track.thumbnail_url 
                      ? `url(${track.thumbnail_url}) center/cover no-repeat` 
                      : 'rgba(255,255,255,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {!track.thumbnail_url && (
                      track.source_type === 'youtube' 
                        ? <Youtube size={16} color="#ef4444" /> 
                        : <Music size={16} color="var(--primary-light)" />
                    )}
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{
                      fontSize: '0.9rem',
                      fontWeight: isCurrent ? '700' : '500',
                      color: isCurrent ? '#fff' : 'var(--text-main)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {track.title}
                    </p>
                    <p style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-dim)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {track.artist || track.author || (track.source_type === 'youtube' ? 'YouTube' : 'MP3')}
                    </p>
                  </div>
                </div>

                {/* Host Reorder & Delete Actions */}
                {isHost && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      className="btn-icon"
                      style={{ width: '26px', height: '26px' }}
                      onClick={() => moveTrack(idx, -1)}
                      disabled={idx === 0}
                      title="Move Up"
                    >
                      <ArrowUp size={12} />
                    </button>

                    <button
                      className="btn-icon"
                      style={{ width: '26px', height: '26px' }}
                      onClick={() => moveTrack(idx, 1)}
                      disabled={idx === tracks.length - 1}
                      title="Move Down"
                    >
                      <ArrowDown size={12} />
                    </button>

                    <button
                      className="btn-icon"
                      style={{ width: '26px', height: '26px', color: '#f87171' }}
                      onClick={() => onRemoveTrack(idx)}
                      title="Remove from playlist"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
