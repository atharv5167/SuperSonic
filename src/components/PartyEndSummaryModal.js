'use client';

import React from 'react';
import { Award, Clock, Users, Music, ArrowRight, Sparkles } from 'lucide-react';
import { formatDuration } from '../lib/utils';
import Link from 'next/link';

export default function PartyEndSummaryModal({ summary, isOpen }) {
  if (!isOpen || !summary) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 110,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(12px)',
      padding: '16px'
    }}>
      <div className="glass-panel glass-panel-glow animate-fade-in" style={{
        width: '100%',
        maxWidth: '480px',
        padding: '32px',
        borderRadius: 'var(--radius-xl)',
        background: 'linear-gradient(180deg, rgba(20, 27, 54, 0.98) 0%, rgba(10, 14, 28, 1) 100%)',
        textAlign: 'center'
      }}>
        {/* Badge Icon */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 18px',
          boxShadow: '0 0 30px rgba(139, 92, 246, 0.6)'
        }}>
          <Sparkles size={32} color="#ffffff" />
        </div>

        <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#fff', marginBottom: '6px' }}>
          Party Concluded!
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
          Here is your lightweight session recap:
        </p>

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          marginBottom: '24px'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.04)',
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}>
            <Clock size={20} color="var(--primary-light)" style={{ margin: '0 auto 6px' }} />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Session Duration</p>
            <p style={{ fontSize: '1.2rem', fontWeight: '700', color: '#fff', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
              {formatDuration(summary.durationSeconds || 0)}
            </p>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.04)',
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}>
            <Users size={20} color="var(--accent-cyan)" style={{ margin: '0 auto 6px' }} />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Peak Jammers</p>
            <p style={{ fontSize: '1.2rem', fontWeight: '700', color: '#fff', marginTop: '2px' }}>
              {summary.peakParticipants || 1}
            </p>
          </div>
        </div>

        {/* Tracks Played Summary */}
        {summary.tracksPlayed && summary.tracksPlayed.length > 0 && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: 'var(--radius-md)',
            padding: '12px',
            marginBottom: '24px',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Music size={14} color="var(--accent-amber)" />
              <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                Tracks Played ({summary.tracksPlayed.length})
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '100px', overflowY: 'auto' }}>
              {summary.tracksPlayed.map((t, idx) => (
                <div key={idx} style={{ fontSize: '0.8rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  • {typeof t === 'string' ? t : t.title}
                </div>
              ))}
            </div>
          </div>
        )}

        <Link href="/dashboard" className="btn-primary" style={{ width: '100%' }}>
          Return to Dashboard <ArrowRight size={18} />
        </Link>
      </div>
    </div>
  );
}
