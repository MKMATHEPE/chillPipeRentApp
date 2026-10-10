import type { Metadata } from 'next';
import CustomerLogin from './customer-login';
export const metadata:Metadata={title:'Your account | The Chill Pipe',robots:{index:false,follow:false},referrer:'no-referrer'};
export default function Page(){return <CustomerLogin/>;}
