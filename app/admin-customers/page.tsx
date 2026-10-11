import {notFound} from 'next/navigation';
import {managedAccountsEnabled} from '../../lib/customer-management';
import {testCustomersEnabled} from '../../lib/test-customers';
import Customers from './customers';
export const dynamic='force-dynamic';
export const metadata={title:'Customers | The Chill Pipe',robots:'noindex,nofollow'};
export default function Page(){if(testCustomersEnabled||!managedAccountsEnabled())notFound();return <Customers/>;}
