import CustomerAuthShell from '@/components/customer-auth-shell';
import ResetForm from './reset-form';
export const metadata={title:'Reset password | The Chill Pipe',robots:{index:false,follow:false},referrer:'no-referrer' as const};
export default function Page(){return <CustomerAuthShell title="Reset password" subtitle="Get back to your sessions."><ResetForm/></CustomerAuthShell>;}
