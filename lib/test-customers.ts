// Production implementation. The local provider is only aliased by Vite's serve command.
import type { Session, User } from '@supabase/supabase-js';
export const testCustomersEnabled = false;
export type TestLogin = {user:User;session:Session;requiresPasswordChange:boolean};
export async function loginTestCustomer(_email:string,_password:string):Promise<TestLogin|null>{return null;}
export async function verifyTestCustomer(_token:string):Promise<{id:string;email:string}|null>{return null;}
export async function changeTestPassword(_cookie:string|null,_body:Record<string,unknown>):Promise<void>{throw new Error('Not available.');}
export async function listTestCustomers():Promise<unknown[]>{return [];}
export async function manageTestCustomer(_body:Record<string,unknown>):Promise<void>{throw new Error('Not available.');}
