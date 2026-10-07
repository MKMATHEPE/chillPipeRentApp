import type { Metadata } from 'next';
import AdminAccess from '../../components/admin-access';
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin | The Chill Pipe',
  robots: { index: false, follow: false },
};

export default function AdminPreviewLayout({ children }: { children: React.ReactNode }) {
  return <AdminAccess>{children}</AdminAccess>;
}
