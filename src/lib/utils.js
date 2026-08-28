/**
 * Extracts YouTube Video ID from any standard YouTube URL or embed link
 * Handles: youtu.be, youtube.com/watch?v=, youtube.com/embed/, youtube.com/shorts/
 */
export function extractYouTubeId(url) {
  if (!url || typeof url !== 'string') return null;
  
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
  const match = url.trim().match(regExp);
  
  return (match && match[2].length === 11) ? match[2] : null;
}

/**
 * Formats seconds into MM:SS or HH:MM:SS format
 */
export function formatDuration(seconds) {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  
  const totalSeconds = Math.floor(seconds);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  
  const paddedSecs = secs < 10 ? `0${secs}` : `${secs}`;
  
  if (hrs > 0) {
    const paddedMins = mins < 10 ? `0${mins}` : `${mins}`;
    return `${hrs}:${paddedMins}:${paddedSecs}`;
  }
  
  return `${mins}:${paddedSecs}`;
}

/**
 * Generates a clean 6-character room code (e.g. JAM-892)
 */
export function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'JAM-';
  for (let i = 0; i < 3; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Fetch YouTube Video Title & Thumbnail via standard oEmbed (no API key required)
 */
export async function fetchYouTubeMetadata(videoId) {
  try {
    const url = `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch oEmbed data');
    const data = await res.json();
    
    return {
      title: data.title || `YouTube Video (${videoId})`,
      author: data.author_name || 'YouTube Creator',
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    };
  } catch (err) {
    console.warn('Could not fetch oEmbed metadata:', err);
    return {
      title: `YouTube Stream (${videoId})`,
      author: 'YouTube',
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    };
  }
}

/**
 * Helper to generate an avatar URL using Dicebear
 */
export function getAvatarUrl(seed) {
  return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(seed || 'jammer')}`;
}
