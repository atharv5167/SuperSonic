'use client';

import React, { useState, useRef } from 'react';
import { Upload, Youtube, Music, X, Plus, Check, Loader2, Sparkles } from 'lucide-react';
import { extractYouTubeId, fetchYouTubeMetadata } from '../lib/utils';
import { supabase } from '../lib/supabase/client';
import { useAuth } from '../context/AuthContext';

export default function TrackUploadModal({ isOpen, onClose, onAddTrack }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('mp3'); // 'mp3' | 'youtube'
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // MP3 Form State
  const [mp3Title, setMp3Title] = useState('');
  const [mp3Artist, setMp3Artist] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  // YouTube Form State
  const [ytUrl, setYtUrl] = useState('');
  const [ytPreview, setYtPreview] = useState(null);
  const [isLoadingYt, setIsLoadingYt] = useState(false);

  if (!isOpen) return null;

  // Handle File Selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('audio') && !file.name.endsWith('.mp3')) {
      setErrorMessage('Please select a valid MP3 audio file.');
      return;
    }

    setErrorMessage('');
    setSelectedFile(file);
    const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
    if (!mp3Title) setMp3Title(cleanName);
  };

  // Submit MP3 Track
  const handleMp3Submit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage('Please choose an MP3 file to upload.');
      return;
    }

    setIsUploading(true);

    try {
      if (!supabase || !user?.id) throw new Error('You must be signed in to upload music.');
      const storagePath = `${user.id}/${crypto.randomUUID()}-${selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const { error: uploadError } = await supabase.storage.from('party-audio').upload(storagePath, selectedFile, {
        contentType: selectedFile.type || 'audio/mpeg',
        upsert: false
      });
      if (uploadError) throw uploadError;
      const { data: publicUrl } = supabase.storage.from('party-audio').getPublicUrl(storagePath);
      
      const newTrack = {
        id: `track_mp3_${Date.now()}`,
        title: mp3Title.trim() || selectedFile.name,
        artist: mp3Artist.trim() || 'Host Upload',
        source_type: 'mp3',
        source_url: publicUrl.publicUrl,
        duration: 0,
        thumbnail_url: null
      };

      onAddTrack(newTrack);
      setIsUploading(false);
      resetForm();
      onClose();
    } catch (err) {
      console.error('MP3 upload failed:', err);
      setErrorMessage(/bucket/i.test(err.message || '')
        ? 'Music storage is currently unavailable. Please try again later.'
        : 'Unable to upload music. Please try again.');
      setIsUploading(false);
    }
  };

  // Check & Preview YouTube URL
  const handleYtUrlChange = async (url) => {
    setYtUrl(url);
    setErrorMessage('');
    const videoId = extractYouTubeId(url);

    if (videoId) {
      setIsLoadingYt(true);
      const meta = await fetchYouTubeMetadata(videoId);
      setYtPreview({
        videoId,
        title: meta.title,
        author: meta.author,
        thumbnail: meta.thumbnail
      });
      setIsLoadingYt(false);
    } else {
      setYtPreview(null);
    }
  };

  // Submit YouTube Track
  const handleYtSubmit = (e) => {
    e.preventDefault();
    const videoId = extractYouTubeId(ytUrl);
    if (!videoId) {
      setErrorMessage('Please enter a valid YouTube video URL.');
      return;
    }

    const newTrack = {
      id: `track_yt_${Date.now()}`,
      title: ytPreview?.title || `YouTube Video (${videoId})`,
      artist: ytPreview?.author || 'YouTube',
      source_type: 'youtube',
      source_url: `https://www.youtube.com/watch?v=${videoId}`,
      duration: 0,
      thumbnail_url: ytPreview?.thumbnail || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    };

    onAddTrack(newTrack);
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setMp3Title('');
    setMp3Artist('');
    setSelectedFile(null);
    setYtUrl('');
    setYtPreview(null);
    setErrorMessage('');
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
        maxWidth: '520px',
        padding: '28px',
        borderRadius: 'var(--radius-xl)',
        background: 'linear-gradient(180deg, rgba(20, 27, 54, 0.95) 0%, rgba(10, 14, 28, 0.98) 100%)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Plus size={20} color="#ffffff" />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#fff' }}>Add Music to Party</h3>
          </div>

          <button onClick={onClose} className="btn-icon" style={{ width: '34px', height: '34px' }}>
            <X size={16} />
          </button>
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
            onClick={() => setActiveTab('mp3')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: activeTab === 'mp3' ? 'var(--primary)' : 'transparent',
              color: '#fff',
              fontWeight: '600',
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)'
            }}
          >
            <Music size={16} /> Upload MP3 Audio
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('youtube')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: activeTab === 'youtube' ? '#ef4444' : 'transparent',
              color: '#fff',
              fontWeight: '600',
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)'
            }}
          >
            <Youtube size={16} /> YouTube Link
          </button>
        </div>

        {errorMessage && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            marginBottom: '16px'
          }}>
            {errorMessage}
          </div>
        )}

        {/* Tab 1: MP3 Upload */}
        {activeTab === 'mp3' && (
          <form onSubmit={handleMp3Submit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed var(--border-glow)',
                borderRadius: 'var(--radius-lg)',
                padding: '24px 16px',
                textAlign: 'center',
                cursor: 'pointer',
                background: selectedFile ? 'rgba(139, 92, 246, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                transition: 'all var(--transition-normal)'
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/mp3,audio/mpeg,audio/wav"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />

              <Upload size={32} color={selectedFile ? '#34d399' : 'var(--primary-light)'} style={{ margin: '0 auto 10px' }} />

              {selectedFile ? (
                <div>
                  <p style={{ fontWeight: '600', color: '#fff', fontSize: '0.95rem' }}>{selectedFile.name}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--accent-emerald)', marginTop: '4px' }}>
                    Ready to load ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                  </p>
                </div>
              ) : (
                <div>
                  <p style={{ fontWeight: '600', color: '#fff', fontSize: '0.95rem' }}>Click or Drag & Drop MP3 File</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px' }}>Supports MP3, WAV up to 50MB</p>
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Song Title
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Midnight City"
                value={mp3Title}
                onChange={(e) => setMp3Title(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Artist / Creator
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. M83"
                value={mp3Artist}
                onChange={(e) => setMp3Artist(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={!selectedFile || isUploading}
              className="btn-primary"
              style={{ marginTop: '8px', width: '100%' }}
            >
              {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              Add to Room Playlist
            </button>
          </form>
        )}

        {/* Tab 2: YouTube Link */}
        {activeTab === 'youtube' && (
          <form onSubmit={handleYtSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                YouTube Video URL
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="https://www.youtube.com/watch?v=..."
                value={ytUrl}
                onChange={(e) => handleYtUrlChange(e.target.value)}
              />
            </div>

            {isLoadingYt && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text-muted)', padding: '12px' }}>
                <Loader2 size={16} className="animate-spin" /> Fetching video details...
              </div>
            )}

            {ytPreview && (
              <div style={{
                display: 'flex',
                gap: '12px',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                alignItems: 'center'
              }}>
                <img
                  src={ytPreview.thumbnail}
                  alt="thumbnail"
                  style={{ width: '80px', height: '50px', borderRadius: '6px', objectFit: 'cover' }}
                />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: '0.9rem', fontWeight: '700', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {ytPreview.title}
                  </p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {ytPreview.author}
                  </p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={!ytPreview}
              className="btn-cyan"
              style={{ marginTop: '8px', width: '100%' }}
            >
              <Plus size={18} /> Add YouTube Track
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
