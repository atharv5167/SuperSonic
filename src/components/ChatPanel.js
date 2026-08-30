'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, ShieldAlert, VolumeX, UserX, Crown } from 'lucide-react';

export default function ChatPanel({
  messages = [],
  currentUserId = null,
  isHost = false,
  isMuted = false,
  chatError = null,
  onClearChatError,
  onSendMessage,
  onWarnUser,
  onMuteUser,
  onKickUser
}) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim() || isMuted) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  return (
    <div className="glass-panel" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: '400px',
      borderRadius: 'var(--radius-lg)',
      padding: '18px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: '12px',
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare size={18} color="var(--accent-cyan)" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#fff' }}>Party Chat</h3>
        </div>

        {isMuted && (
          <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171' }}>
            <VolumeX size={12} /> Muted
          </span>
        )}
      </div>

      {chatError && (
        <button
          type="button"
          onClick={onClearChatError}
          style={{
            border: '1px solid rgba(248, 113, 113, 0.45)',
            background: 'rgba(239, 68, 68, 0.12)',
            color: '#fca5a5',
            borderRadius: '8px',
            padding: '7px 10px',
            marginBottom: '10px',
            textAlign: 'left',
            cursor: 'pointer'
          }}
        >
          {chatError}
        </button>
      )}

      {/* Messages List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        paddingRight: '6px',
        marginBottom: '14px'
      }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
            Say hello to the party! 🎉
          </div>
        ) : (
          messages.map((msg, index) => {
            if (msg.isSystem) {
              return (
                <div key={msg.id || index} style={{
                  textAlign: 'center',
                  fontSize: '0.75rem',
                  color: 'var(--accent-cyan)',
                  background: 'rgba(6, 182, 212, 0.08)',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                  margin: '4px auto'
                }}>
                  {msg.content}
                </div>
              );
            }

            const isMe = msg.userId === currentUserId;

            return (
              <div
                key={msg.id || index}
                style={{
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'flex-start',
                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                  maxWidth: '85%'
                }}
              >
                {!isMe && (
                  <img
                    src={msg.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${msg.userId}`}
                    alt="avatar"
                    style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#1e293b', flexShrink: 0 }}
                  />
                )}

                <div>
                  {/* Sender Header */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '3px',
                    justifyContent: isMe ? 'flex-end' : 'flex-start'
                  }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '600', color: isMe ? 'var(--primary-light)' : 'var(--text-muted)' }}>
                      {msg.username}
                    </span>

                    {msg.isHost && (
                      <span className="badge badge-host" style={{ fontSize: '0.6rem', padding: '1px 6px' }}>
                        <Crown size={10} /> Host
                      </span>
                    )}

                    {/* Host Moderation Quick Action on user message */}
                    {isHost && !isMe && !msg.isHost && (
                      <div style={{ display: 'inline-flex', gap: '4px', marginLeft: '6px' }}>
                        <button
                          onClick={() => onWarnUser(msg.userId, 'Inappropriate message in chat.')}
                          style={{ background: 'none', border: 'none', color: 'var(--accent-amber)', cursor: 'pointer', padding: 0 }}
                          title="Warn User"
                        >
                          <ShieldAlert size={12} />
                        </button>
                        <button
                          onClick={() => onMuteUser(msg.userId)}
                          style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 0 }}
                          title="Mute User"
                        >
                          <VolumeX size={12} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Message Bubble */}
                  <div style={{
                    background: isMe ? 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)' : 'rgba(255, 255, 255, 0.07)',
                    color: '#fff',
                    padding: '8px 14px',
                    borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    fontSize: '0.9rem',
                    wordBreak: 'break-word',
                    boxShadow: isMe ? '0 4px 14px rgba(124, 58, 237, 0.3)' : 'none'
                  }}>
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          className="input-field"
          placeholder={isMuted ? 'You are muted by the host' : 'Drop a message...'}
          value={inputText}
          disabled={isMuted}
          onChange={(e) => setInputText(e.target.value)}
          style={{ padding: '10px 16px', fontSize: '0.9rem' }}
        />
        <button
          type="submit"
          className="btn-primary"
          disabled={!inputText.trim() || isMuted}
          style={{ padding: '10px 16px', borderRadius: 'var(--radius-md)' }}
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
