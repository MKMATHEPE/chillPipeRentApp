import { sites } from '@openai/sites-vite-plugin';
import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig } from 'vite';
import hostingConfig from './.openai/hosting.json';
import { resolve, dirname } from 'node:path';

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  '00000000-0000-4000-8000-000000000000';

const { d1, r2 } = hostingConfig;

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === 'seatbelt';

const localBindingConfig = {
  main: 'vinext/server/fetch-handler',
  compatibility_flags: ['nodejs_compat'],
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: 'site-creator-d1',
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: 'site-creator-r2',
        },
      ]
    : [],
};

export default defineConfig(async ({command}) => {
  const testCustomers = command === 'serve' && process.env.CP_LOCAL_TEST_CUSTOMERS === '1';
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= 'false';
  process.env.WRANGLER_LOG_PATH ??= '.wrangler/logs';
  process.env.MINIFLARE_REGISTRY_PATH ??= '.wrangler/registry';

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import('@cloudflare/vite-plugin');

  return {
    css: { postcss: { plugins: [tailwindcss()] } },
    server: testCustomers ? {host:'127.0.0.1',allowedHosts:[],watch:{usePolling:true}} : isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins: [
      ...(testCustomers ? [{name:'local-test-customers',enforce:'pre' as const,
        resolveId(source:string,importer?:string){
          if(source==='@/lib/test-customers' || (importer && source.startsWith('.') && resolve(dirname(importer.split('?')[0]),source).replace(/\.ts$/,'')===resolve('lib/test-customers')))
            return resolve('local/test-customers.ts');
        },
        configureServer(server:import('vite').ViteDevServer){
          server.middlewares.use((req,res,next)=>{
            if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress || '') || !/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host || '')){res.statusCode=403;res.end('Local test environment only.');return;}next();
          });
        }
      }] : []),
      vinext(),
      sites(),
      cloudflare({
        ...(testCustomers ? {persistState:{path:'.wrangler/test-customers'},remoteBindings:false} : {}),
        viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] },
        config: localBindingConfig,
      }),
    ],
  };
});
