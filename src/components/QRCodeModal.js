'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { QrCode, Copy, Check, X, Share2, Sparkles } from 'lucide-react';

export default function QRCodeModal({ isOpen, onClose, roomId, roomName }) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const joinUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/room/${roomId}` 
    : `http://localhost:3000/room/${roomId}`;

  useEffect(() => {
    if (isOpen && roomId) {
      QRCode.toDataURL(joinUrl, {
        width: 260,
        margin: 2,
        color: {
          dark: '#070913',
          light: '#ffffff'
        }
      })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('QR code generation failed:', err));
    }
  }, [isOpen, roomId, joinUrl]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      padding: '16px'
    }}>
      <div className="glass-panel glass-panel-glow animate-fade-in" style={{
        width: '100%',
        maxWidth: '420px',
        padding: '28px',
        borderRadius: 'var(--radius-xl)',
        background: 'linear-gradient(180deg, rgba(20, 27, 54, 0.95) 0%, rgba(10, 14, 28, 0.98) 100%)',
        textAlign: 'center'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Share2 size={20} color="var(--primary-light)" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#fff' }}>Invite Friends</h3>
          </div>

          <button
            onClick={onClose}
            className="btn-icon"
            style={{ width: '32px', height: '32px' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* QR Code Canvas */}
        <div style={{
          background: '#fff',
          padding: '16px',
          borderRadius: 'var(--radius-lg)',
          display: 'inline-block',
          marginBottom: '20px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
        }}>
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="Room QR Code" style={{ width: '220px', height: '220px', display: 'block' }} />
          ) : (
            <div style={{ width: '220px', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000' }}>
              Generating QR...
            </div>
          )}
        </div>

        {/* Room Code Callout */}
        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Party Room Code</p>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '1.8rem',
            fontWeight: '900',
            letterSpacing: '0.1em',
            color: 'var(--accent-cyan)',
            background: 'rgba(6, 182, 212, 0.1)',
            padding: '6px 16px',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--border-cyan)',
            display: 'inline-block'
          }}>
            {roomId}
          </div>
        </div>

        {/* Copy Link Input */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <input
            type="text"
            readOnly
            value={joinUrl}
            className="input-field"
            style={{ fontSize: '0.85rem', padding: '10px 14px' }}
          />
          <button
            onClick={handleCopy}
            className="btn-primary"
            style={{ padding: '10px 16px', borderRadius: 'var(--radius-md)' }}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>

        <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
          Scan from mobile or send the link to enjoy instant synchronized playback.
        </p>
      </div>
    </div>
  );
}
