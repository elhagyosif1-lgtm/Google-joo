import { createClient } from '@supabase/supabase-js';

export const env = (k, d = '') => process.env[k] ?? d;
export const configured = () => !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
export const sb = createClient(env('SUPABASE_URL', 'http://localhost'), env('SUPABASE_SERVICE_ROLE_KEY', 'x'), { auth: { persistSession: false } });

export const COIN_PRICE = +env('COIN_PRICE_EGP', '0.1');
export const CREATOR_SHARE = +env('CREATOR_SHARE', '0.5');
export const MIN_WITHDRAW = +env('MIN_WITHDRAW_EGP', '50');
export const GIFTS = {
  tea:     { emoji: '☕', name: 'شاي',    coins: 1 },
  sugar:   { emoji: '🍬', name: 'سكر',    coins: 5 },
  salt:    { emoji: '🧂', name: 'ملح',    coins: 10 },
  brush:   { emoji: '🖌️', name: 'فرشاة',  coins: 30 },
  palette: { emoji: '🎨', name: 'لوحة',   coins: 100 },
  falcon:  { emoji: '🦅', name: 'صقر',    coins: 300 },
  pyramid: { emoji: '🔺', name: 'هرم',    coins: 1000 },
};

export function weekId(d = new Date()) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear();
  const w = Math.ceil(((t - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7);
  return `${y}-W${String(w).padStart(2, '0')}`;
}
export const dayStart = () => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); return d.toISOString(); };
export const weekStart = () => {
  const d = new Date(); d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString();
};

export async function authUser(req) {
  const h = req.headers.authorization || '';
  const tok = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!tok) return null;
  const { data, error } = await sb.auth.getUser(tok);
  return error || !data?.user ? null : data.user;
}

export async function ensureProfile(u) {
  const { data } = await sb.from('profiles').select('*').eq('id', u.id).maybeSingle();
  if (data) return data;
  const base = (u.email || 'user').split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 14) || 'user';
  for (let i = 0; i < 5; i++) {
    const username = base + Math.floor(100 + Math.random() * 900);
    const { data: p, error } = await sb.from('profiles').insert({ id: u.id, username, display_name: base }).select().single();
    if (!error) { await move(u.id, { bonus: 50, kind: 'welcome' }); return { ...p, bonus_coins: 50 }; }
  }
  throw new Error('profile_failed');
}

// كل حركة فلوس تمر من هنا (دالة SQL ذرّية)
export async function move(userId, { paid = 0, bonus = 0, cash = 0, points = 0, kind, ref = null }) {
  const { data, error } = await sb.rpc('wallet_move', { p_user: userId, p_paid: paid, p_bonus: bonus, p_cash: cash, p_points: points, p_kind: kind, p_ref: ref });
  if (error) throw new Error(/insufficient|check constraint|violates/i.test(error.message) ? 'insufficient' : error.message);
  return data;
}

export const ok = (res, data = {}, code = 200) => res.status(code).json({ ok: true, ...data });
export const fail = (res, code, msg) => res.status(code).json({ ok: false, error: msg });

// يغلّف المعالجات: تفعيل الباك إند، تسجيل الدخول، التقاط الأخطاء
export function route(map, { auth = true } = {}) {
  return async (req, res) => {
    try {
      if (!configured()) return fail(res, 503, 'backend_not_configured');
      const fn = map[req.method];
      if (!fn) return fail(res, 405, 'method_not_allowed');
      let u = null;
      if (auth) {
        const needAuth = typeof auth === 'function' ? auth(req) : true;
        u = await authUser(req);
        if (needAuth && !u) return fail(res, 401, 'login_required');
      }
      const profile = u ? await ensureProfile(u) : null;
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      await fn({ req, res, u, profile, body, q: req.query || {} });
    } catch (e) {
      console.error(e);
      fail(res, e.message === 'insufficient' ? 402 : 500, e.message === 'insufficient' ? 'insufficient' : 'server_error');
    }
  };
}
export const vfOk = n => /^010\d{8}$/.test(String(n || '').trim());
