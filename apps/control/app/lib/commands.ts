import { createClient } from '@supabase/supabase-js';
import { env } from './server';

/*
 * كل قدرة في اللوحة معرّفة هنا فقط. الذكاء يختار منها ويعبّي معاملاتها، ولا يكتب أوامر حرة.
 * risk: read = تنفيذ مباشر | confirm = يحتاج ضغطة تأكيد منك
 */
export type Risk = 'read' | 'confirm';
export type Cmd = {
  name: string; risk: Risk; desc: string;
  params: { name: string; type: 'string' | 'number' | 'boolean'; required?: boolean; desc: string }[];
  run: (p: Record<string, any>) => Promise<string>;
};

const db = () => createClient(env.supabaseUrl, env.supabaseService, { auth: { persistSession: false } });

const vercel = async (path: string, init: RequestInit = {}) => {
  if (!env.vercelToken) throw new Error('VERCEL_TOKEN غير مضبوط');
  const sep = path.includes('?') ? '&' : '?';
  const url = `https://api.vercel.com${path}${env.vercelTeamId ? `${sep}teamId=${env.vercelTeamId}` : ''}`;
  const r = await fetch(url, { ...init, headers: { Authorization: `Bearer ${env.vercelToken}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Vercel ${r.status}: ${j?.error?.message ?? 'خطأ'}`);
  return j;
};

export const COMMANDS: Cmd[] = [
  {
    name: 'status', risk: 'read', desc: 'حالة المنصة والأرقام',
    params: [],
    run: async () => {
      const c = db();
      const count = async (t: string) => (await c.from(t).select('*', { count: 'exact', head: true })).count ?? 0;
      const [users, videos, live] = await Promise.all([count('profiles'), count('videos'), (await c.from('rooms').select('*', { count: 'exact', head: true }).eq('is_live', true)).count ?? 0]);
      const { data: s } = await c.from('app_settings').select('maintenance').eq('id', 1).maybeSingle();
      return `المستخدمين: ${users}\nالفيديوهات: ${videos}\nبثوث حية: ${live}\nوضع الصيانة: ${s?.maintenance ? 'مفعّل' : 'مطفّأ'}`;
    },
  },
  {
    name: 'maintenance', risk: 'confirm', desc: 'تشغيل أو إيقاف وضع الصيانة',
    params: [{ name: 'on', type: 'boolean', required: true, desc: 'true للتشغيل، false للإيقاف' }],
    run: async (p) => {
      const { error } = await db().from('app_settings').update({ maintenance: !!p.on }).eq('id', 1);
      if (error) throw error;
      return `وضع الصيانة: ${p.on ? 'مفعّل' : 'مطفّأ'}`;
    },
  },
  {
    name: 'redeploy', risk: 'confirm', desc: 'نشر المنصة من جديد (يمسح الكاش ويعيد البناء)',
    params: [],
    run: async () => {
      if (!env.deployHook) throw new Error('DEPLOY_HOOK_URL غير مضبوط');
      const r = await fetch(env.deployHook, { method: 'POST' });
      if (!r.ok) throw new Error('فشل تشغيل النشر ' + r.status);
      return 'بدأ النشر. أرسلت لك إشعاراً عند الانتهاء إذا NTFY مفعّل.';
    },
  },
  {
    name: 'set_env', risk: 'confirm', desc: 'تعيين متغير بيئة في Vercel للإنتاج',
    params: [
      { name: 'key', type: 'string', required: true, desc: 'اسم المتغير بحروف إنجليزية وشرطة سفلية' },
      { name: 'value', type: 'string', required: true, desc: 'القيمة' },
    ],
    run: async (p) => {
      if (!/^[A-Z][A-Z0-9_]{1,63}$/.test(p.key)) throw new Error('اسم المتغير غير صالح');
      if (p.key === 'SUPABASE_SERVICE_ROLE_KEY' || p.key === 'VERCEL_TOKEN') throw new Error('هذا المتغير محمي ولا يُعدّل من اللوحة');
      await vercel(`/v10/projects/${env.vercelProjectId}/env?upsert=true`, {
        method: 'POST', body: JSON.stringify({ key: p.key, value: p.value, type: 'encrypted', target: ['production'] }),
      });
      return `تم تعيين ${p.key} للإنتاج. يحتاج نشر جديد ليسري.`;
    },
  },
  {
    name: 'notify', risk: 'read', desc: 'إرسال إشعار لجوالك',
    params: [{ name: 'text', type: 'string', required: true, desc: 'نص الإشعار' }],
    run: async (p) => {
      if (!env.ntfyTopic) throw new Error('NTFY_TOPIC غير مضبوط');
      await fetch(`https://ntfy.sh/${env.ntfyTopic}`, { method: 'POST', body: String(p.text).slice(0, 300), headers: { Title: 'Jo1' } });
      return 'تم إرسال الإشعار';
    },
  },
];

export const findCmd = (n: string) => COMMANDS.find(c => c.name === n);

export function checkParams(cmd: Cmd, p: Record<string, any>): string | null {
  for (const d of cmd.params) {
    const v = p?.[d.name];
    if (d.required && (v === undefined || v === null || v === '')) return `الحقل ${d.name} مطلوب`;
    if (v !== undefined && d.type === 'boolean' && typeof v !== 'boolean') return `الحقل ${d.name} لازم يكون true أو false`;
    if (v !== undefined && d.type === 'string' && (typeof v !== 'string' || v.length > 500)) return `الحقل ${d.name} غير صالح`;
  }
  return null;
}
