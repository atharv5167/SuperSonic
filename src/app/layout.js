import './globals.css';
import { AuthProvider } from '../context/AuthContext';

export const metadata = {
  title: 'SuperSonic — Synchronized Music Party Platform (<100ms Sync)',
  description: 'Host synchronized music jamming parties with local MP3 uploads and YouTube links in ultra-low latency lockstep.',
  keywords: 'music party, audio sync, music jamming, socket.io, supabase, synchronized playback',
  icons: {
    icon: [
      { url: '/favicon.ico?v=2', type: 'image/x-icon' },
      { url: '/favicon.svg?v=2', type: 'image/svg+xml' },
      { url: '/favicon.svg?v=2', type: 'image/svg+xml', sizes: 'any' }
    ],
    shortcut: '/favicon.svg?v=2'
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
