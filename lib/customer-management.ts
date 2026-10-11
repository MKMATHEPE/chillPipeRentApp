import {env} from 'cloudflare:workers';
import {createClient,type User} from '@supabase/supabase-js';
import {getDb} from '../db';
import {authConfig,authClient,digest} from './admin-auth';

type Managed={user_id:string;email:string;full_name:string;phone:string;status:string;must_change:number;revision:number};
export class CustomerInputError extends Error {}
export const managedAccountsEnabled=()=> (env as unknown as {CUSTOMER_ACCOUNT_MODE?:string}).CUSTOMER_ACCOUNT_MODE==='managed';
function manager(){
  const key=(env as unknown as {SUPABASE_SECRET_KEY?:string}).SUPABASE_SECRET_KEY;
  if(!key)throw new Error('Customer management is not configured');
  return createClient(authConfig().SUPABASE_URL,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:(url,options)=>fetch(url,{...options,signal:AbortSignal.timeout(10000),cache:'no-store'})}}).auth.admin;
}
export const managedCustomer=(id:string)=>getDb().prepare('SELECT * FROM managed_customers WHERE user_id=?').bind(id).first<Managed>();
export async function customerAccess(user:User,revision?:number,allowPending=false){
  if(user.id===authConfig().ADMIN_USER_ID)return {allowed:false,revision:0,pending:false};
  const row=await managedCustomer(user.id);
  if(!row)return {allowed:user.app_metadata?.cp_managed!==true && !managedAccountsEnabled(),revision:0,pending:false};
  const pending=row.must_change!==0;
  return {allowed:row.status==='active' && (revision===undefined || revision===row.revision) && (!pending||allowPending),revision:row.revision,pending};
}
export async function listManagedCustomers(page:number){
  const rows=await getDb().prepare("SELECT user_id AS id,email,full_name AS fullName,phone,status,must_change AS mustChange,revision FROM managed_customers WHERE status!='removed' ORDER BY updated_at DESC,user_id LIMIT 51 OFFSET ?").bind((page-1)*50).all();
  return {customers:rows.results.slice(0,50),hasMore:rows.results.length>50};
}
export async function manageCustomer(body:Record<string,unknown>){
  const action=body.action;
  if(action==='create'){
    const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
    const fullName=typeof body.fullName==='string'?body.fullName.trim():'';
    const phone=typeof body.phone==='string'?body.phone.trim():'';
    const password=body.temporaryPassword;
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||!fullName||fullName.length>100||!/^\+?[\d ()-]{7,40}$/.test(phone))throw new CustomerInputError('Enter a valid name, email and contact number.');
    if(typeof password!=='string'||password.length<12||password.length>128)throw new CustomerInputError('Use 12–128 characters for the temporary password.');
    if(body.identityConfirmed!==true)throw new CustomerInputError('Confirm you have verified this customer and their email address.');
    if(await getDb().prepare('SELECT user_id FROM managed_customers WHERE email=?').bind(email).first())throw new CustomerInputError('This email already has an account. Use the existing account controls.');
    const admin=manager();
    const {data,error}=await admin.createUser({email,password,email_confirm:true,user_metadata:{fullName,phone},app_metadata:{cp_managed:true}});
    if(error||!data.user)throw new CustomerInputError('Could not create this account. The email may already be registered, or the password may not meet security requirements.');
    // A missing registry row always fails closed, even if the provider succeeded.
    await getDb().prepare('INSERT INTO managed_customers(user_id,email,full_name,phone,updated_at) VALUES (?,?,?,?,?)').bind(data.user.id,email,fullName,phone,Date.now()).run();
    return;
  }
  if(!['disable','enable','remove'].includes(String(action))||typeof body.id!=='string'||body.id===authConfig().ADMIN_USER_ID||!Number.isSafeInteger(body.revision))throw new CustomerInputError('Invalid customer update.');
  const row=await managedCustomer(body.id);
  if(!row||row.status==='removed'||row.revision!==body.revision)throw new CustomerInputError('This account changed. Reload the list and try again.');
  const status=action==='enable'?'active':action==='remove'?'removed':'disabled';
  const changed=await getDb().prepare("UPDATE managed_customers SET status=?,revision=revision+1,updated_at=? WHERE user_id=? AND revision=? AND status!='removed' RETURNING user_id").bind(status,Date.now(),body.id,body.revision).first();
  if(!changed)throw new CustomerInputError('This account changed. Reload the list and try again.');
  await getDb().prepare('DELETE FROM customer_sessions WHERE user_id=?').bind(body.id).run();
}
export async function replaceCustomerPassword(header:string|null,body:Record<string,unknown>){
  const token=header?.split(';').map(x=>x.trim()).find(x=>x.startsWith('cp_customer_session='))?.slice('cp_customer_session='.length);
  if(!token||!/^[a-f0-9]{64}$/.test(token))throw new CustomerInputError('Sign in again to change your password.');
  const session=await getDb().prepare('SELECT user_id,access_token,managed_revision FROM customer_sessions WHERE token_hash=? AND expires_at>?').bind(await digest(token),Date.now()).first<{user_id:string;access_token:string;managed_revision:number}>();
  if(!session)throw new CustomerInputError('Your session expired. Sign in again.');
  const {data,error}=await authClient().auth.getUser(session.access_token);
  if(error||!data.user?.email_confirmed_at||data.user.id!==session.user_id)throw new CustomerInputError('Sign in again to change your password.');
  const access=await customerAccess(data.user,session.managed_revision,true);
  if(!access.allowed||!access.pending)throw new CustomerInputError('This account cannot use this password-change request.');
  if(typeof body.password!=='string'||body.password.length<12||body.password.length>128||body.password!==body.confirmation)throw new CustomerInputError('Use matching passwords of 12–128 characters.');
  if(typeof body.currentPassword!=='string'||!body.currentPassword||body.currentPassword.length>128||body.currentPassword===body.password)throw new CustomerInputError('Enter your temporary password and choose a different new password.');
  const check=await authClient().auth.signInWithPassword({email:data.user.email!,password:body.currentPassword});
  if(check.error||check.data.user?.id!==session.user_id)throw new CustomerInputError('The temporary password is incorrect.');
  const claim=await getDb().prepare("UPDATE managed_customers SET status='changing',updated_at=? WHERE user_id=? AND revision=? AND status='active' AND must_change=1 RETURNING user_id").bind(Date.now(),session.user_id,session.managed_revision).first();
  if(!claim)throw new CustomerInputError('This account changed. Sign in again.');
  try{
    const result=await manager().updateUserById(session.user_id,{password:body.password});
    if(result.error)throw new CustomerInputError('Password could not be saved. Choose a stronger password and try again.');
    const done=await getDb().prepare("UPDATE managed_customers SET must_change=0,status='active',revision=revision+1,updated_at=? WHERE user_id=? AND revision=? AND status='changing' RETURNING user_id").bind(Date.now(),session.user_id,session.managed_revision).first();
    if(!done)throw new CustomerInputError('Access changed while saving. Contact the administrator before signing in.');
    await getDb().prepare('DELETE FROM customer_sessions WHERE user_id=?').bind(session.user_id).run();
  }catch(e){
    await getDb().prepare("UPDATE managed_customers SET status='active' WHERE user_id=? AND revision=? AND status='changing'").bind(session.user_id,session.managed_revision).run();
    throw e;
  }
}
