import { allowLogin, authClient, AUTH_HEADERS, sameOrigin } from '../../../../../lib/admin-auth';
import { recoveryBody, recoveryConfig } from '../../../../../lib/admin-recovery';
export async function POST(request:Request) {
  const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:AUTH_HEADERS});
  if(!sameOrigin(request))return reply({error:'Request not allowed.'},403);
  let body;try{body=await recoveryBody(request);}catch{return reply({error:'Enter a valid email address.'},400);}
  if(!body || typeof body.email!=='string' || body.email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim()))return reply({error:'Enter a valid email address.'},400);
  try {
    if(!await allowLogin(request,'recovery-email',3,3600000))return reply({error:'Too many requests. Please try again in an hour.'},429);
    const config=recoveryConfig();
    if(body.email.trim().toLowerCase()===config.email){
      const {error}=await authClient().auth.resetPasswordForEmail(config.email,{redirectTo:config.redirectTo});
      if(error){console.warn('Password setup email failed',{code:error.code,status:error.status});return reply({error:error.status===429?'Please wait before requesting another email.':'The email could not be sent. Please try again later.'},error.status===429?429:503);}
    }
    return reply({ok:true,message:'If this is the administrator email, a password link will arrive shortly. Check your inbox and spam folder.'});
  }catch{return reply({error:'Password setup is temporarily unavailable. Please try again.'},503);}
}
