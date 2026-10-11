import {notFound} from 'next/navigation';
import {testCustomersEnabled} from '../../lib/test-customers';
import PasswordForm from './password-form';
export const metadata={title:'Set test password | The Chill Pipe',robots:'noindex,nofollow'};
export default function Page(){if(!testCustomersEnabled)notFound();return <PasswordForm/>;}
