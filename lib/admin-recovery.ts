import { env } from 'cloudflare:workers';
export function recoveryConfig() {
  const values = env as unknown as { ADMIN_EMAIL?: string; ADMIN_RESET_URL?: string };
  if (!values.ADMIN_EMAIL || !values.ADMIN_RESET_URL) throw new Error('Recovery unavailable');
  const url = new URL(values.ADMIN_RESET_URL);
  if (url.protocol !== 'https:' || url.pathname !== '/admin-reset' || url.search || url.hash) throw new Error('Invalid recovery destination');
  return { email: values.ADMIN_EMAIL.toLowerCase(), redirectTo: url.href };
}
export async function recoveryBody(request: Request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new Error('Invalid request');
  const reader = request.body?.getReader(); if (!reader) throw new Error('Invalid request');
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) { const {done,value} = await reader.read(); if(done)break; size += value.length; if(size>16384){await reader.cancel();throw new Error('Invalid request');} chunks.push(value); }
  const bytes = new Uint8Array(size); let offset=0; for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  return JSON.parse(new TextDecoder().decode(bytes)) as Record<string,unknown>;
}
