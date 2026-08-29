'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import { LogIn, UserPlus, AlertCircle } from 'lucide-react';

export default function AuthPage() {
  const router = useRouter();
  const { signInWithEmail, signUpWithEmail } = useAuth();
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationMessage, setVerificationMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      if (isSignUp) {
        if (!/^[a-z0-9_]+$/.test(username)) {
          setError('Username can only contain lowercase letters, numbers, and _.');
          return;
        }
        const result = await signUpWithEmail(email, password, username, displayName);
        if (!result?.session) {
          setVerificationMessage(`Account created. Please verify your email address. A verification link has been sent to ${email}. Open it and click the link before signing in.`);
          setIsSignUp(false);
          return;
        }
        setSuccessMessage('Account created successfully. You are now signed in.');
      } else {
        await signInWithEmail(email, password);
      }
      router.push('/dashboard');
    } catch (err) {
      const message = err.message || '';
      setError(/username|duplicate|unique/i.test(message)
        ? 'Username is already taken. Please choose another username.'
        : /already registered|already exists|user already/i.test(message)
          ? 'This email is already registered. Please sign in instead.'
          : (message || 'Authentication failed. Please check your credentials.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 16px'
      }}>
        <div className="glass-panel glass-panel-glow animate-fade-in" style={{
          width: '100%',
          maxWidth: '460px',
          padding: '36px',
          borderRadius: 'var(--radius-xl)',
          background: 'linear-gradient(180deg, rgba(20, 27, 54, 0.9) 0%, rgba(10, 14, 28, 0.98) 100%)'
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 0 25px rgba(139, 92, 246, 0.5)'
            }}>
              {isSignUp ? <UserPlus size={26} color="#fff" /> : <LogIn size={26} color="#fff" />}
            </div>

            <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#fff', marginBottom: '6px' }}>
              {isSignUp ? 'Create SuperSonic Account' : 'Welcome Back'}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {isSignUp ? 'Join the synchronized music revolution' : 'Sign in to manage and host party rooms'}
            </p>
          </div>

          {/* Tab Switcher */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.04)',
            padding: '4px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '20px'
          }}>
            <button
              type="button"
              onClick={() => { setIsSignUp(false); setError(''); }}
              style={{
                padding: '10px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: !isSignUp ? 'var(--primary)' : 'transparent',
                color: '#fff',
                fontWeight: '600',
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsSignUp(true); setError(''); }}
              style={{
                padding: '10px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: isSignUp ? 'var(--primary)' : 'transparent',
                color: '#fff',
                fontWeight: '600',
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              Sign Up
            </button>
          </div>

          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              marginBottom: '16px'
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {verificationMessage && (
            <div style={{ background: 'rgba(6, 182, 212, 0.12)', border: '1px solid rgba(6, 182, 212, 0.4)', color: '#a5f3fc', padding: '12px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: '16px' }}>
              {verificationMessage}
            </div>
          )}

          {successMessage && (
            <div style={{ background: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.4)', color: '#bbf7d0', padding: '12px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: '16px' }}>
              {successMessage}
            </div>
          )}

          {/* Email / Password Form */}
          <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {isSignUp && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Display Name
                  </label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="e.g. Alex Rivera"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="e.g. alex_jammer"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Email Address
              </label>
              <input
                type="email"
                required
                className="input-field"
                placeholder="name@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Password
              </label>
              <input
                type="password"
                required
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary"
              style={{ marginTop: '10px', width: '100%' }}
            >
              {isLoading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
