import {notFound} from 'next/navigation';
import {testCustomersEnabled} from '../../lib/test-customers';
import TestCustomers from './test-customers';
export const metadata={title:'Test customers | The Chill Pipe',robots:'noindex,nofollow'};
export default function Page(){if(!testCustomersEnabled)notFound();return <TestCustomers/>;}
