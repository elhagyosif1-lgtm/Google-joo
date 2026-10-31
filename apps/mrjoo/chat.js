/* v3.1: دردشة فردية/جماعية + أصدقاء + أقسام المحتوى + تشغيل HLS */
const CATS = [['general', 'الكل'], ['info', 'معلومات'], ['lessons', 'دروس'], ['nature', 'طبيعة'], ['animals', 'حيوانات'], ['tech', 'تكنولوجيا'], ['skills', 'مهارات'], ['funny', 'ترفيه']];
{
  const b = document.createElement('button'); b.className = 'chip'; b.textContent = '💬'; b.setAttribute('aria-label', 'الدردشة');
  b.onclick = () => chatList(); $('#top').insertBefore(b, $('#coins'));
  const re = renderExplore;
  renderExplore = async function () {
    await re(); const v = $('#v-explore'); if (!v || $('.cats', v)) return;
    const d = document.createElement('div'); d.className = 'cats'; d.style.cssText = 'display:flex;gap:8px;overflow-x:auto;padding:12px 14px 0';
    d.innerHTML = CATS.map(c => `<button class="chip${(S.cat || 'general') === c[0] ? ' on' : ''}" data-c="${c[0]}" style="white-space:nowrap">${c[1]}</button>`).join('');
    d.onclick = e => { const x = e.target.closest('button'); if (!x) return; S.cat = x.dataset.c === 'general' ? '' : x.dataset.c; show('home'); loadFeed(); };
    v.prepend(d);
  };
  new MutationObserver(() => $$('video').forEach(v => { // فيديو Cloudflare (HLS): أصلي في سفاري، hls.js في الباقي
    const src = v.getAttribute('src') || ''; if (!src.endsWith('.m3u8') || v._h || v.canPlayType('application/vnd.apple.mpegurl')) return; v._h = 1;
    const go = () => { const h = new Hls({ maxBufferLength: 8 }); h.loadSource(src); h.attachMedia(v); }; v.removeAttribute('src');
    if (window.Hls) go(); else { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/hls.js@1/dist/hls.min.js'; s.onload = go; document.head.appendChild(s); }
  })).observe($('#feed'), { childList: true, subtree: true });
}
async function chatList() {
  if (!S.live) return toast('الدردشة محتاجة الربط الحقيقي (README)'); if (needLogin()) return;
  const s = sheet('<h2>الدردشة</h2><div style="display:flex;gap:8px"><button class="btn" id="cn">صديق جديد</button><button class="btn alt" id="cg">مجموعة</button></div><h3>أصدقاؤك</h3><div id="fr" class="mute">...</div><h3>المحادثات</h3><div id="cl" class="mute">...</div>');
  $('#cn', s).onclick = async () => { const u = (prompt('اسم المستخدم (بدون @)') || '').trim().replace('@', ''); if (u) openDm(u); };
  $('#cg', s).onclick = async () => { const t = prompt('اسم المجموعة'); if (!t) return; const us = (prompt('أسماء الأعضاء مفصولة بمسافة') || '').split(/\s+/).map(x => x.replace('@', '')).filter(Boolean); const r = await post('chat', { action: 'group', title: t, usernames: us }); r.ok ? chatRoom(r.id, t) : toast(r.error); };
  const [c, f] = await Promise.all([api('chat'), api('chat?friends=1')]);
  $('#cl', s).innerHTML = (c.convs || []).map(x => `<button class="panel" data-id="${x.id}" data-t="${esc(x.title)}" style="width:100%;text-align:right;display:block;margin-bottom:8px"><b>${x.is_group ? '👥 ' : ''}${esc(x.title)}</b><div class="mute">${esc(x.last.slice(0, 40))}</div></button>`).join('') || 'لسه مفيش محادثات';
  $('#fr', s).innerHTML = (f.friends || []).map(x => `<button class="chip" data-u="${esc(x.username)}">@${esc(x.username)}</button>`).join(' ') || 'الأصدقاء = ناس بتتابعوا بعض';
  s.onclick = e => { const a = e.target.closest('[data-id]'), u = e.target.closest('[data-u]'); if (a) chatRoom(a.dataset.id, a.dataset.t); else if (u) openDm(u.dataset.u); };
}
async function openDm(u) { const r = await post('chat', { action: 'dm', username: u }); r.ok ? chatRoom(r.id, r.title) : toast('مفيش مستخدم بالاسم ده'); }
function chatRoom(id, title) {
  closeSheet(); let last = 0;
  const s = sheet(`<h2>${esc(title)}</h2><div id="ms" style="height:50dvh;overflow-y:auto;display:flex;flex-direction:column;gap:6px"></div><div style="display:flex;gap:8px;margin-top:10px"><input id="mi" maxlength="500" placeholder="اكتب رسالة" style="flex:1"><button class="btn" id="mb">إرسال</button></div>`);
  const box = $('#ms', s), poll = async () => {
    if (!document.body.contains(s)) return; const r = await api(`chat?conv=${id}&after=${last}`);
    (r.messages || []).forEach(m => { last = m.id; const mine = m.user_id === S.me?.id; const d = document.createElement('div'); d.style.cssText = `align-self:${mine ? 'flex-start' : 'flex-end'};background:${mine ? '#c17f2e' : '#ffffff18'};padding:7px 12px;border-radius:14px;max-width:80%`; d.innerHTML = `${mine ? '' : `<small class="mute">${esc(m.profiles?.display_name || '')}</small><br>`}${esc(m.body)}`; box.appendChild(d); });
    if (r.messages?.length) box.scrollTop = 1e9; setTimeout(poll, 3000);
  };
  const send = async () => { const i = $('#mi', s), t = i.value.trim(); if (!t) return; i.value = ''; const r = await post('chat', { action: 'send', conv: id, body: t }); if (!r.ok) toast(r.error); };
  $('#mb', s).onclick = send; $('#mi', s).onkeydown = e => { if (e.key === 'Enter') send(); }; poll();
}
