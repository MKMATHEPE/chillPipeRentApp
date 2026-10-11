import {AUTH_HEADERS,verifyAdmin,sameOrigin,allowLogin} from '../../../../lib/admin-auth';
import {recoveryBody} from '../../../../lib/admin-recovery';
import {testCustomersEnabled,listTestCustomers,manageTestCustomer} from '../../../../lib/test-customers';
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:AUTH_HEADERS});
export async function GET(request:Request){
  if(!testCustomersEnabled)return reply({error:'Not found.'},404);
  try{
    if(!await verifyAdmin(request.headers.get('cookie')))return reply({error:'Sign in as administrator.'},401);
    return reply({customers:await listTestCustomers()});
  }catch{return reply({error:'Test customers unavailable. Please retry.'},503);}
}
export async function POST(request:Request){
  if(!testCustomersEnabled)return reply({error:'Not found.'},404);
  if(!sameOrigin(request))return reply({error:'Request not allowed.'},403);
  try{
    if(!await verifyAdmin(request.headers.get('cookie')))return reply({error:'Sign in as administrator.'},401);
    if(!await allowLogin(request,'manage-test-customers',30,600000))return reply({error:'Too many changes. Try again later.'},429);
    const body=await recoveryBody(request);if(!body||Array.isArray(body))return reply({error:'Invalid request.'},400);
    await manageTestCustomer(body);return reply({ok:true});
  }catch(error){return reply({error:error instanceof Error?error.message:'Could not update test customer.'},400);}
}
