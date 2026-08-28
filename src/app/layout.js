import './globals.css';
import { AuthProvider } from '../context/AuthContext';

export const metadata = {
  title: 'SuperSonic — Synchronized Music Party Platform (<100ms Sync)',
  description: 'Host synchronized music jamming parties with local MP3 uploads and YouTube links in ultra-low latency lockstep.',
  keywords: 'music party, audio sync, music jamming, socket.io, supabase, synchronized playback'
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
