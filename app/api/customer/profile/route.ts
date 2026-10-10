import { getDb } from '../../../../db';
import { sameOrigin } from '../../../../lib/admin-auth';
import { recoveryBody } from '../../../../lib/admin-recovery';
import { AUTH_HEADERS,customerProfile,verifyCustomer } from '../../../../lib/customer-auth';
export async function PATCH(request:Request){
  const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:AUTH_HEADERS});
  if(!sameOrigin(request))return reply({error:'Request not allowed.'},403);
  try{
    const user=await verifyCustomer(request.headers.get('cookie'));if(!user)return reply({error:'Sign in to continue.'},401);
    let body;try{body=await recoveryBody(request);}catch{return reply({error:'Invalid profile.'},400);}
    const fields=['fullName','phone','location','alternativePhone'] as const;
    if(!body || fields.some(f=>typeof body[f]!=='string'))return reply({error:'Invalid profile.'},400);
    const {fullName,phone,location,alternativePhone}=body as Record<typeof fields[number],string>;
    if(!fullName.trim() || fullName.length>100 || !/^[+\d ()-]{7,40}$/.test(phone) || location.length>180 || (alternativePhone && !/^[+\d ()-]{7,40}$/.test(alternativePhone)))return reply({error:'Check your name, contact numbers and address.'},400);
    await getDb().prepare('UPDATE customer_profiles SET full_name=?,phone=?,location=?,alternative_phone=?,updated_at=? WHERE user_id=?').bind(fullName.trim(),phone.trim(),location.trim(),alternativePhone.trim(),Date.now(),user.id).run();
    return reply({profile:await customerProfile(user.id,user.email)});
  }catch{return reply({error:'Could not save your profile. Please retry.'},503);}
}
