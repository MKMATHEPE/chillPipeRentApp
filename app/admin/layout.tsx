import AdminAccess from '../../components/admin-access';
export const dynamic = 'force-dynamic';
export default function AdminLayout({children}:{children:React.ReactNode}) { return <AdminAccess>{children}</AdminAccess>; }
