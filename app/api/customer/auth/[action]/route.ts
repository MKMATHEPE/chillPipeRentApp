import { getDb } from '../../../../../db';
import { allowLogin,authClient,authConfig,digest,sameOrigin } from '../../../../../lib/admin-auth';
import { recoveryBody,recoveryConfig } from '../../../../../lib/admin-recovery';
import { AUTH_HEADERS,customerCookie,customerProfile,revokeCustomer,startCustomer,verifyCustomer } from '../../../../../lib/customer-auth';
const reply=(body:unknown,status=200,headers={})=>Response.json(body,{status,headers:{...AUTH_HEADERS,...headers}});
const emailValue=(v:unknown)=>typeof v==='string' && v.length<=254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())?v.trim().toLowerCase():null;
// Use the configured production origin, never a submitted redirect or Host header.
const destination=(path:string)=>new URL(path,recoveryConfig().redirectTo).href;
export async function GET(request:Request){
  if(!new URL(request.url).pathname.endsWith('/session'))return reply({error:'Not found.'},404);
  try {const user=await verifyCustomer(request.headers.get('cookie'));return user?reply({profile:await customerProfile(user.id,user.email)}):reply({error:'Sign in to continue.'},401);}
  catch{return reply({error:'Account is temporarily unavailable. Please retry.'},503);}
}
export async function POST(request:Request){
  if(!sameOrigin(request))return reply({error:'Request not allowed.'},403);
  const action=new URL(request.url).pathname.split('/').pop();
  if(!['login','signup','logout','recover','reset','resend'].includes(action || ''))return reply({error:'Not found.'},404);
  try {
    if(action==='logout'){await revokeCustomer(request.headers.get('cookie'));return reply({ok:true},200,{'Set-Cookie':customerCookie(request,'',0)});}
    const sendsEmail=['signup','recover','resend'].includes(action!);
    if(!await allowLogin(request,'customer-'+action,sendsEmail?3:10,sendsEmail?3600000:600000))return reply({error:'Too many attempts. Please try again later.'},429);
    let body;try{body=await recoveryBody(request);}catch{return reply({error:'Invalid request.'},400);}
    if(!body || Array.isArray(body))return reply({error:'Invalid request.'},400);
    if(action==='reset'){
      if(typeof body.accessToken!=='string' || !body.accessToken || body.accessToken.length>8192)return reply({error:'Open a fresh password-reset link.'},401);
      if(typeof body.password!=='string' || body.password.length<12 || body.password.length>128)return reply({error:'Use 12–128 characters for your password.'},400);
      const {data,error}=await authClient().auth.getUser(body.accessToken);
      if(error || !data.user?.email_confirmed_at)return reply({error:'This link is invalid or expired.'},401);
      if(data.user.id===authConfig().ADMIN_USER_ID)return reply({error:'Use the administrator password-reset page for this account.'},403);
      const bucket='customer-reset-used:'+await digest(body.accessToken);
      const claimed=await getDb().prepare('INSERT INTO admin_login_limits(bucket,attempts,expires_at) VALUES (?,1,?) ON CONFLICT(bucket) DO NOTHING RETURNING bucket').bind(bucket,Date.now()+86400000).first();
      if(!claimed)return reply({error:'This link has already been used.'},401);
      const config=authConfig();
      const result=await fetch(config.SUPABASE_URL+'/auth/v1/user',{method:'PUT',headers:{apikey:config.SUPABASE_PUBLISHABLE_KEY,Authorization:'Bearer '+body.accessToken,'Content-Type':'application/json'},body:JSON.stringify({password:body.password}),signal:AbortSignal.timeout(10000),cache:'no-store'});
      if(!result.ok)return reply({error:'Could not save your password. Request a new link and try again.'},400);
      await getDb().prepare('DELETE FROM customer_sessions WHERE user_id=?').bind(data.user.id).run();
      return reply({ok:true},200,{'Set-Cookie':customerCookie(request,'',0)});
    }
    const email=emailValue(body.email);if(!email)return reply({error:'Enter a valid email address.'},400);
    const client=authClient();
    if(action==='recover' || action==='resend'){
      const result=action==='recover'?await client.auth.resetPasswordForEmail(email,{redirectTo:destination('/customer-reset')}):await client.auth.resend({type:'signup',email,options:{emailRedirectTo:destination('/customer-login')}});
      if(result.error)return reply({error:'The email could not be sent. Please wait and try again.'},result.error.status===429?429:503);
      return reply({ok:true,message:'If your account is eligible, an email will arrive shortly. Check your inbox and spam folder.'});
    }
    if(typeof body.password!=='string' || !body.password || body.password.length>128 || (action==='signup' && body.password.length<12))return reply({error:'Use a password between 12 and 128 characters.'},400);
    if(action==='signup'){
      if(typeof body.fullName!=='string' || !body.fullName.trim() || body.fullName.length>100 || typeof body.phone!=='string' || !/^[+\d ()-]{7,40}$/.test(body.phone))return reply({error:'Enter your full name and contact number.'},400);
      const {error}=await client.auth.signUp({email,password:body.password,options:{emailRedirectTo:destination('/customer-login'),data:{fullName:body.fullName.trim(),phone:body.phone.trim()}}});
      // Even auto-confirm projects require an explicit password login through our verified session boundary.
      if(error)return reply({error:error.status===429?'Please wait before requesting another email.':'Could not create the account. Try signing in or resetting your password.'},error.status===429?429:400);
      return reply({ok:true,message:'Check your email to confirm your account, then sign in. Already registered? Sign in or reset your password.'});
    }
    const {data,error}=await client.auth.signInWithPassword({email,password:body.password});
    if(error || !data.user?.email_confirmed_at || !data.session)return reply({error:'Unable to sign in. Check your details and confirm your email first.'},error?.status===429?429:401);
    const cookie=await startCustomer(request,data.user,data.session);
    return reply({ok:true,profile:await customerProfile(data.user.id,data.user.email || '')},200,{'Set-Cookie':cookie});
  }catch{console.error('customer_auth_unavailable');return reply({error:'Account service is temporarily unavailable. Please try again.'},503);}
}
