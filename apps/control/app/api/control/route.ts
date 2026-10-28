import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { env } from '../../lib/server';
import { COMMANDS, findCmd, checkParams } from '../../lib/commands';

export const runtime = 'nodejs';

// يتحقق أن المتصل هو الأدمن الوحيد المسموح (بريد من ADMIN_EMAIL) بتوكن Supabase صالح
async function authorize(req: Request): Promise<boolean> {
  const jwt = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!jwt || !env.adminEmail) return false;
  const c = createClient(env.supabaseUrl, env.supabaseAnon, { global: { headers: { Authorization: `Bearer ${jwt}` } }, auth: { persistSession: false } });
  const { data } = await c.auth.getUser(jwt);
  return (data.user?.email ?? '').toLowerCase() === env.adminEmail;
}

async function plan(text: string): Promise<{ command: string; params: Record<string, any>; reason: string } | { error: string }> {
  if (!env.anthropicKey) return { error: 'ANTHROPIC_API_KEY غير مضبوط' };
  const catalog = COMMANDS.map(c => ({ name: c.name, risk: c.risk, desc: c.desc, params: c.params }));
  const system = `حوّل طلب الأدمن العربي إلى أمر واحد من القائمة فقط. لا تقترح SQL ولا أوامر نظام ولا روابط.
إذا لا يطابق أي أمر، أرجع command فارغ. أرجع JSON فقط: {"command":"","params":{},"reason":""}
القائمة: ${JSON.stringify(catalog)}`;
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': env.anthropicKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: env.anthropicModel, max_tokens: 300, system, messages: [{ role: 'user', content: text }] }),
  });
  if (!r.ok) return { error: 'فشل الاتصال بالذكاء الاصطناعي ' + r.status };
  const d = await r.json();
  const raw = (d.content ?? []).map((b: any) => b.text ?? '').join('').replace(/```json|```/g, '').trim();
  try { const j = JSON.parse(raw); return { command: String(j.command ?? ''), params: j.params ?? {}, reason: String(j.reason ?? '') }; }
  catch { return { error: 'رد غير صالح' }; }
}

export async function POST(req: Request) {
  if (!(await authorize(req))) return new NextResponse('FORBIDDEN', { status: 403 });
  const body = await req.json().catch(() => ({}));

  // تنفيذ بعد التأكيد: الطلب يحمل اسم الأمر والمعاملات كما وافقت عليها بالضبط
  if (body.confirm) {
    const cmd = findCmd(body.confirm.command);
    if (!cmd) return NextResponse.json({ ok: false, output: 'أمر غير معروف' }, { status: 400 });
    const err = checkParams(cmd, body.confirm.params);
    if (err) return NextResponse.json({ ok: false, output: err }, { status: 400 });
    try {
      return NextResponse.json({ ok: true, output: await cmd.run(body.confirm.params) });
    } catch (e: any) {
      return NextResponse.json({ ok: false, output: String(e?.message ?? e) }, { status: 500 });
    }
  }

  const text = String(body.text ?? '').slice(0, 500).trim();
  if (!text) return NextResponse.json({ ok: false, output: 'اكتب أمرك' }, { status: 400 });
  const p = await plan(text);
  if ('error' in p) return NextResponse.json({ ok: false, output: p.error }, { status: 502 });
  const cmd = findCmd(p.command);
  if (!cmd) return NextResponse.json({ ok: false, output: p.reason || 'ما في أمر مطابق' });
  const err = checkParams(cmd, p.params);
  if (err) return NextResponse.json({ ok: false, output: err }, { status: 400 });

  if (cmd.risk === 'read') {
    try { return NextResponse.json({ ok: true, output: await cmd.run(p.params) }); }
    catch (e: any) { return NextResponse.json({ ok: false, output: String(e?.message ?? e) }, { status: 500 }); }
  }
  return NextResponse.json({ ok: true, needsConfirm: true, plan: { command: cmd.name, params: p.params, desc: cmd.desc, reason: p.reason } });
}
