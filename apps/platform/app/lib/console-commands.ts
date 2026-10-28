import type { SupabaseClient } from '@supabase/supabase-js';

/*
 * سجل الأوامر: هذا هو المكان الوحيد اللي يقدر الذكاء الاصطناعي ينفذ منه.
 * الذكاء ما يكتب SQL ولا shell، بل يختار أمراً من هنا ويعبّي معاملاته.
 * لإضافة قدرة جديدة: أضف أمراً هنا بوصف واضح ومستوى خطر مناسب.
 *   read   = يُنفَّذ مباشرة
 *   write  = يحتاج تأكيد الأدمن
 *   danger = يحتاج تأكيد الأدمن + سبب مكتوب
 */
export type Risk = 'read' | 'write' | 'danger';
export type Param = { name: string; type: 'string' | 'number'; required?: boolean; desc: string };
export type Cmd = {
  name: string;
  risk: Risk;
  desc: string;
  params: Param[];
  run: (db: SupabaseClient, p: Record<string, any>) => Promise<string>;
};

const idByUsername = async (db: SupabaseClient, username: string) => {
  const { data, error } = await db.from('profiles').select('id,username,coins,diamonds,bonus').eq('username', username).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`المستخدم ${username} غير موجود`);
  return data;
};

export const COMMANDS: Cmd[] = [
  {
    name: 'stats', risk: 'read', desc: 'إحصائيات عامة للمنصة',
    params: [],
    run: async (db) => {
      const count = async (t: string, f?: (q: any) => any) => {
        let q = db.from(t).select('*', { count: 'exact', head: true });
        if (f) q = f(q);
        const { count } = await q; return count ?? 0;
      };
      const [users, videos, liveRooms, pendingDeposits, pendingWithdrawals] = await Promise.all([
        count('profiles'), count('videos'),
        count('rooms', q => q.eq('is_live', true)),
        count('deposits', q => q.eq('status', 'pending')),
        count('withdrawals', q => q.eq('status', 'pending')),
      ]);
      return `المستخدمين: ${users}\nالفيديوهات: ${videos}\nالبثوث الحية: ${liveRooms}\nإيداعات معلقة: ${pendingDeposits}\nسحوبات معلقة: ${pendingWithdrawals}`;
    },
  },
  {
    name: 'user_lookup', risk: 'read', desc: 'بيانات مستخدم بالاسم',
    params: [{ name: 'username', type: 'string', required: true, desc: 'اسم المستخدم' }],
    run: async (db, p) => {
      const u = await idByUsername(db, p.username);
      return `@${u.username}\nعملات: ${u.coins}\nألماس: ${u.diamonds}\nمكافأة: ${u.bonus}`;
    },
  },
  {
    name: 'grant_bonus', risk: 'write', desc: 'إضافة مكافأة لمستخدم',
    params: [
      { name: 'username', type: 'string', required: true, desc: 'اسم المستخدم' },
      { name: 'amount', type: 'number', required: true, desc: 'المبلغ (1 إلى 100000)' },
    ],
    run: async (db, p) => {
      const amount = Math.floor(Number(p.amount));
      if (!(amount >= 1 && amount <= 100000)) throw new Error('المبلغ خارج الحد المسموح');
      const u = await idByUsername(db, p.username);
      const { error } = await db.from('profiles').update({ bonus: u.bonus + amount }).eq('id', u.id);
      if (error) throw error;
      await db.from('ledger').insert({ user_id: u.id, kind: 'admin_bonus', amount });
      return `تمت إضافة ${amount} مكافأة إلى @${u.username}`;
    },
  },
  {
    name: 'ban_user', risk: 'danger', desc: 'حظر مستخدم',
    params: [{ name: 'username', type: 'string', required: true, desc: 'اسم المستخدم' }],
    run: async (db, p) => {
      const u = await idByUsername(db, p.username);
      const { error } = await db.from('profiles').update({ banned: true }).eq('id', u.id);
      if (error) throw error;
      return `تم حظر @${u.username}`;
    },
  },
  {
    name: 'unban_user', risk: 'write', desc: 'فك حظر مستخدم',
    params: [{ name: 'username', type: 'string', required: true, desc: 'اسم المستخدم' }],
    run: async (db, p) => {
      const u = await idByUsername(db, p.username);
      const { error } = await db.from('profiles').update({ banned: false }).eq('id', u.id);
      if (error) throw error;
      return `تم فك حظر @${u.username}`;
    },
  },
  {
    name: 'delete_video', risk: 'danger', desc: 'حذف فيديو بالمعرّف',
    params: [{ name: 'video_id', type: 'number', required: true, desc: 'معرّف الفيديو' }],
    run: async (db, p) => {
      const { error, count } = await db.from('videos').delete({ count: 'exact' }).eq('id', Number(p.video_id));
      if (error) throw error;
      return count ? `تم حذف الفيديو ${p.video_id}` : 'لم يُعثر على الفيديو';
    },
  },
  {
    name: 'pending_deposits', risk: 'read', desc: 'الإيداعات المعلقة',
    params: [],
    run: async (db) => {
      const { data, error } = await db.from('deposits').select('id,amount_egp,coins,tx_ref,created_at').eq('status', 'pending').order('id').limit(20);
      if (error) throw error;
      if (!data?.length) return 'لا توجد إيداعات معلقة';
      return data.map(d => `#${d.id} · ${d.amount_egp} ج · ${d.coins} عملة · مرجع ${d.tx_ref}`).join('\n');
    },
  },
];

export const findCommand = (name: string) => COMMANDS.find(c => c.name === name);

export function validateParams(cmd: Cmd, params: Record<string, any>): string | null {
  for (const p of cmd.params) {
    const v = params?.[p.name];
    if (p.required && (v === undefined || v === null || v === '')) return `الحقل ${p.name} مطلوب`;
    if (v !== undefined && p.type === 'number' && Number.isNaN(Number(v))) return `الحقل ${p.name} لازم يكون رقم`;
    if (v !== undefined && p.type === 'string' && typeof v !== 'string') return `الحقل ${p.name} لازم يكون نص`;
    if (v !== undefined && p.type === 'string' && v.length > 64) return `الحقل ${p.name} طويل جداً`;
  }
  return null;
}
