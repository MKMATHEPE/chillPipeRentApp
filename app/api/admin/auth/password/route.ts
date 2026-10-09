import { getDb } from '../../../../../db';
import { allowLogin, authClient, AUTH_HEADERS, sameOrigin, sessionCookie, verifyAdmin } from '../../../../../lib/admin-auth';
import { recoveryBody } from '../../../../../lib/admin-recovery';
export async function POST(request: Request) {
  const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:AUTH_HEADERS});
  if (!sameOrigin(request)) return reply({error:'Request not allowed.'},403);
  try {
    const session=await verifyAdmin(request.headers.get('cookie'));
    if (!session?.email) return reply({error:'Please sign in again.'},401);
    if (!await allowLogin(request,'change-password',5)) return reply({error:'Too many attempts. Please try again in 10 minutes.'},429);
    let body;try { body=await recoveryBody(request); } catch { return reply({error:'Invalid request.'},400); }
    if (!body || typeof body.currentPassword!=='string' || !body.currentPassword || body.currentPassword.length>128 || typeof body.password!=='string' || body.password.length<12 || body.password.length>128)
      return reply({error:'Enter your current password and a new password of 12–128 characters.'},400);
    if (body.password===body.currentPassword) return reply({error:'Choose a different password.'},400);
    const client=authClient();
    const {data,error}=await client.auth.signInWithPassword({email:session.email,password:body.currentPassword});
    if (error || data.user?.id!==session.id || !data.user.email_confirmed_at || !data.session)
      return reply({error:error && (error.status ?? 0)>=500 ? 'Password verification is temporarily unavailable.' : 'Your current password could not be verified.'},error && (error.status ?? 0)>=500 ? 503 : 400);
    try {
      const updated=await client.auth.updateUser({password:body.password});
      if (updated.error) return reply({error:'Could not change your password. Choose a stronger, different password or use a reset email.'},(updated.error.status ?? 0)>=500 ? 503 : 400);
      await getDb().prepare('DELETE FROM admin_sessions WHERE user_id=?').bind(session.id).run();
      return Response.json({ok:true},{headers:{...AUTH_HEADERS,'Set-Cookie':sessionCookie(request,'',0)}});
    } finally {
      await client.auth.signOut({scope:'local'}).catch(() => undefined);
    }
  } catch {
    return reply({error:'Could not complete the request. If the password changed, sign in with your new password; otherwise use a reset email.'},503);
  }
}
