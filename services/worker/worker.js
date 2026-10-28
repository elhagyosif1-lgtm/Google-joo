// Jo1 transcoder worker: يلاقي الفيديوهات pending، يحوّلها HLS، يرفعها، ويفعّل hls_url.
// يشتغل على أي سيرفر فيه ffmpeg (Dockerfile مرفق). لا تضع SERVICE_ROLE في الواجهة أبدًا.
const { createClient } = require('@supabase/supabase-js');
const { transcode } = require('./transcode');
const fs = require('fs'), os = require('os'), path = require('path');

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) { console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY مطلوبين'); process.exit(1); }
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const BUCKET = 'videos', TYPES = { '.m3u8': 'application/vnd.apple.mpegurl', '.ts': 'video/mp2t' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
let stop = false;
['SIGTERM', 'SIGINT'].forEach(s => process.on(s, () => { stop = true; }));

async function claim() {
  const { data: next, error } = await sb.from('videos').select('id').eq('status', 'pending').order('id').limit(1);
  if (error) throw error;
  if (!next?.length) return null;
  // claim ذري: لو worker تاني سبقني مش هيرجع صف
  const { data, error: e2 } = await sb.from('videos').update({ status: 'processing' }).eq('id', next[0].id).eq('status', 'pending').select('id,user_id,url');
  if (e2) throw e2;
  return data?.[0] ?? null;
}

async function upload(file, dest) {
  const body = fs.readFileSync(file), contentType = TYPES[path.extname(file)] ?? 'application/octet-stream';
  for (let i = 1; ; i++) {
    const { error } = await sb.storage.from(BUCKET).upload(dest, body, { contentType, upsert: true, cacheControl: '31536000' });
    if (!error) return;
    if (i >= 3) throw error;
    await sleep(1000 * i);
  }
}

async function handle(v) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jo1-'));
  console.log(`[${v.id}] start`);
  try {
    const res = await fetch(v.url);
    if (!res.ok) throw new Error(`download ${res.status}`);
    const input = path.join(dir, 'input'); fs.writeFileSync(input, Buffer.from(await res.arrayBuffer()));
    const out = path.join(dir, 'out'), t = await transcode(input, out);
    const base = `${v.user_id}/hls/${v.id}`;
    for (const f of t.files) await upload(path.join(out, f), `${base}/${f}`);
    const { data } = sb.storage.from(BUCKET).getPublicUrl(`${base}/master.m3u8`);
    const { error } = await sb.from('videos').update({ hls_url: data.publicUrl, duration: t.duration, status: 'ready' }).eq('id', v.id);
    if (error) throw error;
    console.log(`[${v.id}] ready (${t.variants.map(x => x.name).join('+')})`);
  } catch (e) {
    console.error(`[${v.id}] failed:`, e.message);
    await sb.from('videos').update({ status: 'failed' }).eq('id', v.id); // الفيديو يفضل يشتغل من mp4 الأصلي
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

(async () => {
  await sb.from('videos').update({ status: 'pending' }).eq('status', 'processing'); // استرجاع اللي وقف في النص (worker واحد)
  console.log('worker up');
  while (!stop) {
    try { const v = await claim(); if (v) await handle(v); else await sleep(5000); }
    catch (e) { console.error('loop error:', e.message); await sleep(10000); }
  }
})();
