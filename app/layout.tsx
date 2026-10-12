import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import './mobile.css';
import './checkout.css';
import './store.css';
import './checkout-form.css';
import './operations.css';
import './app-shell.css';
import './cinematic.css';
import {testCustomersEnabled} from '../lib/test-customers';
import { BookingReviewPrompt } from '../components/booking-review';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Request a Hookah Rental | The Chill Pipe',
  description:
    'Build your 24-hour hookah rental request with The Chill Pipe. Choose hookahs, flavours, coconut coals, a stove, and delivery or collection.',
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
      <head><link rel="preload" as="image" href="/hookah-hero.webp" fetchPriority="high" /></head>
      <body
        className={`${geistSans.variable} antialiased`}
      >
        {testCustomersEnabled&&<aside style={{position:'relative',zIndex:200,background:'#fff0bd',color:'#111',textAlign:'center',padding:'8px 12px',font:'12px/1.4 Arial,sans-serif'}}>LOCAL TEST ONLY · Fictional customers and bookings · Do not make real payments</aside>}
        {children}
        <BookingReviewPrompt />
      </body>
    </html>
  );
}
