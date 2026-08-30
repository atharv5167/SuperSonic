'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  VolumeX, 
  Radio, 
  Sparkles,
  Youtube,
  Music,
} from 'lucide-react';
import { formatDuration, extractYouTubeId } from '../lib/utils';
import { supabase } from '../lib/supabase/client';
import AudioVisualizer from './AudioVisualizer';

export default function UnifiedPlayer({
  currentTrack,
  isPlaying,
  isHost,
  getSynchronizedTime,
  onPlay,
  onPause,
  onSeek,
  onNext,
  onPrevious,
  hasNext = false,
  hasPrevious = false
}) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [driftOffsetMs, setDriftOffsetMs] = useState(0);

  const audioRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const ytContainerRef = useRef(null);
  const isDraggingRef = useRef(false);
  const pendingPlayRef = useRef(false);
  const audioRetryRef = useRef(false);
  const [ytReady, setYtReady] = useState(false);

  const isYouTube = currentTrack?.source_type === 'youtube' || Boolean(extractYouTubeId(currentTrack?.source_url));
  const youtubeVideoId = isYouTube ? extractYouTubeId(currentTrack?.source_url) : null;

  // 1. YouTube IFrame API Script Loader
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      window.onYouTubeIframeAPIReady = () => {
        setYtReady(true);
      };
    } else {
      setYtReady(true);
    }
  }, []);

  // 2. Initialize YouTube Player
  useEffect(() => {
    if (!isYouTube || !youtubeVideoId || !ytReady) return;

    if (ytPlayerRef.current) {
      try {
        ytPlayerRef.current.loadVideoById(youtubeVideoId);
      } catch (e) {
        console.warn('YT loadVideoById error:', e);
      }
      return;
    }

    try {
      // YouTube mutates/replaces the element passed to YT.Player. Keep that
      // element outside React's managed children to prevent removeChild
      // errors when switching between tracks or MP3/YouTube sources.
      const playerHost = ytContainerRef.current;
      if (!playerHost) return;
      const playerElement = document.createElement('div');
      playerHost.appendChild(playerElement);
      ytPlayerRef.current = new window.YT.Player(playerElement, {
        height: '240',
        width: '100%',
        videoId: youtubeVideoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1
        },
        events: {
          onReady: (event) => {
            const expectedTime = getSynchronizedTime();
            event.target.seekTo(expectedTime, true);
            if (isPlaying) {
              event.target.playVideo();
            }
            setDuration(event.target.getDuration() || 0);
          },
          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              setDuration(event.target.getDuration() || 0);
            }
          }
        }
      });
    } catch (err) {
      console.warn('YouTube Player Init Error:', err);
    }

    return () => {
      // Keep player intact across track changes
    };
  }, [isYouTube, youtubeVideoId, ytReady, getSynchronizedTime]);

  // The YouTube iframe is removed when switching to an MP3. Dispose the old
  // API instance so a later YouTube track gets a valid renderer instead of a
  // stale reference to a detached DOM node.
  useEffect(() => {
    if (isYouTube || !ytPlayerRef.current) return;
    try {
      ytPlayerRef.current.destroy?.();
    } catch (error) {
      console.warn('YouTube Player cleanup error:', error);
    }
    ytPlayerRef.current = null;
    ytContainerRef.current?.replaceChildren();
  }, [isYouTube]);

  useEffect(() => {
    if (!isYouTube || !ytPlayerRef.current) return;
    if (isPlaying) ytPlayerRef.current.playVideo?.();
    else ytPlayerRef.current.pauseVideo?.();
  }, [isYouTube, isPlaying]);

  // 3. Handle HTML5 Audio Source & Playback
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || isYouTube) return;

    let cancelled = false;
    const applyAudioSource = async () => {
      // Resolve a fresh URL for temporary private session files. The server
      // normally provides one, while this client fallback also handles an
      // expired URL after a reconnect.
      let sourceUrl = currentTrack?.source_url;
      if (currentTrack?.storage_path && supabase) {
        const { data, error } = await supabase.storage
          .from('party-audio')
          .createSignedUrl(currentTrack.storage_path, 60 * 60);
        if (error) console.warn('Could not sign MP3 URL:', error.message);
        sourceUrl = data?.signedUrl || sourceUrl;
      }
      if (cancelled || !sourceUrl) return;

      if (audio.src !== sourceUrl) {
        audioRetryRef.current = false;
        audio.src = sourceUrl;
        audio.load();
      }

      const expectedTime = getSynchronizedTime();
      if (Math.abs(audio.currentTime - expectedTime) > 0.15) {
        audio.currentTime = expectedTime;
      }

      if (isPlaying) {
        pendingPlayRef.current = true;
        const playWhenReady = () => {
          if (!pendingPlayRef.current || cancelled) return;
          audio.play().then(() => {
            pendingPlayRef.current = false;
          }).catch(err => {
            console.warn('Audio playback wait:', err.name, err.message);
          });
        };
        if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
          playWhenReady();
        } else {
          audio.addEventListener('canplay', playWhenReady, { once: true });
        }
      } else {
        pendingPlayRef.current = false;
        audio.pause();
      }
    };
    applyAudioSource();
    return () => {
      cancelled = true;
      pendingPlayRef.current = false;
    };
  }, [currentTrack, isPlaying, isYouTube, getSynchronizedTime]);

  // 4. Sub-100ms Adaptive Steering Loop (Checks drift every 500ms)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isPlaying || isDraggingRef.current) return;

      const expectedTime = getSynchronizedTime();
      let actualTime = 0;

      if (isYouTube && ytPlayerRef.current?.getCurrentTime) {
        try {
          actualTime = ytPlayerRef.current.getCurrentTime() || 0;
        } catch (e) { actualTime = expectedTime; }
      } else if (audioRef.current) {
        actualTime = audioRef.current.currentTime || 0;
      }

      setCurrentTime(actualTime);
      const drift = expectedTime - actualTime;
      const driftMs = Math.round(drift * 1000);
      setDriftOffsetMs(driftMs);

      // Adaptive Playback Rate Steering
      if (Math.abs(drift) > 0.75) {
        // Only correct substantial drift; tiny corrections cause audible chasing.
        if (isYouTube && ytPlayerRef.current?.seekTo) {
          ytPlayerRef.current.seekTo(expectedTime, true);
        } else if (audioRef.current) {
          audioRef.current.currentTime = expectedTime;
        }
      } else if (Math.abs(drift) > 0.08) {
        // Gently correct drift with playback rate when supported.
        const rateAdjustment = drift > 0 ? 1.03 : 0.97;
        if (audioRef.current) {
          audioRef.current.playbackRate = rateAdjustment;
        } else if (isYouTube && ytPlayerRef.current?.setPlaybackRate) {
          ytPlayerRef.current.setPlaybackRate(rateAdjustment);
        }
      } else {
        // Locked in (<25ms)
        if (audioRef.current) {
          audioRef.current.playbackRate = 1.0;
        } else if (isYouTube && ytPlayerRef.current?.setPlaybackRate) {
          ytPlayerRef.current.setPlaybackRate(1.0);
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isPlaying, isYouTube, getSynchronizedTime]);

  // 5. Volume & Mute Updates
  useEffect(() => {
    const effectiveVol = isMuted ? 0 : volume;
    if (audioRef.current) {
      audioRef.current.volume = effectiveVol;
    }
    if (ytPlayerRef.current?.setVolume) {
      ytPlayerRef.current.setVolume(effectiveVol * 100);
    }
  }, [volume, isMuted]);

  // Host Action: Handle Seek Drag
  const handleSeekChange = (e) => {
    const newPos = parseFloat(e.target.value);
    setCurrentTime(newPos);
  };

  const handleSeekCommit = (e) => {
    isDraggingRef.current = false;
    const newPos = parseFloat(e.target.value);
    if (isHost && onSeek) {
      onSeek(newPos);
    }
  };

  return (
    <div className="glass-panel" style={{
      padding: '24px',
      borderRadius: 'var(--radius-xl)',
      border: '1px solid var(--border-glow)',
      background: 'linear-gradient(180deg, rgba(20, 27, 54, 0.8) 0%, rgba(10, 14, 28, 0.95) 100%)',
      boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6), 0 0 30px rgba(139, 92, 246, 0.2)'
    }}>
      {/* Hidden HTML5 Audio Element */}
      <audio
        ref={audioRef}
        crossOrigin="anonymous"
        onLoadedMetadata={(e) => setDuration(e.target.duration || 0)}
        onError={async (e) => {
          const track = currentTrack;
          if (audioRetryRef.current || !track?.storage_path || !supabase) return;
          audioRetryRef.current = true;
          const { data, error } = await supabase.storage
            .from('party-audio')
            .createSignedUrl(track.storage_path, 60 * 60);
          if (error || !data?.signedUrl) {
            console.error('MP3 could not be loaded from Supabase Storage:', error?.message || 'No signed URL returned');
            return;
          }
          e.currentTarget.src = data.signedUrl;
          e.currentTarget.load();
          if (isPlaying) e.currentTarget.play().catch(() => {});
        }}
        onEnded={() => {
          if (isHost && onNext) onNext();
        }}
        preload="auto"
      />

      {/* Main Track Display Section */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isYouTube ? '1fr 1fr' : '120px 1fr auto',
        gap: '24px',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        {/* Album Artwork or YouTube Embed */}
        {isYouTube ? (
          <div style={{
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            background: '#000',
            aspectRatio: '16/9',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            border: '1px solid var(--border-subtle)',
            // The YouTube iframe is a renderer only. Prevent clicks and
            // keyboard input from reaching cross-origin native controls.
            pointerEvents: 'none',
            userSelect: 'none'
          }}>
            <div ref={ytContainerRef} style={{ width: '100%', height: '100%' }} />
          </div>
        ) : (
          <div style={{
            width: '120px',
            height: '120px',
            borderRadius: 'var(--radius-lg)',
            background: currentTrack?.thumbnail_url 
              ? `url(${currentTrack.thumbnail_url}) center/cover no-repeat` 
              : 'linear-gradient(135deg, #6d28d9 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 25px rgba(139, 92, 246, 0.35)',
            border: '1px solid rgba(255,255,255,0.15)',
            position: 'relative'
          }}>
            {!currentTrack?.thumbnail_url && (
              <Music size={44} color="#ffffff" style={{ opacity: 0.9 }} />
            )}
            {isPlaying && (
              <div style={{
                position: 'absolute',
                bottom: '8px',
                right: '8px',
                background: 'rgba(0,0,0,0.75)',
                borderRadius: '6px',
                padding: '3px 6px'
              }}>
                <Radio size={14} color="#34d399" className="animate-pulse" />
              </div>
            )}
          </div>
        )}

        {/* Track Info & Visualizer */}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span className="badge badge-sync" style={{ fontSize: '0.7rem' }}>
              <Sparkles size={11} /> {Math.abs(driftOffsetMs) < 30 ? 'Locked (<30ms)' : `Sync: ${driftOffsetMs}ms`}
            </span>
            {isYouTube ? (
              <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                <Youtube size={12} /> YouTube
              </span>
            ) : (
              <span className="badge badge-host" style={{ fontSize: '0.7rem' }}>
                <Music size={11} /> MP3 Audio
              </span>
            )}
          </div>

          <h2 style={{
            fontSize: '1.4rem',
            fontWeight: '700',
            color: '#fff',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            marginBottom: '4px'
          }}>
            {currentTrack?.title || 'No Track Selected'}
          </h2>

          <p style={{
            fontSize: '0.95rem',
            color: 'var(--text-muted)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            marginBottom: '12px'
          }}>
            {currentTrack?.artist || currentTrack?.author || 'Upload an MP3 or add a YouTube link'}
          </p>

          {!isYouTube && (
            <AudioVisualizer isPlaying={isPlaying} trackTitle={currentTrack?.title} />
          )}
        </div>
      </div>

      {/* Timeline Seek Bar */}
      <div style={{ marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', minWidth: '40px' }}>
            {formatDuration(currentTime)}
          </span>

          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            disabled={!isHost}
            onMouseDown={() => { isDraggingRef.current = true; }}
            onTouchStart={() => { isDraggingRef.current = true; }}
            onChange={handleSeekChange}
            onMouseUp={handleSeekCommit}
            onTouchEnd={handleSeekCommit}
            style={{
              flex: 1,
              height: '6px',
              appearance: 'none',
              background: `linear-gradient(to right, var(--primary) ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.1) ${(currentTime / (duration || 1)) * 100}%)`,
              borderRadius: '6px',
              outline: 'none',
              cursor: isHost ? 'pointer' : 'default'
            }}
          />

          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', minWidth: '40px', textAlign: 'right' }}>
            {formatDuration(duration)}
          </span>
        </div>
      </div>

      {/* Control Buttons & Volume */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        {/* Playback Controls (Host Only) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isHost ? (
            <>
              <button
                className="btn-icon"
                onClick={onPrevious}
                disabled={!hasPrevious}
                title="Previous Track"
                style={{ opacity: hasPrevious ? 1 : 0.4 }}
              >
                <SkipBack size={18} />
              </button>

              <button
                className="btn-primary"
                onClick={() => {
                  if (isPlaying) {
                    onPause(currentTime);
                    return;
                  }
                  // Use the host's click gesture to unlock local MP3 audio;
                  // the authoritative state change still travels through
                  // Socket.IO immediately afterward.
                  if (!isYouTube && audioRef.current) {
                    audioRef.current.play().catch((error) => {
                      console.warn('Audio requires a user gesture:', error.name, error.message);
                    });
                  }
                  onPlay(currentTime);
                }}
                style={{
                  width: '54px',
                  height: '54px',
                  padding: 0,
                  borderRadius: '50%',
                  boxShadow: isPlaying ? '0 0 25px rgba(139, 92, 246, 0.7)' : '0 4px 15px rgba(139, 92, 246, 0.4)'
                }}
                title={isPlaying ? 'Pause for all' : 'Play for all'}
              >
                {isPlaying ? <Pause size={22} /> : <Play size={22} style={{ marginLeft: '2px' }} />}
              </button>

              <button
                className="btn-icon"
                onClick={onNext}
                disabled={!hasNext}
                title="Next Track"
                style={{ opacity: hasNext ? 1 : 0.4 }}
              >
                <SkipForward size={18} />
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-host" style={{ padding: '6px 14px' }}>
                <Radio size={13} /> Synchronized with Host
              </span>
            </div>
          )}
        </div>

        {/* Local Listening Controls (Volume only) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          {/* Local Volume Slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn-icon"
              style={{ width: '34px', height: '34px' }}
              onClick={() => setIsMuted(!isMuted)}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>

            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(parseFloat(e.target.value));
                if (isMuted) setIsMuted(false);
              }}
              style={{
                width: '80px',
                height: '4px',
                accentColor: 'var(--accent-cyan)',
                cursor: 'pointer'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
