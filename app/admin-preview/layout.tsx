import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin | The Chill Pipe',
  robots: { index: false, follow: false },
};

export default function AdminPreviewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
