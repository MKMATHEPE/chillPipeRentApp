import { AUTH_HEADERS, revokeSession, sameOrigin, sessionCookie } from '../../../../../lib/admin-auth';
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({error:'Request not allowed.'},{status:403,headers:AUTH_HEADERS});
  try { await revokeSession(request.headers.get('cookie')); }
  catch { return Response.json({error:'Could not sign out. Please try again.'},{status:503,headers:AUTH_HEADERS}); }
  return Response.json({ok:true},{headers:{...AUTH_HEADERS,'Set-Cookie':sessionCookie(request,'',0)}});
}
