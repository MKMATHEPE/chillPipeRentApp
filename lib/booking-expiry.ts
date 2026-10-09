import { getDb } from '../db';

// Unzoned rental dates are South Africa local time, just like inventory windows.
export const rentalStartSql = `unixepoch(CASE WHEN substr(rental_date,-1) IN ('Z','z') OR substr(rental_date,-6,1) IN ('+','-') THEN rental_date ELSE rental_date||'+02:00' END)`;
export async function expirePendingBookings() {
  // One atomic transition; refreshes cannot duplicate events or expire approved rentals.
  await getDb().prepare(`UPDATE bookings SET status='expired',version=version+1,
    updated_at=${rentalStartSql}*1000,
    activity_json=json_insert(CASE WHEN json_valid(activity_json) THEN activity_json ELSE '[]' END,'$[#]',json_object('label','Request expired','at',${rentalStartSql}*1000))
    WHERE status='awaiting_review' AND ${rentalStartSql} <= ?`)
    .bind(Math.floor(Date.now()/1000)).run();
}
