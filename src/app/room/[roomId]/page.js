'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useSyncEngine } from '../../../hooks/useSyncEngine';
import { localStore } from '../../../lib/supabase/client';
import Navbar from '../../../components/Navbar';
import UnifiedPlayer from '../../../components/UnifiedPlayer';
import PlaylistManager from '../../../components/PlaylistManager';
import ChatPanel from '../../../components/ChatPanel';
import ParticipantList from '../../../components/ParticipantList';
import QRCodeModal from '../../../components/QRCodeModal';
import TrackUploadModal from '../../../components/TrackUploadModal';
import PartyEndSummaryModal from '../../../components/PartyEndSummaryModal';
import { 
  Radio, 
  Share2, 
  Users, 
  ListMusic, 
  MessageSquare, 
  Power, 
  AlertTriangle,
  Sparkles,
  Crown
} from 'lucide-react';

export default function LiveRoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomId = params?.roomId ? String(params.roomId).toUpperCase() : '';
  const isHostQuery = searchParams.get('host') === 'true';

  const { user, profile, isLoading } = useAuth();
  
  // UI Tabs for Mobile / Sidebar
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'playlist' | 'participants'
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.replace(`/auth?next=/room/${roomId}`);
  }, [user, isLoading, router, roomId]);

  const activeUserId = user?.id || '';
  const activeUserName = profile?.display_name || user?.display_name || 'Jammer';
  const activeAvatar = profile?.avatar_url || user?.avatar_url;

  // Real-Time Sub-100ms Sync Engine Hook
  const {
    isConnected,
    connectionError,
    actionError,
    clearActionError,
    clockOffset,
    roomState,
    currentTrack,
    currentTrackIndex,
    isPlaying,
    participants,
    chatMessages,
    currentUser,
    chatError,
    clearChatError,
    partySummary,
    isPartyEnded,
    moderationAlert,
    isMuted,
    clearModerationAlert,
    getSynchronizedTime,
    play,
    pause,
    seek,
    changeTrack,
    updatePlaylist,
    sendChatMessage,
    warnUser,
    kickUser,
    toggleMuteUser,
    endParty,
    leaveRoom
  } = useSyncEngine({
    roomId,
    userId: activeUserId,
    username: activeUserName,
    avatar: activeAvatar,
    isHost: isHostQuery
  });

  // Effective Host Verification
  // The server's authenticated join response is authoritative. The URL
  // query is only a navigation hint and must never grant host controls.
  const isHost = Boolean(currentUser?.isHost);

  // Save lightweight party summary when party ends
  useEffect(() => {
    if (partySummary) {
      localStore.savePartyHistory({
        ...partySummary,
        userId: activeUserId,
        role: isHost ? 'hosted' : 'participated',
        hostName: partySummary.hostName || (isHost ? activeUserName : roomState?.hostName)
      });
    }
  }, [partySummary, activeUserId, activeUserName, isHost, roomState?.hostName]);

  // Keep hook order stable while authentication is initializing.
  if (isLoading || !user) return null;

  const handleLeaveRoom = () => {
    if (!isHost && roomState) {
      localStore.savePartyHistory({
        roomId,
        name: roomState.name,
        startedAt: roomState.createdAt,
        endedAt: Date.now(),
        durationSeconds: Math.floor((Date.now() - (roomState.createdAt || Date.now())) / 1000),
        peakParticipants: participants.length,
        hostId: roomState.hostId,
        hostName: roomState.hostName,
        tracksPlayed: roomState.tracks || [],
        userId: activeUserId,
        role: 'participated'
      });
    }
    leaveRoom();
    router.push('/dashboard');
  };

  // Playlist track handlers
  const handleSelectTrack = (index) => {
    if (isHost) {
      changeTrack(index);
    }
  };

  const handleRemoveTrack = (index) => {
    if (!isHost || !roomState?.tracks) return;
    const updated = roomState.tracks.filter((_, idx) => idx !== index);
    let newIndex = currentTrackIndex;
    if (index < currentTrackIndex) newIndex--;
    updatePlaylist(updated, newIndex);
  };

  const handleReorderTracks = (newTracks, newIndex) => {
    if (!isHost) return;
    updatePlaylist(newTracks, newIndex);
  };

  const handleAddTrack = (newTrack) => {
    if (!isHost) return;
    const currentTracks = roomState?.tracks || [];
    const updated = [...currentTracks, newTrack];
    updatePlaylist(updated, currentTrackIndex);
  };

  return (
    <div className="room-page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      <Navbar currentRoomCode={roomId} isHost={isHost} onLeaveRoom={handleLeaveRoom} />

      {connectionError && (
        <div style={{ margin: '20px auto 0', maxWidth: '720px', width: 'calc(100% - 40px)', padding: '14px 18px', borderRadius: '10px', background: 'rgba(255, 87, 87, 0.14)', border: '1px solid rgba(255, 87, 87, 0.5)', color: '#ffb0b0', textAlign: 'center' }}>
          {connectionError}
        </div>
      )}

      {actionError && (
        <button
          type="button"
          onClick={clearActionError}
          style={{ margin: '12px auto 0', maxWidth: '720px', width: 'calc(100% - 40px)', padding: '12px 16px', borderRadius: '10px', background: 'rgba(255, 87, 87, 0.14)', border: '1px solid rgba(255, 87, 87, 0.5)', color: '#ffb0b0', textAlign: 'center', cursor: 'pointer' }}
        >
          {actionError}
        </button>
      )}

      {/* Moderation Warning Toast */}
      {moderationAlert && (
        <div style={{
          position: 'fixed',
          top: '90px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 90,
          background: 'rgba(239, 68, 68, 0.95)',
          color: '#fff',
          padding: '14px 24px',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 8px 30px rgba(239, 68, 68, 0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <AlertTriangle size={20} />
          <div>
            <p style={{ fontWeight: '700', fontSize: '0.9rem' }}>Host Warning</p>
            <p style={{ fontSize: '0.85rem' }}>{moderationAlert.reason}</p>
          </div>
          <button
            onClick={clearModerationAlert}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', marginLeft: '12px', fontWeight: '700' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Room Layout */}
      <main className="container" style={{ flex: 1, padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Room Header Controls */}
        <div className="glass-panel room-header-card" style={{
          padding: '16px 24px',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(139, 92, 246, 0.4)'
            }}>
              <Radio size={20} color="#ffffff" />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#fff' }}>
                  {roomState?.name || `Party Room ${roomId}`}
                </h1>
                <span className="badge badge-live">LIVE</span>
                {isHost && <span className="badge badge-host"><Crown size={10} /> HOST</span>}
              </div>

              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Code: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', fontWeight: '700' }}>{roomId}</span> • {participants.length} Active Jammers • NTP Drift: {Math.abs(clockOffset).toFixed(1)}ms
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setIsQrOpen(true)}
              className="btn-secondary room-share-action"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              <Share2 size={16} /> Invite Friends / QR
            </button>

            {isHost && (
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to end this party room for all participants?')) {
                    endParty();
                  }
                }}
                className="btn-icon"
                style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                title="End Party"
              >
                <Power size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Multi-Column Jamming Layout */}
        <div className="room-layout" style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
          gap: '20px',
          flex: 1
        }}>
          {/* LEFT COLUMN: Unified Media Player & Visualizer */}
          <div className="room-main-column" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <UnifiedPlayer
              currentTrack={currentTrack || roomState?.tracks?.[currentTrackIndex]}
              isPlaying={isPlaying}
              isHost={isHost}
              getSynchronizedTime={getSynchronizedTime}
              onPlay={play}
              onPause={pause}
              onSeek={seek}
              onNext={() => {
                const tracks = roomState?.tracks || [];
                if (currentTrackIndex < tracks.length - 1) {
                  changeTrack(currentTrackIndex + 1);
                }
              }}
              onPrevious={() => {
                if (currentTrackIndex > 0) {
                  changeTrack(currentTrackIndex - 1);
                }
              }}
              hasNext={currentTrackIndex < (roomState?.tracks?.length || 1) - 1}
              hasPrevious={currentTrackIndex > 0}
            />

            {/* Desktop Playlist Manager under player */}
            <div style={{ flex: 1, minHeight: '320px' }}>
              <PlaylistManager
                tracks={roomState?.tracks || []}
                currentTrackIndex={currentTrackIndex}
                isHost={isHost}
                isPlaying={isPlaying}
                onSelectTrack={handleSelectTrack}
                onRemoveTrack={handleRemoveTrack}
                onReorderTracks={handleReorderTracks}
                onOpenAddModal={() => setIsAddModalOpen(true)}
              />
            </div>
          </div>

          {/* RIGHT COLUMN: Sidebar (Chat & Participants) */}
          <div className="room-side-column" style={{ display: 'flex', flexDirection: 'column', gap: '14px', height: '100%' }}>
            {/* Tab Navigation */}
            <div className="room-tabs" style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.04)',
              padding: '4px',
              borderRadius: 'var(--radius-md)'
            }}>
              <button
                onClick={() => setActiveTab('chat')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: activeTab === 'chat' ? 'var(--primary)' : 'transparent',
                  color: '#fff',
                  fontWeight: '600',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                <MessageSquare size={14} /> Party Chat ({chatMessages.length})
              </button>

              <button
                onClick={() => setActiveTab('participants')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: activeTab === 'participants' ? 'var(--primary)' : 'transparent',
                  color: '#fff',
                  fontWeight: '600',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                <Users size={14} /> Jammers ({participants.length})
              </button>
            </div>

            {/* Tab Content */}
            <div className="room-tab-content" style={{ flex: 1, minHeight: '480px' }}>
              {activeTab === 'chat' ? (
                <ChatPanel
                  messages={chatMessages}
                  currentUserId={activeUserId}
                  isHost={isHost}
                  isMuted={isMuted}
                  chatError={chatError}
                  onClearChatError={clearChatError}
                  onSendMessage={sendChatMessage}
                  onWarnUser={warnUser}
                  onMuteUser={toggleMuteUser}
                  onKickUser={kickUser}
                />
              ) : (
                <ParticipantList
                  participants={participants}
                  currentUserId={activeUserId}
                  isHost={isHost}
                  onWarnUser={warnUser}
                  onMuteUser={toggleMuteUser}
                  onKickUser={kickUser}
                />
              )}
            </div>
          </div>
        </div>
      </main>

      {/* QR Code Sharing Modal */}
      <QRCodeModal
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        roomId={roomId}
        roomName={roomState?.name}
      />

      {/* Add Music Track Modal */}
      <TrackUploadModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        roomId={roomId}
        onAddTrack={handleAddTrack}
      />

      {/* Party Ended Summary Modal */}
      <PartyEndSummaryModal
        isOpen={isPartyEnded}
        summary={partySummary}
      />
    </div>
  );
}
