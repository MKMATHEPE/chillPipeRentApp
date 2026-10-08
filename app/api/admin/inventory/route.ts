import { getDb } from '../../../../db';
import { AUTH_HEADERS, sameOrigin, verifyAdmin } from '../../../../lib/admin-auth';
import { ensureInventory, heldSql, inventorySnapshot } from '../../../../lib/inventory-server';
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: AUTH_HEADERS });
async function denied(request: Request) {
  try { return await verifyAdmin(request.headers.get('cookie')) ? null : reply({error:'Admin sign-in required.'},401); }
  catch { return reply({error:'Admin access temporarily unavailable.'},503); }
}
export async function GET(request: Request) {
  const rejection = await denied(request); if (rejection) return rejection;
  try { await ensureInventory(); return reply(await inventorySnapshot()); }
  catch { console.error('inventory_read_failed'); return reply({error:'Inventory unavailable. Please retry.'},503); }
}
export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return reply({error:'Request not allowed.'},403);
  const rejection = await denied(request); if (rejection) return rejection;
  let body: any;
  try { body = await request.json(); } catch { return reply({error:'Invalid request.'},400); }
  if (!body || !['classic','premium','stove','tongs'].includes(body.id) ||
    ![body.total,body.unavailable,body.version].every(n => Number.isSafeInteger(n) && n >= 0) ||
    body.total > 9999 || body.unavailable > body.total ||
    (body.id === 'tongs' ? body.price !== null : typeof body.price !== 'number' || !Number.isFinite(body.price) || body.price <= 0 || body.price > 999999 || Math.abs(body.price*100-Math.round(body.price*100)) > 0.00001))
    return reply({error:'Enter valid whole stock quantities and a valid price.'},400);
  try {
    await ensureInventory();
    const updated = await getDb().prepare(`UPDATE equipment SET total=?,unavailable=?,price=?,version=version+1 WHERE id=? AND version=? AND ?-? >= ${heldSql} RETURNING id`)
      .bind(body.total,body.unavailable,body.price === null ? null : Math.round(body.price*100),body.id,body.version,body.total,body.unavailable).first();
    if (!updated) return reply({error:'Stock changed or these quantities are below reserved/out equipment. Refresh and review before saving.'},409);
    return reply({ok:true,...await inventorySnapshot()});
  } catch { console.error('inventory_update_failed'); return reply({error:'Could not save inventory. Refresh to check before retrying.'},503); }
}
