// Build step for self-hosting: index.html carries the cloud Supabase address and public key; swap in the ones given at build time.
// Runs only when both SUPABASE_URL and SUPABASE_ANON_KEY are set, so a plain build (GitHub Pages, Vercel) keeps the original.
import fs from 'node:fs';
const { SUPABASE_URL: url, SUPABASE_ANON_KEY: key } = process.env;
if (!url || !key) { console.log('use-supabase: SUPABASE_URL / SUPABASE_ANON_KEY not set, leaving index.html as is'); process.exit(0); }
const f = process.argv[2]; let s = fs.readFileSync(f, 'utf8');
const a = s.replace(/url:\s*'https:\/\/[a-z0-9]+\.supabase\.co'/, `url: '${url}'`).replace(/key:\s*'sb_publishable_[A-Za-z0-9_\-]+'/, `key: '${key}'`);
if (a === s) { console.error('use-supabase: Supabase settings not found in index.html'); process.exit(1); }
fs.writeFileSync(f, a); console.log('use-supabase: index.html now points at', url);
