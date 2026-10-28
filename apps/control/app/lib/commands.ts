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

const findUser = async (username: string) => {
  const { data, error } = await db().from('profiles').select('id,username,coins,diamonds,bonus,is_admin,banned').eq('username', username).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`المستخدم ${username} غير موجود`);
  return data;
};

const setBan = async (username: string, banned: boolean) => {
  const u = await findUser(username);
  const { error } = await db().from('profiles').update({ banned }).eq('id', u.id);
  if (error) throw error;
  return banned ? `تم حظر @${u.username}` : `تم فك حظر @${u.username}`;
};

export const COMMANDS: Cmd[] = [
  {
    name: 'user_lookup', risk: 'read', desc: 'بيانات مستخدم بالاسم',
    params: [{ name: 'username', type: 'string', required: true, desc: 'اسم المستخدم' }],
    run: async (p) => {
      const u = await findUser(p.username);
      return `@${u.username}\nعملات: ${u.coins}\nألماس: ${u.diamonds}\nمكافأة: ${u.bonus}\nأدمن: ${u.is_admin ? 'نعم' : 'لا'}\nمحظور: ${u.banned ? 'نعم' : 'لا'}`;
    },
  },
  {
    name: 'stats', risk: 'read', desc: 'إحصائيات المنصة الكاملة',
    params: [],
    run: async () => {
      const c = db();
      const count = async (t: string, f?: (q: any) => any) => {
        let q = c.from(t).select('*', { count: 'exact', head: true });
        if (f) q = f(q);
        const { count } = await q; return count ?? 0;
      };
      const [users, videos, live, deps, wds] = await Promise.all([
        count('profiles'), count('videos'), count('rooms', q => q.eq('is_live', true)),
        count('deposits', q => q.eq('status', 'pending')), count('withdrawals', q => q.eq('status', 'pending')),
      ]);
      return `المستخدمين: ${users}\nالفيديوهات: ${videos}\nالبثوث الحية: ${live}\nإيداعات معلقة: ${deps}\nسحوبات معلقة: ${wds}`;
    },
  },
  {
    name: 'grant_coins', risk: 'confirm', desc: 'إضافة عملات لمستخدم',
    params: [
      { name: 'username', type: 'string', required: true, desc: 'اسم المستخدم' },
      { name: 'amount', type: 'number', required: true, desc: 'المبلغ (1 إلى 100000)' },
    ],
    run: async (p) => {
      const amount = Math.floor(Number(p.amount));
      if (!(amount >= 1 && amount <= 100000)) throw new Error('المبلغ خارج الحد المسموح');
      const c = db(); const u = await findUser(p.username);
      const { error } = await c.from('profiles').update({ coins: u.coins + amount }).eq('id', u.id);
      if (error) throw error;
      await c.from('ledger').insert({ user_id: u.id, kind: 'admin_coins', amount });
      return `تمت إضافة ${amount} عملة إلى @${u.username}`;
    },
  },
  {
    name: 'ban_user', risk: 'confirm', desc: 'حظر مستخدم (لا ينشر ولا يعلّق ولا يبث)',
    params: [{ name: 'username', type: 'string', required: true, desc: 'اسم المستخدم' }],
    run: async (p) => setBan(p.username, true),
  },
  {
    name: 'unban_user', risk: 'confirm', desc: 'فك حظر مستخدم',
    params: [{ name: 'username', type: 'string', required: true, desc: 'اسم المستخدم' }],
    run: async (p) => setBan(p.username, false),
  },
  {
    name: 'set_admin', risk: 'confirm', desc: 'منح أو سحب صلاحية الأدمن من مستخدم',
    params: [
      { name: 'username', type: 'string', required: true, desc: 'اسم المستخدم' },
      { name: 'on', type: 'boolean', required: true, desc: 'true لمنح الصلاحية، false لسحبها' },
    ],
    run: async (p) => {
      const u = await findUser(p.username);
      const { error } = await db().from('profiles').update({ is_admin: !!p.on }).eq('id', u.id);
      if (error) throw error;
      return `@${u.username} ${p.on ? 'صار أدمن' : 'ما عاد أدمن'}`;
    },
  },
  {
    name: 'delete_video', risk: 'confirm', desc: 'حذف فيديو بالمعرّف (نهائي)',
    params: [{ name: 'video_id', type: 'number', required: true, desc: 'معرّف الفيديو' }],
    run: async (p) => {
      const { error, count } = await db().from('videos').delete({ count: 'exact' }).eq('id', Number(p.video_id));
      if (error) throw error;
      return count ? `تم حذف الفيديو ${p.video_id}` : 'لم يُعثر على الفيديو';
    },
  },
  {
    name: 'pending_deposits', risk: 'read', desc: 'الإيداعات المعلقة',
    params: [],
    run: async () => {
      const { data, error } = await db().from('deposits').select('id,amount_egp,coins,tx_ref').eq('status', 'pending').order('id').limit(20);
      if (error) throw error;
      if (!data?.length) return 'لا توجد إيداعات معلقة';
      return data.map(d => `#${d.id} · ${d.amount_egp} ج · ${d.coins} عملة · مرجع ${d.tx_ref}`).join('\n');
    },
  },
  {
    name: 'set_theme', risk: 'confirm', desc: 'تغيير لون في المنصة (ink, card, sand, teal, gold)',
    params: [
      { name: 'key', type: 'string', required: true, desc: 'ink أو card أو sand أو teal أو gold' },
      { name: 'value', type: 'string', required: true, desc: 'لون hex مثل #1FC8B4' },
    ],
    run: async (p) => {
      if (!['ink', 'card', 'sand', 'teal', 'gold'].includes(p.key)) throw new Error('اسم اللون غير معروف');
      if (!/^#[0-9a-fA-F]{6}$/.test(p.value)) throw new Error('اللون لازم يكون مثل #1FC8B4');
      const c = db();
      const { data, error: e1 } = await c.from('app_settings').select('theme').eq('id', 1).maybeSingle();
      if (e1) throw e1;
      const theme = { ...((data?.theme as Record<string, string>) ?? {}), [p.key]: p.value };
      const { error } = await c.from('app_settings').update({ theme }).eq('id', 1);
      if (error) throw error;
      return `تم تغيير ${p.key} إلى ${p.value}. يظهر للمستخدمين عند فتح المنصة.`;
    },
  },
  {
    name: 'reset_theme', risk: 'confirm', desc: 'إرجاع ألوان المنصة للافتراضي',
    params: [],
    run: async () => {
      const { error } = await db().from('app_settings').update({ theme: {} }).eq('id', 1);
      if (error) throw error;
      return 'تم إرجاع الألوان للافتراضي';
    },
  },

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
