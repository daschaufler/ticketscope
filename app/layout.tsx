import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ticketscope',
  icons: { icon: '/icon.svg' },
  description: 'Browser-based analytics for support tickets: upload a HubSpot CSV export and get first-reply time, resolution time, volume and ticket-type trends.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
