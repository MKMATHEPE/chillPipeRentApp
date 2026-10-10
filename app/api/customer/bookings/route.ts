import { getDb } from '../../../../db';
import { AUTH_HEADERS,verifyCustomer } from '../../../../lib/customer-auth';
import { expirePendingBookings } from '../../../../lib/booking-expiry';
export async function GET(request:Request){
  const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:AUTH_HEADERS});
  try{
    const user=await verifyCustomer(request.headers.get('cookie'));if(!user)return reply({error:'Sign in to view your bookings.'},401);
    await expirePendingBookings();
    const cursor=Number(new URL(request.url).searchParams.get('before')) || Number.MAX_SAFE_INTEGER;
    const result=await getDb().prepare('SELECT id,reference,phone,status,rental_date AS rentalDate,rental_total+COALESCE(delivery_fee,0) AS total FROM bookings WHERE customer_user_id=? AND id<? ORDER BY id DESC LIMIT 21').bind(user.id,cursor).all();
    const rows=result.results || [];return reply({bookings:rows.slice(0,20),next:rows.length>20?rows[19].id:null});
  }catch{return reply({error:'Bookings are temporarily unavailable.'},503);}
}
