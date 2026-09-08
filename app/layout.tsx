import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Request a Hookah Rental | The Chill Pipe',
  description:
    'Build your 24-hour hookah rental request with The Chill Pipe. Choose pipes, flavours, coal, a stove, and delivery or collection.',
  openGraph: {
    title: 'The Chill Pipe',
    description: 'Bring the chill. We bring the pipe.',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Chill Pipe',
    description: 'Bring the chill. We bring the pipe.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
