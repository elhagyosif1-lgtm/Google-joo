'use strict';
/* MR JOO WORLD v3 — واجهة خفيفة بدون أي مكتبات */
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 2 });
const fmt = n => nf.format(+n || 0);
const S = { cfg: { gifts: {}, week: '' }, live: false, tok: localStorage.tok || '', me: null, tab: 'foryou', feed: [], muted: true, view: 'home',
  d: JSON.parse(localStorage.demo || 'null') || { paid: 0, bonus: 50, cash: 0, likes: {}, follows: {}, cash0: 0, tr: { cash: 10000, pos: {} }, vids: [], runs: 0, earned: 0, ck: '' } };
const save = () => localStorage.demo = JSON.stringify(S.d);

const ERR = { login_required: 'سجّل دخولك الأول', insufficient: 'رصيدك مش كفاية', backend_not_configured: 'ده وضع تجريبي — فعّل الربط من README', bad_number: 'رقم فودافون كاش لازم يبدأ بـ 010 (١١ رقم)', bad_amount: 'المبلغ غير صحيح', below_min: 'أقل مبلغ للسحب أعلى من كده', bad_ref: 'اكتب رقم العملية من رسالة فودافون', ref_used: 'رقم العملية ده مستخدم قبل كده', too_many_pending: 'عندك طلبات شحن لسه بتتراجع', no_cash: 'السيولة مش كفاية', no_position: 'مفيش كمية كفاية للبيع', live_not_configured: 'البث الحقيقي محتاج مفاتيح LiveKit', username_taken: 'الاسم ده مستخدم', bad_username: 'اسم من ٣–٢٠ حرف إنجليزي/أرقام/_', already: 'اتاخد قبل كده', not_done: 'التحدي لسه ما خلصش', server_error: 'حصلت مشكلة، جرّب تاني', busy: 'السيرفر مشغول، جرّب تاني' };
let toastT; function toast(m) { const t = $('#toast'); t.textContent = ERR[m] || m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600); }

/* ---------- API ---------- */
async function refresh() {
  const rt = localStorage.rt; if (!rt) return false;
  const r = await fetch(S.cfg.supabaseUrl + '/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: { apikey: S.cfg.anonKey, 'content-type': 'application/json' }, body: JSON.stringify({ refresh_token: rt }) });
  const j = await r.json(); if (!j.access_token) return false;
  S.tok = localStorage.tok = j.access_token; localStorage.rt = j.refresh_token; return true;
}
async function api(path, { method = 'GET', body, retry = true } = {}) {
  if (!S.live) return demo(path, method, body);
  const r = await fetch('/api/' + path, { method, headers: { 'content-type': 'application/json', ...(S.tok ? { authorization: 'Bearer ' + S.tok } : {}) }, body: body ? JSON.stringify(body) : undefined }).catch(() => null);
  if (!r) return { ok: false, error: 'server_error' };
  if (r.status === 401 && S.tok && retry && await refresh()) return api(path, { method, body, retry: false });
  const j = await r.json().catch(() => ({ ok: false, error: 'server_error' }));
  if (r.status === 401) { S.tok = ''; localStorage.removeItem('tok'); openAuth(); }
  return j;
}
const post = (p, body) => api(p, { method: 'POST', body });

/* ---------- sheets / stage ---------- */
function closeSheet() { $$('.sheet-bg').forEach(e => e.remove()); }
function sheet(html) {
  closeSheet(); const bg = document.createElement('div'); bg.className = 'sheet-bg';
  bg.innerHTML = `<div class="sheet" role="dialog"><i class="grab"></i>${html}</div>`;
  bg.onclick = e => { if (e.target === bg) closeSheet(); }; document.body.appendChild(bg); return bg.firstChild;
}
function stage(html, onClose) {
  const s = $('#stage'); s.innerHTML = html + `<button class="btn alt" id="stx" style="position:absolute;top:calc(10px + var(--sat));left:12px;padding:6px 14px;z-index:5">✕ خروج</button>`;
  s.classList.add('on'); $('#stx').onclick = () => { s.classList.remove('on'); s.innerHTML = ''; onClose && onClose(); }; return s;
}

/* ---------- navigation ---------- */
function show(v) {
  S.view = v; $$('.view').forEach(x => x.classList.toggle('on', x.id === 'v-' + v));
  $$('#nav button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  $('#ftabs').style.display = v === 'home' ? '' : 'none';
  if (v !== 'home') { pauseAll(); $('#ring').style.display = 'none'; }
  else resumeActive();
  ({ explore: renderExplore, create: renderCreate, hub: renderHub, me: renderMe })[v]?.();
}
$('#nav').onclick = e => { const b = e.target.closest('button'); if (b) show(b.dataset.v); };
$('#coins').onclick = () => show('hub');
$('#ftabs').onclick = e => { const b = e.target.closest('button'); if (!b) return; S.tab = b.dataset.t; $$('#ftabs button').forEach(x => x.classList.toggle('on', x === b)); loadFeed(); };

async function loadMe() {
  const j = await api('me'); if (j.ok) { S.me = j.me; S.myVids = j.videos; }
  updateCoins();
}
function updateCoins() { const m = S.me; $('#coinN').textContent = m ? fmt(m.paid + m.bonus) : '٠'; }

/* ---------- auth ---------- */
function openAuth(mode = 'login') {
  if (!S.live) return toast('backend_not_configured');
  const s = sheet(`<h2>${mode === 'login' ? 'دخول' : 'حساب جديد'}</h2>
  <label>الإيميل</label><input id="em" type="email" autocomplete="email" inputmode="email">
  <label>الباسورد (٦ حروف على الأقل)</label><input id="pw" type="password" autocomplete="${mode === 'login' ? 'current' : 'new'}-password">
  <p class="mute" id="aerr" style="min-height:22px;margin-top:8px"></p>
  <button class="btn block" id="go">${mode === 'login' ? 'ادخل' : 'اعمل الحساب وخد ٥٠ عملة هدية'}</button>
  <button class="btn alt block" id="sw" style="margin-top:8px">${mode === 'login' ? 'معنديش حساب' : 'عندي حساب'}</button>`);
  $('#sw', s).onclick = () => openAuth(mode === 'login' ? 'signup' : 'login');
  $('#go', s).onclick = async () => {
    const email = $('#em', s).value.trim(), password = $('#pw', s).value;
    const url = S.cfg.supabaseUrl + (mode === 'login' ? '/auth/v1/token?grant_type=password' : '/auth/v1/signup');
    const r = await fetch(url, { method: 'POST', headers: { apikey: S.cfg.anonKey, 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const j = await r.json();
    if (!j.access_token) { $('#aerr', s).textContent = r.ok ? 'فعّل الإيميل من الرسالة ثم ادخل' : (j.msg || j.error_description || 'تعذر الدخول'); return; }
    S.tok = localStorage.tok = j.access_token; localStorage.rt = j.refresh_token || '';
    closeSheet(); await loadMe(); loadFeed(); if (S.view !== 'home') show(S.view); toast('أهلاً بيك 👋');
  };
}
const needLogin = () => { if (S.live && !S.tok) { openAuth(); return true; } return false; };

/* ---------- feed ---------- */
let io, active = null, watch = null;
async function loadFeed() {
  const j = await api('feed?tab=' + S.tab + '&cat=' + (S.cat || '')); const f = $('#feed');
  const list = j.ok ? j.feed : [];
  S.feed = list;
  if (!list.length) {
    f.innerHTML = `<div class="card adcard"><div><div class="big">${S.tab === 'following' ? 'تابع مبدعين تظهر فيديوهاتهم هنا' : 'أول فيديو ممكن يبقى بتاعك'}</div><p class="mute" style="margin-bottom:18px">انشر فيديو وخلي الناس تبعتلك هدايا بتتحول فلوس حقيقية</p><button class="btn" onclick="show('create')">انشر دلوقتي</button></div></div>`; return;
  }
  const cfg = S.cfg; let html = '';
  list.forEach((v, i) => {
    if (i && i % 6 === 0) html += adCard(i);
    html += `<section class="card" data-i="${i}" data-id="${v.id}">
      <video playsinline loop muted preload="none" ${v.thumb_url ? `poster="${esc(v.thumb_url)}"` : ''} data-src="${esc(v.video_url)}"></video><div class="shade"></div>
      <div class="rail">
        <button data-a="profile" aria-label="الحساب"><span class="av">${esc((v.profiles?.display_name || '؟')[0])}${v.following ? '<span class="plus done">✓</span>' : '<span class="plus">+</span>'}</span></button>
        <button data-a="like" class="${v.liked ? 'liked' : ''}" aria-label="لايك"><span class="ic"><svg viewBox="0 0 24 24"><path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.800-8 11-8 11z"/></svg></span><span class="n">${fmt(v.likes)}</span></button>
        <button data-a="comment" aria-label="تعليقات"><span class="ic"><svg viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-11.600 7.100L4 20l1-4.600A8 8 0 1 1 21 12z"/></svg></span><span class="n">${fmt(v.comments)}</span></button>
        <button data-a="gift" aria-label="هدية"><span class="ic" style="background:var(--tea)"><svg viewBox="0 0 24 24" style="stroke:#1a0f05"><rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8v13M3 12h18M12 8c-2-4-6-3-5 0 .5 1.500 5 0 5 0zm0 0c2-4 6-3 5 0-.5 1.500-5 0-5 0z"/></svg></span><span class="n">هدية</span></button>
        <button data-a="share" aria-label="مشاركة"><span class="ic"><svg viewBox="0 0 24 24"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13"/></svg></span></button>
      </div>
      <div class="meta"><b>@${esc(v.profiles?.username || '')}</b><p>${esc(v.caption)}</p></div></section>`;
  });
  f.innerHTML = html;
  io?.disconnect(); io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && e.intersectionRatio > .65) activate(e.target); }), { root: f, threshold: [.66] });
  $$('.card', f).forEach(c => io.observe(c)); const ads = window.adsbygoogle; if (ads && S.cfg.adsenseClient) $$('.adsbygoogle', f).forEach(() => { try { (ads = window.adsbygoogle || []).push({}); } catch { } });
}
function adCard(i) {
  const c = S.cfg;
  if (c.adsenseClient && c.adsenseFeedSlot) return `<section class="card adcard" data-ad="1"><span class="tag">إعلان</span><ins class="adsbygoogle" style="display:block;width:100%;height:70%" data-ad-client="${esc(c.adsenseClient)}" data-ad-slot="${esc(c.adsenseFeedSlot)}" data-ad-format="auto" data-full-width-responsive="true"></ins></section>`;
  return `<section class="card adcard" data-ad="1"><div><div class="big">ادعم المبدعين اللي بتحبهم</div><p class="mute" style="margin-bottom:18px">كل هدية بعملات مشتراة بتتحول لفلوس في إيد المبدع</p><button class="btn" onclick="openDeposit()">اشحن عملات</button></div></section>`;
}
function activate(card) {
  if (active === card) return; pauseAll(); active = card; stopWatch();
  if (card.dataset.ad) return;
  const v = $('video', card); if (!v.src) v.src = v.dataset.src; v.muted = S.muted; play(v);
  const next = card.nextElementSibling?.querySelector?.('video'); if (next && !next.src) { next.preload = 'metadata'; next.src = next.dataset.src; }
  $$('video', $('#feed')).forEach(x => { const c = x.closest('.card'); if (c !== card && c !== card.nextElementSibling && x.src) { x.removeAttribute('src'); x.load(); } });
  post('social', { action: 'view', video: card.dataset.id });
  startWatch(card.dataset.id);
}
const play = v => { try { v.play()?.catch(() => { }); } catch { } };
const pauseAll = () => $$('#feed video').forEach(v => v.pause());
const resumeActive = () => { if (active && S.view === 'home') { play($('video', active)); startWatch(active.dataset.id); } };
async function startWatch(id) {
  stopWatch(); if (S.live && !S.tok) return;
  const r = await post('games', { action: 'start', game: 'watch', ref: id }); if (!r.ok || r.capped) return;
  const ring = $('#ring'), fg = $('.fg', ring); ring.style.display = 'block'; fg.style.transition = 'none'; fg.style.strokeDashoffset = 100.5; void fg.getBoundingClientRect();
  fg.style.transition = 'stroke-dashoffset 15s linear'; fg.style.strokeDashoffset = 0;
  const t = setTimeout(async () => { ring.style.display = 'none'; const f = await post('games', { action: 'finish', id: r.id, score: 1 }); if (f.reward) { toast('+' + fmt(f.reward) + ' عملة على المشاهدة 🪙'); loadMe(); } }, 15200);
  watch = () => { clearTimeout(t); ring.style.display = 'none'; };
}
const stopWatch = () => { watch?.(); watch = null; };

$('#feed').addEventListener('click', async e => {
  const card = e.target.closest('.card'); if (!card || card.dataset.ad) return;
  const b = e.target.closest('button[data-a]'); const v = S.feed[card.dataset.i], id = card.dataset.id, vid = $('video', card);
  if (!b) { // لمستين = لايك، لمسة واحدة = إيقاف/تشغيل + فتح الصوت
    const now = Date.now(); if (now - (card._t || 0) < 300) { likeVideo(card, true, e); card._t = 0; return; } card._t = now;
    setTimeout(() => { if (card._t === now) { S.muted = false; vid.muted = false; vid.paused ? play(vid) : vid.pause(); } }, 310); return;
  }
  const a = b.dataset.a;
  if (a === 'like') likeVideo(card, false, e);
  if (a === 'comment') openComments(id);
  if (a === 'gift') openGifts({ video: id, name: v.profiles?.username });
  if (a === 'share') { const url = location.origin + '/?v=' + id; navigator.share ? navigator.share({ title: 'مستر جو', text: v.caption, url }).catch(() => { }) : (navigator.clipboard?.writeText(url), toast('اتنسخ الرابط')); }
  if (a === 'profile') { if (needLogin()) return; if (v.user_id === S.me?.id) return show('me'); const r = await post('social', { action: 'follow', user: v.user_id }); if (r.ok) { v.following = r.following; const p = $('.plus', b); p.textContent = r.following ? '✓' : '+'; p.classList.toggle('done', r.following); } }
});
async function likeVideo(card, onlyLike, e) {
  if (needLogin()) return; const b = $('[data-a=like]', card), v = S.feed[card.dataset.i];
  if (onlyLike) { const h = document.createElement('div'); h.className = 'heart'; h.textContent = '❤️'; const r = card.getBoundingClientRect(); h.style.left = (e.clientX - r.left - 40) + 'px'; h.style.top = (e.clientY - r.top - 40) + 'px'; card.appendChild(h); setTimeout(() => h.remove(), 800); if (v.liked) return; }
  const r = await post('social', { action: 'like', video: card.dataset.id }); if (!r.ok) return toast(r.error);
  v.liked = r.liked; b.classList.toggle('liked', r.liked); $('.n', b).textContent = fmt(r.likes);
}
async function openComments(id) {
  const s = sheet('<h2>التعليقات</h2><div id="cl" class="mute">...</div><div style="display:flex;gap:8px;margin-top:10px"><input id="ci" placeholder="اكتب تعليق" maxlength="300"><button class="btn" id="cs">إرسال</button></div>');
  const draw = async () => { const j = await api('social?video=' + id); $('#cl', s).innerHTML = (j.comments || []).map(c => `<div class="cmt"><span class="a">${esc((c.profiles?.display_name || '؟')[0])}</span><div><b>@${esc(c.profiles?.username)}</b><div>${esc(c.body)}</div></div></div>`).join('') || '<div class="empty">كن أول من يعلّق</div>'; };
  draw();
  $('#cs', s).onclick = async () => { if (needLogin()) return; const t = $('#ci', s).value.trim(); if (!t) return; const r = await post('social', { action: 'comment', video: id, body: t }); if (!r.ok) return toast(r.error); $('#ci', s).value = ''; draw(); const v = S.feed.find(x => x.id === id); if (v) { v.comments++; $(`.card[data-id="${id}"] [data-a=comment] .n`).textContent = fmt(v.comments); } };
}

/* ---------- gifts ---------- */
function openGifts(target, onSent) {
  if (needLogin()) return; const G = S.cfg.gifts; let sel = Object.keys(G)[0];
  const bal = () => S.me ? S.me.paid + S.me.bonus : 0;
  const s = sheet(`<h2>ابعت هدية لـ @${esc(target.name || '')}</h2><div class="gifts">${Object.entries(G).map(([k, g]) => `<button class="gift${k === sel ? ' on' : ''}" data-k="${k}"><span class="e">${g.emoji}</span><b>${g.name}</b><small><span class="coin"></span> ${fmt(g.coins)}</small></button>`).join('')}</div>
  <p class="mute" style="margin:12px 0">رصيدك: <b id="gb">${fmt(bal())}</b> عملة — العملات المجانية بتتصرف الأول</p>
  <button class="btn block" id="gs">ابعت</button><button class="btn alt block" id="gd" style="margin-top:8px">اشحن عملات</button>`);
  s.onclick = e => { const g = e.target.closest('.gift'); if (g) { sel = g.dataset.k; $$('.gift', s).forEach(x => x.classList.toggle('on', x === g)); } };
  $('#gd', s).onclick = () => openDeposit();
  $('#gs', s).onclick = async () => {
    const r = await post('gifts/send', { gift: sel, ...target.video ? { video: target.video } : { to: target.to, live: target.live } });
    if (!r.ok) { toast(r.error); if (r.error === 'insufficient') $('#gd', s).style.outline = '2px solid var(--tea2)'; return; }
    S.me.paid = r.paid; S.me.bonus = r.bonus; updateCoins(); $('#gb', s).textContent = fmt(bal()); fly(G[sel].emoji); onSent && onSent(sel);
    if (!target.live) closeSheet();
  };
}
function fly(emoji) { const h = document.createElement('div'); h.className = 'fly'; h.textContent = emoji; h.style.left = 20 + Math.random() * 55 + '%'; document.body.appendChild(h); setTimeout(() => h.remove(), 2500); }

/* ---------- wallet: deposit / withdraw via Vodafone Cash ---------- */
function openDeposit() {
  if (needLogin()) return; const c = S.cfg; let amt = 50;
  const s = sheet(`<h2>اشحن عملات بفودافون كاش</h2>
  <div class="panel" style="margin-bottom:6px"><div class="mute">١) حوّل المبلغ على الرقم ده</div><div style="font-size:24px;font-weight:900;direction:ltr;text-align:right;margin:4px 0">${esc(c.vodafoneNumber || '— لم يُضبط بعد —')}</div><div class="mute">٢) اكتب رقم العملية من رسالة فودافون هنا — بنأكد ونضيف العملات (عادة خلال ساعات)</div></div>
  <div class="chips" id="pk">${[10, 25, 50, 100, 250].map(a => `<button data-a="${a}" class="${a === 50 ? 'on' : ''}">${fmt(a)} ج = ${fmt(a / c.coinPrice)} 🪙</button>`).join('')}</div>
  <label>رقم فودافون كاش اللي حوّلت منه</label><input id="dn" inputmode="numeric" placeholder="010xxxxxxxx" dir="ltr">
  <label>رقم العملية</label><input id="dr" dir="ltr" placeholder="مثال: 3419...">
  <button class="btn block" id="dg" style="margin-top:14px">أكّد التحويل</button>`);
  s.onclick = e => { const b = e.target.closest('#pk button'); if (b) { amt = +b.dataset.a; $$('#pk button', s).forEach(x => x.classList.toggle('on', x === b)); } };
  $('#dg', s).onclick = async () => { const r = await post('wallet', { action: 'deposit', amount_egp: amt, vf_number: $('#dn', s).value.trim(), tx_ref: $('#dr', s).value.trim() }); if (!r.ok) return toast(r.error); closeSheet(); toast('وصلنا طلبك ✅ هتتشحن بعد التأكيد'); };
}
function openWithdraw() {
  if (needLogin()) return; const c = S.cfg;
  const s = sheet(`<h2>اسحب أرباحك على فودافون كاش</h2><p class="mute">الرصيد القابل للسحب: <b>${fmt(S.me?.cash)} ج</b> — أقل مبلغ ${fmt(c.minWithdraw)} ج</p>
  <label>المبلغ (جنيه)</label><input id="wa" inputmode="decimal" value="${Math.floor(S.me?.cash || 0)}">
  <label>رقم فودافون كاش بتاعك</label><input id="wn" inputmode="numeric" dir="ltr" placeholder="010xxxxxxxx">
  <button class="btn block" id="wg" style="margin-top:14px">اطلب السحب</button>`);
  $('#wg', s).onclick = async () => { const r = await post('wallet', { action: 'withdraw', amount_egp: +$('#wa', s).value, vf_number: $('#wn', s).value.trim() }); if (!r.ok) return toast(r.error); closeSheet(); toast('تم الطلب ✅ هيتحول لرقمك بعد المراجعة'); await loadMe(); renderHub(); };
}

/* ---------- explore: season, games, market ---------- */
const daysLeft = () => { const d = new Date(); return 7 - ((d.getUTCDay() + 6) % 7); };
let mk = { px: {}, hist: {}, names: {}, acc: null, timer: null };
async function renderExplore() {
  const v = $('#v-explore');
  v.innerHTML = `<div class="page">
  <div class="season"><div class="mute">الموسم ${esc(S.cfg.week || '')}</div><h2 style="margin:4px 0">يتجدد كل أسبوع</h2><p class="mute">تحديات جديدة وتداول من الصفر وصندوق مبدعين جديد — باقي <b>${fmt(daysLeft())}</b> أيام</p></div>
  <h3>ألعاب بتكسّبك عملات</h3>
  <div class="grid2"><button class="game" id="g-tap"><span class="e">🎯</span><b>صيد الدوائر</b><span class="mute">٢٠ ثانية، اضغط بسرعة</span></button>
  <button class="game" id="g-mem"><span class="e">🧠</span><b>ذاكرة الشاي</b><span class="mute">طابق ٨ أزواج</span></button></div>
  <p class="mute" style="margin-top:8px">والمشاهدة كمان بتكسّب: كل فيديو بتتفرج عليه ١٥ ثانية = ٢ عملة (حد يومي).</p>
  <h3>سوق التداول التجريبي <span class="mute">— فلوس افتراضية، من غير أي مخاطرة</span></h3>
  <div class="panel" id="pf"></div><div class="panel" id="mkt" style="margin-top:10px"></div>
  <button class="btn alt block" id="lb" style="margin-top:10px">🏆 لوحة الصدارة الأسبوعية</button></div>`;
  $('#g-tap').onclick = tapRush; $('#g-mem').onclick = memory; $('#lb').onclick = leaderboard;
  loadMarket(); clearInterval(mk.timer); mk.timer = setInterval(() => { if (S.view === 'explore') loadMarket(); else clearInterval(mk.timer); }, 4000);
}
async function loadMarket() {
  const j = await api('trade'); if (!j.ok) { $('#mkt') && ($('#mkt').innerHTML = `<div class="empty">${S.live && !S.tok ? '<button class="btn" onclick="openAuth()">سجّل دخول عشان تتداول</button>' : 'تعذر التحميل'}</div>`); return; }
  mk.px = j.prices; mk.names = j.assets; mk.acc = j.account;
  for (const k in j.prices) { (mk.hist[k] ||= []).push(j.prices[k]); if (mk.hist[k].length > 40) mk.hist[k].shift(); }
  const pf = $('#pf'), m = $('#mkt'); if (!pf) return;
  const pl = j.account.equity - j.start;
  pf.innerHTML = `<div class="row"><div><div class="mute">قيمة محفظتك</div><b style="font-size:22px">${fmt(j.account.equity)}</b></div><div class="${pl >= 0 ? 'up' : 'down'}" style="font-weight:800;direction:ltr">${pl >= 0 ? '+' : ''}${fmt(pl)}</div></div><div class="mute">سيولة: ${fmt(j.account.cash)}</div>`;
  m.innerHTML = Object.keys(j.prices).map(k => { const h = mk.hist[k], up = h[h.length - 1] >= h[0]; return `<button class="row" data-k="${k}" style="width:100%;text-align:right"><div><b>${esc(j.assets[k])}</b><div class="mute">${fmt(j.account.positions[k] || 0)} وحدة</div></div>${spark(h, up)}<b class="${up ? 'up' : 'down'}" style="direction:ltr">${fmt(j.prices[k])}</b></button>`; }).join('');
  m.onclick = e => { const b = e.target.closest('[data-k]'); if (b) tradeSheet(b.dataset.k); };
}
function spark(h, up) { if (h.length < 2) return '<svg class="spark"></svg>'; const mn = Math.min(...h), mx = Math.max(...h) || 1, r = mx - mn || 1; const pts = h.map((p, i) => `${(i / (h.length - 1) * 70).toFixed(1)},${(24 - (p - mn) / r * 22).toFixed(1)}`).join(' '); return `<svg class="spark" viewBox="0 0 70 26"><polyline points="${pts}" fill="none" stroke="${up ? '#3fb6a8' : '#e2553f'}" stroke-width="2" stroke-linejoin="round"/></svg>`; }
function tradeSheet(k) {
  const price = () => mk.px[k], own = () => mk.acc.positions[k] || 0; let pct = .25;
  const s = sheet(`<h2>${esc(mk.names[k])}</h2><div style="font-size:28px;font-weight:900;direction:ltr;text-align:right" id="tp">${fmt(price())}</div><p class="mute">رسوم ٠٫١٪ على كل صفقة</p>
  <div class="chips" id="tq"><button data-p=".25" class="on">٢٥٪</button><button data-p=".5">٥٠٪</button><button data-p="1">١٠٠٪</button></div>
  <div class="grid2"><button class="btn" id="bb" style="background:var(--brine)">شراء</button><button class="btn red" id="bs">بيع</button></div>`);
  s.addEventListener('click', e => { const b = e.target.closest('#tq button'); if (b) { pct = +b.dataset.p; $$('#tq button', s).forEach(x => x.classList.toggle('on', x === b)); } });
  const go = side => async () => { const qty = side === 'buy' ? (mk.acc.cash * pct / (price() * 1.001)) : own() * pct; if (!(qty > 0)) return toast(side === 'buy' ? 'no_cash' : 'no_position'); const r = await post('trade', { sym: k, side, qty: +qty.toFixed(6) }); if (!r.ok) return toast(r.error); mk.acc = r.account; toast((side === 'buy' ? 'اشتريت' : 'بعت') + ' بسعر ' + fmt(r.price)); closeSheet(); loadMarket(); };
  $('#bb', s).onclick = go('buy'); $('#bs', s).onclick = go('sell');
}
async function leaderboard() {
  const j = await api('trade?board=1'); const b = j.board || [];
  sheet(`<h2>🏆 صدارة الأسبوع</h2>${b.map((x, i) => `<div class="row"><span>${['🥇', '🥈', '🥉'][i] || fmt(i + 1)} @${esc(x.user)}${x.me ? ' (أنت)' : ''}</span><b>${fmt(x.equity)}</b></div>`).join('') || '<div class="empty">لسه مفيش متداولين</div>'}<p class="mute" style="margin-top:10px">جوايز الأسبوع بتتوزع من صندوق الإيرادات الفعلي، وبتتراجع قبل الصرف.</p>`);
}
async function startRun(game) { if (needLogin()) return null; const r = await post('games', { action: 'start', game }); if (!r.ok) { toast(r.error); return null; } if (r.capped) { toast('وصلت للحد اليومي — ارجع بكرة 🌙'); return null; } return r.id; }
async function finishRun(id, score, box) { const r = await post('games', { action: 'finish', id, score }); const msg = r.reward ? `+${fmt(r.reward)} عملة 🪙` : 'مفيش مكافأة الجولة دي'; box.innerHTML += `<div style="position:absolute;inset:0;display:grid;place-items:center;background:#000a;text-align:center;z-index:4"><div><div class="big">النتيجة ${fmt(score)}</div><p style="margin-bottom:16px">${msg}</p><button class="btn" id="again">العب تاني</button></div></div>`; loadMe(); return r; }
async function tapRush() {
  const id = await startRun('tap'); if (!id) return; let score = 0, left = 20, over = false;
  const s = stage(`<div class="hud"><span></span><span>⏱ <span id="tt">20</span></span><span>🎯 <span id="ts">0</span></span></div><div id="field"></div>`, () => over = true);
  const f = $('#field', s), tick = setInterval(() => { if (over) return clearInterval(tick); const d = document.createElement('button'); d.className = 'tgt'; d.setAttribute('aria-label', 'دايرة'); d.style.left = Math.random() * 80 + '%'; d.style.top = Math.random() * 82 + '%'; d.onpointerdown = () => { score++; $('#ts', s).textContent = score; d.remove(); }; f.appendChild(d); setTimeout(() => d.remove(), 900); }, 420);
  const t = setInterval(async () => { if (over) return clearInterval(t); $('#tt', s).textContent = --left; if (left <= 0) { clearInterval(t); clearInterval(tick); over = true; await finishRun(id, score, f); $('#again').onclick = () => { $('#stx').click(); tapRush(); }; } }, 1000);
}
async function memory() {
  const id = await startRun('memory'); if (!id) return; const em = ['☕', '🧂', '🍬', '🎨', '🖌️', '🦅', '🔺', '🌙'];
  const deck = [...em, ...em].sort(() => Math.random() - .5); let first = null, lock = false, moves = 0, found = 0;
  const s = stage(`<div class="hud"><span></span><span>حركات: <span id="mv">0</span></span><span></span></div><div class="mem" style="position:relative" id="mm">${deck.map((e, i) => `<button data-i="${i}" aria-label="كارت"></button>`).join('')}</div>`);
  $('#mm', s).onclick = async e => {
    const b = e.target.closest('button'); if (!b || lock || b.classList.contains('f') || b.classList.contains('m')) return;
    b.classList.add('f'); b.textContent = deck[b.dataset.i];
    if (!first) { first = b; return; } moves++; $('#mv', s).textContent = moves;
    if (deck[first.dataset.i] === deck[b.dataset.i]) { first.classList.replace('f', 'm'); b.classList.replace('f', 'm'); first = null; if (++found === 8) { await finishRun(id, Math.max(0, 100 - (moves - 8) * 5), $('#mm', s)); $('#again').onclick = () => { $('#stx').click(); memory(); }; } }
    else { lock = true; const a = first; first = null; setTimeout(() => { a.classList.remove('f'); b.classList.remove('f'); a.textContent = b.textContent = ''; lock = false; }, 650); }
  };
}

/* ---------- create: upload video / go live ---------- */
function renderCreate() {
  $('#v-create').innerHTML = `<div class="page"><h2>اعمل محتوى</h2>
  <button class="panel" id="c-up" style="width:100%;text-align:right;display:block;margin-bottom:10px"><div class="big" style="font-size:20px">📹 انشر فيديو</div><span class="mute">حتى ٦٠ ثانية و٥٠ ميجا — كل هدية بتوصلك بتتحول فلوس</span></button>
  <button class="panel" id="c-live" style="width:100%;text-align:right;display:block"><div class="big" style="font-size:20px">🔴 ابدأ بث مباشر</div><span class="mute">دردشة، هدايا طايرة، وهدف للبث</span></button>
  <h3>بث شغّال دلوقتي</h3><div id="lvl" class="lvrow"><span class="mute">...</span></div></div>`;
  $('#c-up').onclick = uploadFlow; $('#c-live').onclick = () => goLive();
  api('live').then(j => { const l = $('#lvl'); if (!l) return; l.innerHTML = (j.lives || []).map(x => `<button class="lvc" data-id="${x.id}" data-room="${x.room}" data-u="${x.user_id}"><small>🔴 مباشر</small><div><b>@${esc(x.profiles?.username)}</b><div class="mute" style="color:#fffc">${esc(x.title)}</div></div></button>`).join('') || '<span class="mute">مفيش بث دلوقتي — كن أول واحد</span>'; l.onclick = e => { const b = e.target.closest('.lvc'); if (b) watchLive(b.dataset); }; });
}
function uploadFlow() {
  if (needLogin()) return; const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'video/mp4,video/webm,video/quicktime';
  inp.onchange = () => {
    const f = inp.files[0]; if (!f) return; if (f.size > (S.cfg.video === 'cf' ? 500 : 50) * 1048576) return toast('الفيديو أكبر من الحد المسموح');
    const url = URL.createObjectURL(f), s = sheet(`<h2>نشر فيديو</h2><video src="${url}" style="width:100%;max-height:38dvh;border-radius:14px;background:#000" muted playsinline controls></video><label>القسم</label><select id="cat">${CATS.slice(1).map(c => `<option value="${c[0]}">${c[1]}</option>`).join('')}</select><label>الوصف</label><textarea id="cap" rows="2" maxlength="200" placeholder="اكتب وصف + هاشتاجات"></textarea><div class="bar" style="margin-top:12px;display:none" id="pb"><i style="width:0"></i></div><button class="btn block" id="pub" style="margin-top:12px">انشر</button>`);
    const vid = $('video', s); let dur = 0; vid.onloadedmetadata = () => { dur = vid.duration; if (dur > 61) { toast('الحد الأقصى ٦٠ ثانية'); closeSheet(); } };
    $('#pub', s).onclick = async () => {
      $('#pub', s).disabled = true; const cap = $('#cap', s).value;
      if (!S.live) { S.d.vids.unshift({ id: 'l' + Date.now(), caption: cap, video_url: url, likes: 0, comments: 0, views: 0, user_id: 'me', profiles: { username: 'أنا', display_name: 'أنا' } }); save(); closeSheet(); toast('اتنشر (تجريبي)'); show('home'); return loadFeed(); }
      const sg = await post('social', { action: 'sign', ext: (f.name.split('.').pop() || 'mp4').toLowerCase() }); if (!sg.ok) { $('#pub', s).disabled = false; return toast(sg.error); }
      const pb = $('#pb', s); pb.style.display = 'block'; const category = $('#cat', s).value;
      if (sg.provider === 'cf') {
        const fd2 = new FormData(); fd2.append('file', f);
        const ok2 = await new Promise(res => { const x = new XMLHttpRequest(); x.open('POST', sg.uploadURL); x.upload.onprogress = e => $('i', pb).style.width = (e.loaded / e.total * 100) + '%'; x.onload = () => res(x.status < 300); x.onerror = () => res(false); x.send(fd2); });
        if (!ok2) { $('#pub', s).disabled = false; return toast('فشل الرفع، جرّب تاني'); }
        const r2 = await post('social', { action: 'publish', uid: sg.uid, caption: cap, duration: dur, category }); if (!r2.ok) return toast(r2.error);
        closeSheet(); toast('اتنشر 🎉'); show('home'); return loadFeed();
      }
      const fd = new FormData(); fd.append('cacheControl', '3600'); fd.append('', f);
      const ok = await new Promise(res => { const x = new XMLHttpRequest(); x.open('PUT', sg.signedUrl); x.upload.onprogress = e => $('i', pb).style.width = (e.loaded / e.total * 100) + '%'; x.onload = () => res(x.status < 300); x.onerror = () => res(false); x.send(fd); });
      if (!ok) { $('#pub', s).disabled = false; return toast('فشل الرفع، جرّب تاني'); }
      const r = await post('social', { action: 'publish', path: sg.path, caption: cap, duration: dur, category }); if (!r.ok) return toast(r.error);
      closeSheet(); toast('اتنشر 🎉'); show('home'); loadFeed();
    };
  }; inp.click();
}

/* ---------- live ---------- */
let lk = null; async function lkLib() { if (window.LivekitClient) return; await new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/livekit-client@2/dist/livekit-client.umd.min.js'; s.onload = ok; s.onerror = no; document.head.appendChild(s); }); }
function triggerMrJooEntry() {
  const streamContainer = document.getElementById('live-stream-container') || document.getElementById('live');
  if (!streamContainer) return;
  const overlay = document.createElement('div');
  overlay.className = 'mrjoo-entry-effect';
  overlay.innerHTML = '<div class="creepy-text">👑 MRJOO pro SYSTEM OVERRIDE 👑</div>';
  streamContainer.appendChild(overlay);
  setTimeout(() => { overlay.style.opacity = '0'; setTimeout(() => overlay.remove(), 1000); }, 4500);
}

function liveUI(title, host, hostName, isHost) {
  const s = stage(`<div id="live" style="position:absolute;inset:0"><video class="main" playsinline autoplay muted></video><div class="ov">
  <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding-inline-start:84px"><span class="chip"><span style="color:var(--red)">●</span> مباشر</span><span class="chip">👁 <span id="vc">١</span></span></div>
  <div><div id="goal" style="display:none;margin-bottom:8px" class="chip" style="width:100%"><span>🎯 الهدف</span><div class="bar" style="width:120px"><i id="gbar" style="width:0"></i></div><b id="gt"></b></div>
  <div id="chat"></div><div style="display:flex;gap:8px;margin-top:8px"><input id="lm" placeholder="اكتب رسالة..." maxlength="140" style="background:#0009">
  <button class="btn" id="ls">أرسل</button>${isHost ? '' : '<button class="btn" id="lg" style="background:var(--red);color:#fff">🎁</button>'}</div></div></div></div>`, () => { lk?.disconnect?.(); lk?.local?.getTracks?.().forEach(t => t.stop()); lk = null; if (isHost) post('live', { action: 'end' }); });
  return s;
}
const chatAdd = (s, who, txt) => { const c = $('#chat', s); const p = document.createElement('p'); p.innerHTML = `<b>${esc(who)}</b> ${esc(txt)}`; c.appendChild(p); while (c.children.length > 8) c.firstChild.remove(); };
let goalTotal = 0, goalMax = 0; function goalDraw(s) { if (!goalMax) return; $('#goal', s).style.display = 'flex'; $('#gbar', s).style.width = Math.min(100, goalTotal / goalMax * 100) + '%'; $('#gt', s).textContent = fmt(goalTotal) + '/' + fmt(goalMax); }
async function connectRoom(s, info, isHost, hostName) {
  const mainV = $('video.main', s); const send = o => lk?.room?.localParticipant?.publishData(new TextEncoder().encode(JSON.stringify(o)), { reliable: true });
  const onMsg = m => { if (m.t === 'chat') chatAdd(s, m.u, m.x); if (m.t === 'gift') { fly(m.e); chatAdd(s, m.u, 'بعت ' + m.e + ' ×' + (m.n || 1)); goalTotal += m.c || 0; goalDraw(s); } if (m.t === 'goal') { goalMax = m.g; goalTotal = m.cur || 0; goalDraw(s); } };
  let room = null;
  if (info) { await lkLib(); const { Room, RoomEvent, Track } = LivekitClient; room = new Room({ adaptiveStream: true, dynacast: true }); await room.connect(info.url, info.token);
    const count = () => $('#vc', s).textContent = fmt(room.numParticipants || room.remoteParticipants.size + 1);
    room.on(RoomEvent.ParticipantConnected, count).on(RoomEvent.ParticipantDisconnected, count); count();
    room.on(RoomEvent.TrackSubscribed, t => { if (t.kind === 'video') { t.attach(mainV); mainV.muted = false; } else t.attach(); });
    room.on(RoomEvent.DataReceived, p => { try { onMsg(JSON.parse(new TextDecoder().decode(p))); } catch { } });
    if (isHost) { await room.localParticipant.enableCameraAndMicrophone(); const pub = room.localParticipant.getTrackPublication(Track.Source.Camera); pub?.track?.attach(mainV); }
    lk = { room, disconnect: () => room.disconnect(), local: null };
  } else if (isHost) { const st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true }).catch(() => null); if (!st) { toast('اسمح بالكاميرا والمايك'); return; } mainV.srcObject = st; lk = { local: st, disconnect() { } }; }
  const me = () => S.me?.username || 'ضيف';
  const sendChat = () => { const i = $('#lm', s), x = i.value.trim(); if (!x) return; i.value = ''; const m = { t: 'chat', u: me(), x }; chatAdd(s, m.u, m.x); send(m); };
  $('#ls', s).onclick = sendChat; $('#lm', s).onkeydown = e => e.key === 'Enter' && sendChat();
  if (!isHost) $('#lg', s).onclick = () => openGifts({ to: info?.hostId, live: info?.liveId, name: hostName }, k => { const g = S.cfg.gifts[k]; const m = { t: 'gift', u: me(), e: g.emoji, c: g.coins, n: 1 }; onMsg(m); send(m); });
  else if (info) { const g = parseInt(prompt('هدف البث بالعملات (اختياري):', '500')) || 0; if (g) { goalMax = g; goalTotal = 0; goalDraw(s); setInterval(() => send({ t: 'goal', g: goalMax, cur: goalTotal }), 5000); } }
}
async function goLive() {
  if (needLogin()) return; const title = prompt('عنوان البث:', 'بث جديد من مستر جو') || 'بث مباشر'; goalTotal = goalMax = 0;
  let info = null; if (S.live) { const r = await post('live', { title }); if (!r.ok) { if (r.error !== 'live_not_configured') return toast(r.error); toast('البث الحقيقي محتاج LiveKit — ده وضع معاينة'); } else info = r; }
  const s = liveUI(title, null, S.me?.username, true); triggerMrJooEntry(); await connectRoom(s, info, true, S.me?.username);
}
async function watchLive(d) {
  if (needLogin()) return; goalTotal = goalMax = 0; const j = await api('live?room=' + d.room); if (!j.ok) return toast(j.error);
  const s = liveUI('', d.u, '', false); await connectRoom(s, { ...j, hostId: d.u, liveId: d.id }, false, '');
}

/* ---------- creators hub ---------- */
async function renderHub() {
  const v = $('#v-hub');
  if (S.live && !S.tok) { v.innerHTML = `<div class="page"><div class="empty"><div class="big">مركز المبدعين</div><p style="margin-bottom:16px">سجّل دخول عشان تشوف أرباحك وتحدياتك</p><button class="btn" onclick="openAuth()">دخول / حساب جديد</button></div></div>`; return; }
  await loadMe(); const j = await api('hub'); const m = S.me || { paid: 0, bonus: 0, cash: 0 }, c = S.cfg;
  v.innerHTML = `<div class="page">
  <div class="season" style="margin-bottom:12px"><div class="mute">رصيد قابل للسحب</div><div style="font-size:38px;font-weight:900;line-height:1.2">${fmt(m.cash)} <span style="font-size:18px">جنيه</span></div>
  <div style="display:flex;gap:8px;margin-top:12px"><button class="btn" id="wd">اسحب فودافون كاش</button><button class="btn alt" id="dp">اشحن عملات</button></div></div>
  <div class="grid2"><div class="panel stat"><span class="mute">عملات مشتراة</span><b>${fmt(m.paid)}</b></div><div class="panel stat"><span class="mute">عملات مجانية</span><b>${fmt(m.bonus)}</b></div></div>
  <h3>سلسلة النجاح</h3>
  <div class="panel"><div class="row" style="padding-top:0"><div><b>🔥 ${fmt(j.streak || 0)} يوم متواصل</b><div class="mute">تسجيل يومي = ٥ عملات × أيام السلسلة (حتى ٣٥)</div></div><button class="btn" id="ck" ${j.checkedIn ? 'disabled' : ''}>${j.checkedIn ? 'اتسجّل ✓' : 'سجّل النهارده'}</button></div>
  ${(j.challenges || []).map(ch => `<div class="row" style="display:block"><div style="display:flex;justify-content:space-between;gap:8px"><b>${esc(ch.t)}</b><span class="mute">+${fmt(ch.reward)} 🪙</span></div><div class="bar" style="margin:8px 0"><i style="width:${ch.progress / ch.goal * 100}%"></i></div><div style="display:flex;justify-content:space-between;align-items:center"><span class="mute">${fmt(ch.progress)} / ${fmt(ch.goal)}</span><button class="btn" data-ch="${ch.id}" style="padding:6px 14px" ${ch.claimed || ch.progress < ch.goal ? 'disabled' : ''}>${ch.claimed ? 'اتاخدت ✓' : 'خد المكافأة'}</button></div></div>`).join('')}
  <p class="mute">التحديات بتتغير كل أسبوع — الأسبوع الجاي مختلف.</p></div>
  <h3>أرقامك كمبدع</h3>
  <div class="grid2"><div class="panel stat"><span class="mute">مشاهدات</span><b>${fmt(j.stats?.views)}</b></div><div class="panel stat"><span class="mute">لايكات</span><b>${fmt(j.stats?.likes)}</b></div><div class="panel stat"><span class="mute">تعليقات</span><b>${fmt(j.stats?.comments)}</b></div><div class="panel stat"><span class="mute">هدايا (عملات)</span><b>${fmt(j.stats?.gifts)}</b></div></div>
  <h3>صندوق المبدعين الأسبوعي</h3>
  <div class="panel"><div class="row" style="padding-top:0"><span>الصندوق الحالي</span><b>${fmt(j.fund)} ج</b></div><div class="row"><span>نقاطك (من هدايا العملات المجانية)</span><b>${fmt(j.points)}</b></div><div class="row"><span>نصيبك المتوقع</span><b class="up">${fmt(j.estShare)} ج</b></div>
  <p class="mute">الصندوق بيتمول من نسبة من إيرادات الإعلانات الفعلية، وبيتوزع ١٠٠٪ بالنقاط كل أحد وبيتصفّر.</p></div>
  <button class="btn alt block" id="hist" style="margin-top:12px">سجل الحركات والطلبات</button></div>`;
  $('#wd').onclick = openWithdraw; $('#dp').onclick = openDeposit;
  $('#ck').onclick = async () => { const r = await post('hub', { action: 'checkin' }); if (!r.ok) return toast(r.error); toast(`+${fmt(r.reward)} عملة — سلسلة ${fmt(r.streak)} 🔥`); renderHub(); };
  $$('[data-ch]').forEach(b => b.onclick = async () => { const r = await post('hub', { action: 'claim', id: b.dataset.ch }); if (!r.ok) return toast(r.error); toast(`+${fmt(r.reward)} عملة 🎉`); renderHub(); });
  $('#hist').onclick = async () => { const w = await api('wallet'); const st = { pending: 'قيد المراجعة', approved: 'اتأكد', paid: 'اتحوّل ✓', rejected: 'مرفوض' }; sheet(`<h2>طلباتك</h2>${[...(w.deposits || []).map(x => `<div class="row"><span>شحن ${fmt(x.amount_egp)} ج</span><span class="mute">${st[x.status]}</span></div>`), ...(w.withdrawals || []).map(x => `<div class="row"><span>سحب ${fmt(x.amount_egp)} ج</span><span class="mute">${st[x.status]}${x.note ? ' — ' + esc(x.note) : ''}</span></div>`)].join('') || '<div class="empty">مفيش طلبات</div>'}`); };
}

/* ---------- me ---------- */
async function renderMe() {
  const v = $('#v-me');
  if (S.live && !S.tok) { v.innerHTML = `<div class="page"><div class="empty"><div class="big">حسابي</div><button class="btn" onclick="openAuth()">دخول / حساب جديد</button></div></div>`; return; }
  await loadMe(); const m = S.me || { username: 'ضيف', followers: 0 }, vids = S.live ? (S.myVids || []) : S.d.vids;
  v.innerHTML = `<div class="page" style="text-align:center"><div class="av" style="position:relative;width:84px;height:84px;margin:6px auto;border-radius:50%;background:var(--tea);display:grid;place-items:center;font-size:34px;font-weight:900;color:#1a0f05">${esc((m.display_name || m.username || '؟')[0])}<span class="pro52">52</span></div>
  <h2 style="margin:6px 0 0">MRJOO <span style="color:#f33;font-style:italic">pro</span></h2><p class="mute">@${esc(m.username)}</p><p class="mute">${esc(m.bio || '')}</p><p class="mute">${fmt(m.followers)} متابع</p>
  <div style="display:flex;gap:8px;justify-content:center;margin:12px 0"><button class="btn alt" id="ed">تعديل</button><button class="btn alt" id="ins" style="display:none">ثبّت التطبيق</button>${S.live ? '<button class="btn alt" id="lo">خروج</button>' : ''}</div></div>
  <div class="vgrid" style="padding:0 3px 20px">${vids.map(x => `<div><video src="${esc(x.video_url)}#t=0.1" preload="metadata" muted playsinline></video><small>▶ ${fmt(x.views)}</small></div>`).join('') || '<div class="empty" style="grid-column:1/-1">لسه منشرتش حاجة</div>'}</div>`;
  $('#ed').onclick = () => { if (!S.live) return toast('backend_not_configured'); const s = sheet(`<h2>تعديل الحساب</h2><label>اسم المستخدم</label><input id="eu" dir="ltr" value="${esc(m.username)}"><label>الاسم</label><input id="en" value="${esc(m.display_name || '')}"><label>نبذة</label><input id="eb" maxlength="160" value="${esc(m.bio || '')}"><button class="btn block" id="es" style="margin-top:14px">حفظ</button>`); $('#es', s).onclick = async () => { const r = await post('me', { username: $('#eu', s).value.trim().toLowerCase(), display_name: $('#en', s).value, bio: $('#eb', s).value }); if (!r.ok) return toast(r.error); closeSheet(); renderMe(); }; };
  $('#lo')?.addEventListener('click', () => { localStorage.removeItem('tok'); localStorage.removeItem('rt'); S.tok = ''; S.me = null; updateCoins(); loadFeed(); renderMe(); });
  if (window._ip) { const b = $('#ins'); b.style.display = ''; b.onclick = () => window._ip.prompt(); }
}
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); window._ip = e; });

/* ---------- demo mode (بدون سيرفر): كل شيء محلي للمعاينة ---------- */
const DEMO_VIDS = [
  ['https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', 'زهرة بتتفتح 🌼 #تجريبي', 'joo', 'مستر جو'],
  ['https://www.w3schools.com/html/mov_bbb.mp4', 'فيديو تجريبي تاني #مستر_جو', 'tea', 'شاي وسكر'],
];
const dm = (() => {
  const px = (k, t = Date.now()) => { const A = { GOLD: [3200, .02], BTC: [65000, .06], USD: [50, .015], TEA: [12, .05], SUGAR: [8, .04] }[k], i = Object.keys({ GOLD: 1, BTC: 1, USD: 1, TEA: 1, SUGAR: 1 }).indexOf(k) + 1, m = t / 60000; return +(A[0] * (1 + A[1] * (Math.sin(m / 37 + i) + .6 * Math.sin(m / 11 + i * 2) + .3 * Math.sin(m / 5 + i * 3)))).toFixed(A[0] < 100 ? 3 : 2); };
  const all = () => Object.fromEntries(['GOLD', 'BTC', 'USD', 'TEA', 'SUGAR'].map(k => [k, px(k)]));
  return { px, all };
})();
async function demo(path, method, body) {
  const D = S.d, [p, qs] = path.split('?'), q = new URLSearchParams(qs || ''), me = () => ({ id: 'me', username: 'ضيف', display_name: 'ضيف', followers: 0, paid: D.paid, bonus: D.bonus, cash: D.cash, points: 0 });
  const NA = { ok: false, error: 'backend_not_configured' };
  if (p === 'feed') return { ok: true, feed: [...D.vids, ...DEMO_VIDS.map((x, i) => ({ id: 'd' + i, user_id: 'u' + i, video_url: x[0], caption: x[1], likes: 120 + i * 37, comments: 8, views: 900, liked: !!D.likes['d' + i], following: !!D.follows['u' + i], profiles: { username: x[2], display_name: x[3] } }))] };
  if (p === 'me') return { ok: true, me: me(), videos: D.vids };
  if (p === 'social') {
    if (method === 'GET') return { ok: true, comments: [{ body: 'تعليق تجريبي 👏', profiles: { username: 'joo', display_name: 'ج' } }] };
    if (body.action === 'like') { const l = !D.likes[body.video]; D.likes[body.video] = l; save(); return { ok: true, liked: l, likes: 120 + (l ? 1 : 0) }; }
    if (body.action === 'follow') { const f = !D.follows[body.user]; D.follows[body.user] = f; save(); return { ok: true, following: f }; }
    if (body.action === 'view') return { ok: true }; return { ok: true };
  }
  if (p === 'gifts/send') { const g = S.cfg.gifts[body.gift]; if (D.paid + D.bonus < g.coins) return { ok: false, error: 'insufficient' }; const b = Math.min(D.bonus, g.coins); D.bonus -= b; D.paid -= g.coins - b; save(); return { ok: true, paid: D.paid, bonus: D.bonus }; }
  if (p === 'games') {
    if (body.action === 'start') return { ok: true, id: Date.now() + '', t0: Date.now() };
    if (body.action === 'finish') { const g = body.score; const r = body.id && D.earned < 250 ? Math.min(g > 1 ? Math.floor(g / 3) : 2, 25) : 0; D.bonus += r; D.earned += r; save(); return { ok: true, reward: r, score: g }; }
  }
  if (p === 'trade') {
    const px = dm.all(), eq = () => D.tr.cash + Object.entries(D.tr.pos).reduce((t, [k, qn]) => t + qn * px[k], 0);
    if (method === 'POST') { const pr = px[body.sym]; if (body.side === 'buy') { const c = body.qty * pr * 1.001; if (c > D.tr.cash) return { ok: false, error: 'no_cash' }; D.tr.cash -= c; D.tr.pos[body.sym] = (D.tr.pos[body.sym] || 0) + body.qty; } else { if ((D.tr.pos[body.sym] || 0) < body.qty - 1e-9) return { ok: false, error: 'no_position' }; D.tr.cash += body.qty * pr * .999; D.tr.pos[body.sym] -= body.qty; } save(); return { ok: true, price: pr, account: { cash: D.tr.cash, positions: D.tr.pos, equity: eq() } }; }
    return { ok: true, prices: px, assets: { GOLD: 'ذهب', BTC: 'بيتكوين', USD: 'دولار / جنيه', TEA: 'شاي', SUGAR: 'سكر' }, account: { cash: D.tr.cash, positions: D.tr.pos, equity: eq() }, start: 10000, board: [{ user: 'ضيف', equity: eq(), me: true }] };
  }
  if (p === 'hub') {
    if (body?.action === 'checkin') { const t = new Date().toISOString().slice(0, 10); if (D.ck === t) return { ok: false, error: 'already' }; D.ck = t; D.bonus += 5; save(); return { ok: true, reward: 5, streak: 1 }; }
    return { ok: true, streak: D.ck ? 1 : 0, checkedIn: D.ck === new Date().toISOString().slice(0, 10), challenges: [{ id: 'a', t: 'العب ٣ جولات (تجريبي)', goal: 3, progress: 0, reward: 40 }], stats: { views: 0, likes: 0, comments: 0, gifts: 0 }, points: 0, fund: 0, estShare: 0 };
  }
  return NA;
}

/* ---------- boot ---------- */
(async function init() {
  try { const r = await fetch('/api/config'); const j = await r.json(); if (j.ok) { S.cfg = j; S.live = !!j.live && !!j.anonKey; } } catch { }
  if (!S.cfg.gifts || !Object.keys(S.cfg.gifts).length) S.cfg = { ...S.cfg, coinPrice: .1, minWithdraw: 50, week: 'تجريبي', gifts: { tea: { emoji: '☕', name: 'شاي', coins: 1 }, sugar: { emoji: '🍬', name: 'سكر', coins: 5 }, salt: { emoji: '🧂', name: 'ملح', coins: 10 }, palette: { emoji: '🎨', name: 'لوحة', coins: 100 } } };
  if (S.cfg.adsenseClient) { const s = document.createElement('script'); s.async = true; s.crossOrigin = 'anonymous'; s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(S.cfg.adsenseClient); document.head.appendChild(s); }
  if (!S.live) toast('وضع معاينة — فعّل الباك إند لتشغيل كل شيء حقيقي');
  if (S.live && S.tok) await loadMe(); else if (!S.live) { S.me = { paid: S.d.paid, bonus: S.d.bonus }; updateCoins(); }
  loadFeed();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => { });
})();
