'use client';

import React from 'react';
import { Users, Crown, ShieldAlert, VolumeX, UserX, UserCheck } from 'lucide-react';

export default function ParticipantList({
  participants = [],
  currentUserId = null,
  isHost = false,
  onWarnUser,
  onMuteUser,
  onKickUser
}) {
  return (
    <div className="glass-panel" style={{
      padding: '20px',
      borderRadius: 'var(--radius-lg)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={18} color="var(--accent-emerald)" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#fff' }}>Party Jammers</h3>
        </div>
        <span className="badge badge-sync">
          {participants.length} Online
        </span>
      </div>

      {/* List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {participants.map((p) => {
          const isMe = p.userId === currentUserId;

          return (
            <div
              key={p.socketId || p.userId}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                background: isMe ? 'rgba(139, 92, 246, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                border: isMe ? '1px solid var(--border-glow)' : '1px solid transparent'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <img
                  src={p.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.userId}`}
                  alt="avatar"
                  style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#1e293b' }}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      color: isMe ? 'var(--primary-light)' : '#fff',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {p.username} {isMe && '(You)'}
                    </span>
                  </div>

                  {p.isHost && (
                    <span className="badge badge-host" style={{ fontSize: '0.6rem', padding: '1px 6px', marginTop: '2px' }}>
                      <Crown size={9} /> Room Host
                    </span>
                  )}
                </div>
              </div>

              {/* Host Moderation Controls */}
              {isHost && !p.isHost && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    className="btn-icon"
                    style={{ width: '28px', height: '28px', color: 'var(--accent-amber)' }}
                    onClick={() => onWarnUser(p.userId, 'Host issued a room conduct warning.')}
                    title="Warn User"
                  >
                    <ShieldAlert size={13} />
                  </button>

                  <button
                    className="btn-icon"
                    style={{ width: '28px', height: '28px', color: '#f87171' }}
                    onClick={() => onMuteUser(p.userId)}
                    title="Toggle Mute"
                  >
                    <VolumeX size={13} />
                  </button>

                  <button
                    className="btn-icon"
                    style={{ width: '28px', height: '28px', color: '#ef4444' }}
                    onClick={() => onKickUser(p.userId)}
                    title="Kick from Party"
                  >
                    <UserX size={13} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
