import type { Metadata } from 'next';
import { Providers } from '../components/providers';
import { publicConfig } from '../lib/config';
import './globals.css';

export const metadata: Metadata = {
  title: { default: publicConfig.appName, template: `%s · ${publicConfig.appName}` },
  description: 'Basketball tournament operations portal',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" style={{ '--brand-primary': publicConfig.primaryColor } as React.CSSProperties}>
      <body>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
