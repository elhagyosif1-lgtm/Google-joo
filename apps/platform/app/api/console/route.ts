import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { COMMANDS, findCommand, validateParams } from '../../lib/console-commands';
import { adminDb } from '../../lib/admin-server';

export const runtime = 'nodejs';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

async function askPlanner(text: string): Promise<{ command: string; params: Record<string, any>; reason: string } | { error: string }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { error: 'ANTHROPIC_API_KEY غير مضبوط في Vercel' };
  const catalog = COMMANDS.map(c => ({
    name: c.name, risk: c.risk, desc: c.desc,
    params: c.params.map(p => ({ name: p.name, type: p.type, required: !!p.required, desc: p.desc })),
  }));
  const system = `أنت مساعد أدمن عربي لمنصة Jo1. مهمتك تحويل طلب الأدمن إلى أمر واحد من القائمة فقط.
القواعد:
- اختر أمراً من القائمة حصراً. لا تقترح SQL ولا أوامر نظام.
- إذا الطلب لا يطابق أي أمر، أرجع command فارغ واشرح السبب.
- أرجع JSON فقط بدون أي نص قبله أو بعده، بالشكل: {"command":"اسم","params":{...},"reason":"سبب قصير بالعربية"}
القائمة:
${JSON.stringify(catalog)}`;
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens: 400, system, messages: [{ role: 'user', content: text }] }),
  });
  if (!r.ok) return { error: 'تعذّر الاتصال بالذكاء الاصطناعي (' + r.status + ')' };
  const data = await r.json();
  const raw = (data.content ?? []).map((b: any) => b.text ?? '').join('').replace(/```json|```/g, '').trim();
  try {
    const j = JSON.parse(raw);
    return { command: String(j.command ?? ''), params: j.params ?? {}, reason: String(j.reason ?? '') };
  } catch {
    return { error: 'الرد ما كان JSON صالح' };
  }
}

async function audit(db: any, row: Record<string, any>) {
  await db.from('admin_audit').insert(row);
}

export async function POST(req: Request) {
  const jwt = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!jwt) return new NextResponse('AUTH_REQUIRED', { status: 401 });

  // تحقق الأدمن بالتوكن الخاص بالمستخدم (RLS)، ثم نستخدم service role للتنفيذ
  const userDb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${jwt}` } }, auth: { persistSession: false },
  });
  const { data: u } = await userDb.auth.getUser(jwt);
  if (!u.user) return new NextResponse('AUTH_REQUIRED', { status: 401 });
  const { data: me } = await userDb.from('profiles').select('is_admin').eq('id', u.user.id).maybeSingle();
  if (!me?.is_admin) return new NextResponse('NOT_ADMIN', { status: 403 });

  const db = adminDb();
  const body = await req.json().catch(() => ({}));
  const text: string = String(body.text ?? '').slice(0, 500).trim();

  // تنفيذ أمر مؤكَّد (من خطوة التأكيد)
  if (body.confirm) {
    const cmd = findCommand(body.confirm.command);
    if (!cmd) return NextResponse.json({ ok: false, output: 'أمر غير معروف' }, { status: 400 });
    const err = validateParams(cmd, body.confirm.params);
    if (err) return NextResponse.json({ ok: false, output: err }, { status: 400 });
    if (cmd.risk === 'danger' && String(body.confirm.reason ?? '').trim().length < 4)
      return NextResponse.json({ ok: false, output: 'الأوامر الخطرة تحتاج سبباً مكتوباً' }, { status: 400 });
    try {
      const out = await cmd.run(db, body.confirm.params);
      await audit(db, { admin_id: u.user.id, input: text || cmd.name, command: cmd.name, params: body.confirm.params, risk: cmd.risk, status: 'executed', result: out.slice(0, 1000) });
      return NextResponse.json({ ok: true, output: out });
    } catch (e: any) {
      await audit(db, { admin_id: u.user.id, input: text || cmd.name, command: cmd.name, params: body.confirm.params, risk: cmd.risk, status: 'failed', result: String(e?.message ?? e).slice(0, 500) });
      return NextResponse.json({ ok: false, output: String(e?.message ?? e) }, { status: 500 });
    }
  }

  // تخطيط الأمر من النص
  if (!text) return NextResponse.json({ ok: false, output: 'اكتب أمرك' }, { status: 400 });
  const plan = await askPlanner(text);
  if ('error' in plan) return NextResponse.json({ ok: false, output: plan.error }, { status: 502 });
  if (!plan.command) {
    await audit(db, { admin_id: u.user.id, input: text, status: 'blocked', result: plan.reason });
    return NextResponse.json({ ok: false, output: plan.reason || 'ما قدرت أفهم الأمر على أنه أمر مدعوم' });
  }
  const cmd = findCommand(plan.command);
  if (!cmd) {
    await audit(db, { admin_id: u.user.id, input: text, command: plan.command, status: 'blocked', result: 'unknown command' });
    return NextResponse.json({ ok: false, output: 'الأمر غير مدعوم: ' + plan.command });
  }
  const err = validateParams(cmd, plan.params);
  if (err) return NextResponse.json({ ok: false, output: err, plan: { command: cmd.name, params: plan.params } }, { status: 400 });

  if (cmd.risk === 'read') {
    try {
      const out = await cmd.run(db, plan.params);
      await audit(db, { admin_id: u.user.id, input: text, command: cmd.name, params: plan.params, risk: 'read', status: 'executed', result: out.slice(0, 1000) });
      return NextResponse.json({ ok: true, output: out, plan: { command: cmd.name, params: plan.params, reason: plan.reason } });
    } catch (e: any) {
      await audit(db, { admin_id: u.user.id, input: text, command: cmd.name, params: plan.params, risk: 'read', status: 'failed', result: String(e?.message ?? e).slice(0, 500) });
      return NextResponse.json({ ok: false, output: String(e?.message ?? e) }, { status: 500 });
    }
  }

  // أوامر الكتابة والخطر: نرجع الخطة للأدمن ولا ننفذ بدون تأكيد
  await audit(db, { admin_id: u.user.id, input: text, command: cmd.name, params: plan.params, risk: cmd.risk, status: 'planned', result: plan.reason });
  return NextResponse.json({ ok: true, needsConfirm: true, output: `خطة: ${cmd.desc}`, plan: { command: cmd.name, params: plan.params, reason: plan.reason, risk: cmd.risk, desc: cmd.desc } });
}

export async function GET() {
  return NextResponse.json({ commands: COMMANDS.map(c => ({ name: c.name, risk: c.risk, desc: c.desc, params: c.params })) });
}
