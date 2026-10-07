import { getDb } from '../../../../../db';
import { allowLogin, authClient, authConfig, AUTH_HEADERS, digest, sameOrigin, sessionCookie } from '../../../../../lib/admin-auth';
import { recoveryBody } from '../../../../../lib/admin-recovery';
export async function POST(request:Request) {
  const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:AUTH_HEADERS});
  if(!sameOrigin(request))return reply({error:'Request not allowed.'},403);
  let body;try{body=await recoveryBody(request);}catch{return reply({error:'Invalid request.'},400);}
  if(!body || typeof body.accessToken!=='string' || body.accessToken.length>8192 || !body.accessToken)return reply({error:'Open a fresh password link from your email.'},401);
  if(typeof body.password!=='string' || body.password.length<12 || body.password.length>128)return reply({error:'Use a password between 12 and 128 characters.'},400);
  try {
    if(!await allowLogin(request,'recovery-password'))return reply({error:'Too many attempts. Please try again in 10 minutes.'},429);
    const {data,error}=await authClient().auth.getUser(body.accessToken);
    if(error || data.user?.id!==authConfig().ADMIN_USER_ID || !data.user.email_confirmed_at)return reply({error:'This link is invalid or expired. Request a new password link.'},401);
    // Atomically consume each validated bearer token once, including concurrent submissions.
    const bucket='recovery-used:'+await digest(body.accessToken);
    const claimed=await getDb().prepare('INSERT INTO admin_login_limits(bucket,attempts,expires_at) VALUES (?,1,?) ON CONFLICT(bucket) DO NOTHING RETURNING bucket').bind(bucket,Date.now()+86400000).first();
    if(!claimed)return reply({error:'This link has already been used. Request a new password link.'},401);
    const config=authConfig();
    // Same verified REST operation used by Supabase auth.updateUser, without persisting a browser session.
    const result=await fetch(config.SUPABASE_URL+'/auth/v1/user',{method:'PUT',headers:{apikey:config.SUPABASE_PUBLISHABLE_KEY,Authorization:'Bearer '+body.accessToken,'Content-Type':'application/json'},body:JSON.stringify({password:body.password}),signal:AbortSignal.timeout(10000),cache:'no-store'});
    if(!result.ok){
      await getDb().prepare('DELETE FROM admin_login_limits WHERE bucket=?').bind(bucket).run();
      return reply({error:result.status===422?'Choose a different, stronger password.':'Could not update your password. Request a fresh link and try again.'},result.status>=500?503:400);
    }
    await getDb().prepare('DELETE FROM admin_sessions WHERE user_id=?').bind(data.user.id).run();
    return Response.json({ok:true},{headers:{...AUTH_HEADERS,'Set-Cookie':sessionCookie(request,'',0)}});
  }catch{return reply({error:'The request could not be completed. If your password was saved, sign in; otherwise request a fresh link.'},503);}
}
