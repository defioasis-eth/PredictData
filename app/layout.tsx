import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import Nav from '@/components/Nav';
import PageContainer from '@/components/PageContainer';

export const metadata: Metadata = {
  title: 'PredictData',
  description: 'Prediction market analytics dashboard.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen">
          <Nav />
          <PageContainer>{children}</PageContainer>
        </div>
      </body>
    </html>
  );
}
