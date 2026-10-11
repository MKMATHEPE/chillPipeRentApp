import {AUTH_HEADERS,verifyAdmin,sameOrigin,allowLogin} from '../../../../lib/admin-auth';
import {recoveryBody} from '../../../../lib/admin-recovery';
import {managedAccountsEnabled,listManagedCustomers,manageCustomer,CustomerInputError} from '../../../../lib/customer-management';
import {testCustomersEnabled} from '../../../../lib/test-customers';
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:AUTH_HEADERS});
export async function GET(request:Request){
  if(testCustomersEnabled||!managedAccountsEnabled())return reply({error:'Not found.'},404);
  try{
    if(!await verifyAdmin(request.headers.get('cookie')))return reply({error:'Sign in as administrator.'},401);
    const page=Number(new URL(request.url).searchParams.get('page')||1);
    if(!Number.isSafeInteger(page)||page<1||page>10000)return reply({error:'Invalid page.'},400);
    return reply(await listManagedCustomers(page));
  }catch{return reply({error:'Customers are temporarily unavailable. Please retry.'},503);}
}
export async function POST(request:Request){
  if(testCustomersEnabled||!managedAccountsEnabled())return reply({error:'Not found.'},404);
  if(!sameOrigin(request))return reply({error:'Request not allowed.'},403);
  try{
    if(!await verifyAdmin(request.headers.get('cookie')))return reply({error:'Sign in as administrator.'},401);
    if(!await allowLogin(request,'manage-customers',20,600000))return reply({error:'Too many changes. Please wait and retry.'},429);
    let body;try{body=await recoveryBody(request);}catch{return reply({error:'Invalid request.'},400);}
    if(!body||Array.isArray(body))return reply({error:'Invalid request.'},400);
    await manageCustomer(body);return reply({ok:true});
  }catch(e){return e instanceof CustomerInputError?reply({error:e.message},400):reply({error:'Could not complete this change. Reload the list before retrying.'},503);}
}
