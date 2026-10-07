import { AUTH_HEADERS, verifyAdmin } from '../../../../../lib/admin-auth';
export async function GET(request: Request) {
  try { const session=await verifyAdmin(request.headers.get('cookie')); return Response.json(session ? {authenticated:true,expiresAt:session.expiresAt} : {authenticated:false},{status:session?200:401,headers:AUTH_HEADERS}); }
  catch { return Response.json({error:'Unable to verify your session. Please try again.'},{status:503,headers:AUTH_HEADERS}); }
}
