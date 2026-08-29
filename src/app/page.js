'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';
import { 
  Radio, 
  Sparkles, 
  Music, 
  Youtube, 
  QrCode, 
  ShieldCheck, 
  Users, 
  ArrowRight, 
  Play, 
  Zap, 
  Layers,
  Flame
} from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    const cleanCode = joinCode.trim().toUpperCase();
    if (!cleanCode) {
      setError('Please enter a party room code');
      return;
    }
    router.push(`/room/${cleanCode}`);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main style={{ flex: 1 }}>
        {/* HERO SECTION */}
        <section style={{
          position: 'relative',
          padding: '90px 0 70px',
          textAlign: 'center',
          overflow: 'hidden'
        }}>
          <div className="container" style={{ position: 'relative', zIndex: 2 }}>
            {/* Top Pill */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 18px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(139, 92, 246, 0.15)',
              border: '1px solid rgba(139, 92, 246, 0.35)',
              marginBottom: '24px'
            }}>
              <Zap size={14} color="#a78bfa" />
              <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--primary-light)' }}>
                Sub-100ms Synchronized Music Experience
              </span>
            </div>

            {/* Main Headline */}
            <h1 style={{
              fontSize: 'clamp(2.5rem, 5.5vw, 4.5rem)',
              lineHeight: 1.1,
              fontWeight: '900',
              marginBottom: '22px',
              maxWidth: '960px',
              margin: '0 auto 22px'
            }}>
              Jam Together In <br />
              <span className="gradient-text-purple">Perfect Synchrony</span> Anywhere.
            </h1>

            <p style={{
              fontSize: 'clamp(1.05rem, 2vw, 1.25rem)',
              color: 'var(--text-muted)',
              maxWidth: '680px',
              margin: '0 auto 36px',
              lineHeight: 1.6
            }}>
              Create private party rooms, drop your favorite MP3 tracks or YouTube links, and experience real-time synchronized playback with friends across any device.
            </p>

            {/* Hero CTA & Quick Join Bar */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '20px',
              maxWidth: '540px',
              margin: '0 auto 48px'
            }}>
              <div style={{ display: 'flex', gap: '14px', width: '100%', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href="/room/create" className="btn-primary" style={{ padding: '16px 36px', fontSize: '1.05rem' }}>
                  <Flame size={20} /> Host a Music Party
                </Link>

                <Link href="/auth" className="btn-secondary" style={{ padding: '16px 28px', fontSize: '1.05rem' }}>
                  Sign In / Create Account
                </Link>
              </div>

              {/* Instant Room Join Input */}
              <div className="glass-panel" style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 'var(--radius-full)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                border: '1px solid var(--border-cyan)',
                boxShadow: 'var(--shadow-glow-cyan)'
              }}>
                <Radio size={18} color="var(--accent-cyan)" style={{ marginLeft: '6px' }} />
                <input
                  type="text"
                  placeholder="Enter 6-char Room Code (e.g. JAM-892)"
                  value={joinCode}
                  onChange={(e) => { setJoinCode(e.target.value); setError(''); }}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#fff',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '1rem',
                    textTransform: 'uppercase'
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleJoinSubmit(e); }}
                />
                <button
                  onClick={handleJoinSubmit}
                  className="btn-cyan"
                  style={{ padding: '10px 22px', fontSize: '0.9rem' }}
                >
                  Join Party <ArrowRight size={16} />
                </button>
              </div>

              {error && (
                <span style={{ color: '#f87171', fontSize: '0.85rem' }}>{error}</span>
              )}
            </div>

            {/* Interactive Futuristic Visual Card */}
            <div className="glass-panel glass-panel-glow" style={{
              maxWidth: '820px',
              margin: '0 auto',
              padding: '28px',
              borderRadius: 'var(--radius-xl)',
              background: 'linear-gradient(180deg, rgba(20, 27, 54, 0.8) 0%, rgba(10, 14, 28, 0.95) 100%)',
              textAlign: 'left'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444' }} />
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f59e0b' }} />
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981' }} />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginLeft: '8px' }}>Live Room Preview • JAM-774</span>
                </div>

                <span className="badge badge-sync">
                  <Sparkles size={12} /> Sync Drift: 14ms
                </span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '16px',
                alignItems: 'center'
              }}>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)'
                }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>NOW BROADCASTING</p>
                  <h4 style={{ fontSize: '1.1rem', color: '#fff', margin: '4px 0' }}>Midnight City - M83</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--primary-light)' }}>Host: SynthMaster</p>
                </div>

                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CONNECTED JAMMERS</p>
                    <h4 style={{ fontSize: '1.2rem', color: 'var(--accent-cyan)', margin: '4px 0' }}>42 Active Listeners</h4>
                  </div>
                  <Users size={28} color="var(--accent-cyan)" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES GRID SECTION */}
        <section style={{ padding: '70px 0', borderTop: '1px solid var(--border-subtle)' }}>
          <div className="container">
            <div style={{ textAlign: 'center', marginBottom: '50px' }}>
              <h2 style={{ fontSize: '2.4rem', fontWeight: '800', marginBottom: '12px' }}>
                Engineered for <span className="gradient-text-cyan">Zero-Delay Jamming</span>
              </h2>
              <p style={{ color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto', fontSize: '1.05rem' }}>
                Every feature is purpose-built to give hosts full control and participants an effortless synchronized session.
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '24px'
            }}>
              {/* Feature 1 */}
              <div className="glass-panel" style={{ padding: '30px', borderRadius: 'var(--radius-lg)' }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '14px',
                  background: 'rgba(139, 92, 246, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px'
                }}>
                  <Zap size={26} color="var(--primary-light)" />
                </div>
                <h3 style={{ fontSize: '1.3rem', color: '#fff', marginBottom: '10px' }}>Sub-100ms NTP Precision</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                  Continuous clock-offset calculations and adaptive audio rate steering ensure all listeners hear the exact same beat without echo.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="glass-panel" style={{ padding: '30px', borderRadius: 'var(--radius-lg)' }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '14px',
                  background: 'rgba(6, 182, 212, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px'
                }}>
                  <Music size={26} color="var(--accent-cyan)" />
                </div>
                <h3 style={{ fontSize: '1.3rem', color: '#fff', marginBottom: '10px' }}>MP3 & YouTube Mixed Playlists</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                  Drag and drop local MP3 files or paste YouTube URLs. SuperSonic unifies them into a single continuous broadcast queue.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="glass-panel" style={{ padding: '30px', borderRadius: 'var(--radius-lg)' }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '14px',
                  background: 'rgba(245, 158, 11, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px'
                }}>
                  <QrCode size={26} color="var(--accent-amber)" />
                </div>
                <h3 style={{ fontSize: '1.3rem', color: '#fff', marginBottom: '10px' }}>Instant QR Code Mobile Join</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                  Generate an instant QR code on screen. Friends scan with their mobile cameras to jump into the room in one second.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="glass-panel" style={{ padding: '30px', borderRadius: 'var(--radius-lg)' }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '14px',
                  background: 'rgba(236, 72, 153, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px'
                }}>
                  <ShieldCheck size={26} color="var(--accent-pink)" />
                </div>
                <h3 style={{ fontSize: '1.3rem', color: '#fff', marginBottom: '10px' }}>Host Authority & Moderation</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                  Only the host controls song choices and track progression. Full moderation controls to warn, mute, or kick disruptive attendees.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '30px 0',
        background: 'rgba(7, 9, 19, 0.95)',
        textAlign: 'center'
      }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Radio size={18} color="var(--primary-light)" />
            <span style={{ fontWeight: '700', color: '#fff' }}>SuperSonic Platform</span>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
            High-Performance Music Synchronization Engine • Next.js & Supabase
          </p>

          <Link href="/PROJECT_IMPLEMENTATION_GUIDE.md" style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', textDecoration: 'none' }}>
            Architecture Guide ↗
          </Link>
        </div>
      </footer>
    </div>
  );
}
