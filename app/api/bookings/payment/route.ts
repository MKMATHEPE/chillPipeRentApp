import { getDb } from '../../../../db';
import { verifyCustomer,AUTH_HEADERS } from '../../../../lib/customer-auth';
import { sameOrigin } from '../../../../lib/admin-auth';
export async function POST(request:Request){
  const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:AUTH_HEADERS});
  if(!sameOrigin(request))return reply({error:'Request not allowed.'},403);
  try{
    const {reference,phone,method}=await request.json() as Record<string,string>;
    if(!reference||!phone)return reply({error:'Missing booking details.'},400);
    const owner=await getDb().prepare('SELECT customer_user_id FROM bookings WHERE reference=? AND phone=?').bind(reference,phone).first<{customer_user_id:string|null}>();
    if(owner?.customer_user_id){const account=await verifyCustomer(request.headers.get('cookie'));if(!account)return reply({error:'Sign in to continue.'},401);if(account.id!==owner.customer_user_id)return reply({error:'Booking not found.'},404);}
    const result=await getDb().prepare(`UPDATE bookings SET status='payment_review',payment_method=?,updated_at=?,version=version+1 WHERE reference=? AND phone=? AND status='approved'`).bind(method==='yoco'?'yoco':'eft',Date.now(),reference,phone).run();
    if(!result.meta.changes)return reply({error:'Booking is not ready for payment.'},409);
    return reply({ok:true,status:'payment_review'});
  }catch{console.error('payment_notification_failed');return reply({error:'Payment notification failed.'},500);}
}
