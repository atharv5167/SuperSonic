'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { Radio, PlusCircle, LogIn, LogOut, User, Music, Compass } from 'lucide-react';

export default function Navbar({ currentRoomCode = null, isHost = false, onLeaveRoom = null }) {
  const { user, profile, signOut } = useAuth();

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      width: '100%',
      background: 'rgba(7, 9, 19, 0.85)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-subtle)'
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '74px'
      }}>
        {/* Brand Logo */}
        <Link href="/" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          textDecoration: 'none',
          color: '#fff'
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(139, 92, 246, 0.5)'
          }}>
            <Radio size={22} color="#ffffff" />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.35rem',
                fontWeight: '900',
                letterSpacing: '-0.02em',
                background: 'linear-gradient(135deg, #ffffff 0%, #c4b5fd 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                SuperSonic
              </span>
              <span style={{
                fontSize: '0.65rem',
                fontWeight: '700',
                background: 'rgba(139, 92, 246, 0.25)',
                color: 'var(--primary-light)',
                padding: '2px 6px',
                borderRadius: '6px',
                border: '1px solid rgba(139, 92, 246, 0.4)'
              }}>
                SYNC &lt;100ms
              </span>
            </div>
          </div>
        </Link>

        {/* Current Room Active Badge (if in room) */}
        {currentRoomCode && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'rgba(20, 27, 54, 0.8)',
            padding: '6px 16px',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border-glow)'
          }}>
            <span className="badge badge-live" style={{ fontSize: '0.7rem' }}>LIVE</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', color: '#fff', fontSize: '0.9rem' }}>
              {currentRoomCode}
            </span>
            {isHost && (
              <span className="badge badge-host" style={{ fontSize: '0.65rem' }}>HOST</span>
            )}
          </div>
        )}

        {currentRoomCode && !isHost && onLeaveRoom && (
          <button onClick={onLeaveRoom} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.8rem' }}>
            Leave Room
          </button>
        )}

        {/* Navigation & User Menu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Link href="/room/create" className="btn-primary" style={{ padding: '9px 18px', fontSize: '0.9rem' }}>
            <PlusCircle size={17} /> Create Party
          </Link>

          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Link href="/dashboard" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                textDecoration: 'none',
                color: 'var(--text-main)',
                padding: '6px 12px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border-subtle)',
                transition: 'all var(--transition-fast)'
              }}>
                <img
                  src={profile?.avatar_url || user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`}
                  alt="avatar"
                  style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#1e293b' }}
                />
                <span style={{ fontSize: '0.85rem', fontWeight: '600', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {profile?.display_name || user.display_name || user.email?.split('@')[0] || 'Jammer'}
                </span>
              </Link>

              <button
                className="btn-icon"
                onClick={signOut}
                title="Sign Out"
                style={{ width: '38px', height: '38px' }}
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <Link href="/auth" className="btn-secondary" style={{ padding: '9px 18px', fontSize: '0.9rem' }}>
              <LogIn size={16} /> Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
