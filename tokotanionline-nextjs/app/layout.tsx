/**
 * Root Layout - Minimal untuk prevent error boundary issues
 * 
 * Strategy: Minimal layout first, then restore functionality incrementally
 */

import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>
        {children}
      </body>
    </html>
  );
}
