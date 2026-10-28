-- Jo1 schema (Supabase). شغّله مرة واحدة في SQL Editor.
create table profiles(id uuid primary key references auth.users on delete cascade, username text unique, bio text default '', avatar_url text, coins int not null default 0 check(coins>=0), diamonds int not null default 0 check(diamonds>=0), bonus int not null default 0 check(bonus>=0), is_admin bool not null default false);
create table app_settings(id int primary key default 1 check(id=1), coins_per_egp int default 10, diamonds_per_egp int default 100, min_withdraw_diamonds int default 1000, vodafone_number text, maintenance bool default false);
insert into app_settings(id) values(1);
create table videos(id bigint generated always as identity primary key, user_id uuid references profiles, url text not null, caption text default '', created_at timestamptz default now());
create index on videos(created_at desc);
create table rooms(id bigint generated always as identity primary key, host_id uuid references profiles, title text, is_live bool default true, created_at timestamptz default now());
create table messages(id bigint generated always as identity primary key, room_id bigint references rooms, user_id uuid references profiles, body text check(length(body)<=300), created_at timestamptz default now());
create index on messages(room_id,id);
create table gifts(id int primary key, name text, img text, price int, real bool default false);
create table gift_sends(id bigint generated always as identity primary key, sender_id uuid, receiver_id uuid, room_id bigint, gift_id int references gifts, created_at timestamptz default now());
create index on gift_sends(room_id); create index on gift_sends(receiver_id);
create table ledger(id bigint generated always as identity primary key, user_id uuid references profiles, kind text, amount int, created_at timestamptz default now());
create table deposits(id bigint generated always as identity primary key, user_id uuid references profiles, amount_egp int, coins int, vf_number text, tx_ref text unique, status text default 'pending', note text, created_at timestamptz default now());
create table withdrawals(id bigint generated always as identity primary key, user_id uuid references profiles, diamonds int, amount_egp int, vf_number text, status text default 'pending', note text, created_at timestamptz default now());
create table shipments(id bigint generated always as identity primary key, user_id uuid, gift_id int, name text, phone text, address text, status text default 'new', created_at timestamptz default now());

-- الهدايا: شغّل gifts_seed.sql بعد هذا الملف.

create function send_gift(p_room bigint,p_gift int,p_to uuid,p_name text default null,p_phone text default null,p_addr text default null) returns void language plpgsql security definer set search_path=public as $$
declare g gifts; v_b int; v_p int; begin
if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
if p_to=auth.uid() then raise exception 'SELF_GIFT'; end if;
select * into g from gifts where id=p_gift; if not found then raise exception 'NO_GIFT'; end if;
if g.real and (coalesce(p_name,'')='' or coalesce(p_phone,'')='' or coalesce(p_addr,'')='') then raise exception 'SHIP_INFO'; end if;
select least(bonus,g.price) into v_b from profiles where id=auth.uid() for update;
if g.real then v_b:=0; end if; -- الهدايا الحقيقية تُدفع بعملات مدفوعة فقط
v_p:=g.price-coalesce(v_b,0);
update profiles set bonus=bonus-v_b, coins=coins-v_p where id=auth.uid() and coins>=v_p; if not found then raise exception 'INSUFFICIENT_COINS'; end if;
if v_p/2>0 then update profiles set diamonds=diamonds+v_p/2 where id=p_to; insert into ledger(user_id,kind,amount) values(p_to,'gift_in',v_p/2); end if; -- عملات المكافأة لا تنتج ألماسًا
insert into gift_sends(sender_id,receiver_id,room_id,gift_id) values(auth.uid(),p_to,p_room,p_gift);
insert into ledger(user_id,kind,amount) values(auth.uid(),'gift_out',g.price);
if g.real then insert into shipments(user_id,gift_id,name,phone,address) values(auth.uid(),p_gift,p_name,p_phone,p_addr); end if;
end $$;

create function request_deposit(p_amount_egp int,p_vf_number text,p_tx_ref text) returns bigint language plpgsql security definer set search_path=public as $$
declare s app_settings; r bigint; begin
if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
if p_amount_egp is null or p_amount_egp<=0 then raise exception 'BAD_AMOUNT'; end if;
if p_vf_number !~ '^01[0-9]{9}$' then raise exception 'BAD_VF_NUMBER'; end if;
if length(trim(coalesce(p_tx_ref,'')))<6 then raise exception 'BAD_TX_REFERENCE'; end if;
if (select count(*) from deposits where user_id=auth.uid() and status='pending')>=3 then raise exception 'TOO_MANY_PENDING'; end if;
select * into s from app_settings where id=1;
insert into deposits(user_id,amount_egp,coins,vf_number,tx_ref) values(auth.uid(),p_amount_egp,p_amount_egp*s.coins_per_egp,p_vf_number,trim(p_tx_ref)) returning id into r; return r; end $$;

create function request_withdrawal(p_diamonds int,p_vf_number text) returns bigint language plpgsql security definer set search_path=public as $$
declare s app_settings; r bigint; begin
if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
if p_vf_number !~ '^01[0-9]{9}$' then raise exception 'BAD_VF_NUMBER'; end if;
select * into s from app_settings where id=1;
if p_diamonds is null or p_diamonds<s.min_withdraw_diamonds then raise exception 'BELOW_MINIMUM'; end if;
update profiles set diamonds=diamonds-p_diamonds where id=auth.uid() and diamonds>=p_diamonds; if not found then raise exception 'INSUFFICIENT_DIAMONDS'; end if;
insert into withdrawals(user_id,diamonds,amount_egp,vf_number) values(auth.uid(),p_diamonds,p_diamonds/s.diamonds_per_egp,p_vf_number) returning id into r;
insert into ledger(user_id,kind,amount) values(auth.uid(),'withdraw',p_diamonds); return r; end $$;

create function admin_review_deposit(p_id bigint,p_approve bool,p_note text default null) returns void language plpgsql security definer set search_path=public as $$
declare d deposits; begin
if not coalesce((select is_admin from profiles where id=auth.uid()),false) then raise exception 'NOT_ADMIN'; end if;
select * into d from deposits where id=p_id and status='pending' for update; if not found then raise exception 'NOT_PENDING'; end if;
update deposits set status=case when p_approve then 'approved' else 'rejected' end, note=p_note where id=p_id;
if p_approve then update profiles set coins=coins+d.coins where id=d.user_id; insert into ledger(user_id,kind,amount) values(d.user_id,'deposit',d.coins); end if; end $$;

create function admin_review_withdrawal(p_id bigint,p_paid bool,p_note text default null) returns void language plpgsql security definer set search_path=public as $$
declare w withdrawals; begin
if not coalesce((select is_admin from profiles where id=auth.uid()),false) then raise exception 'NOT_ADMIN'; end if;
select * into w from withdrawals where id=p_id and status='pending' for update; if not found then raise exception 'NOT_PENDING'; end if;
update withdrawals set status=case when p_paid then 'paid' else 'rejected' end, note=p_note where id=p_id;
if not p_paid then update profiles set diamonds=diamonds+w.diamonds where id=w.user_id; end if; end $$;
revoke execute on function admin_review_deposit,admin_review_withdrawal from anon;

alter table profiles enable row level security; alter table app_settings enable row level security; alter table videos enable row level security; alter table rooms enable row level security; alter table messages enable row level security; alter table gifts enable row level security; alter table gift_sends enable row level security; alter table ledger enable row level security; alter table deposits enable row level security; alter table withdrawals enable row level security; alter table shipments enable row level security;
create policy p1 on profiles for select using(true);
create policy p2 on profiles for insert with check(id=auth.uid() and coins=0 and diamonds=0 and bonus=0 and not is_admin);
create policy p3 on profiles for update using(id=auth.uid()) with check(id=auth.uid() and coins=(select coins from profiles where id=auth.uid()) and diamonds=(select diamonds from profiles where id=auth.uid()) and bonus=(select bonus from profiles where id=auth.uid()) and is_admin=(select is_admin from profiles where id=auth.uid()));
create policy a1 on app_settings for select using(true);
create policy v1 on videos for select using(true); create policy v2 on videos for insert with check(user_id=auth.uid());
create policy o1 on rooms for select using(true); create policy o2 on rooms for insert with check(host_id=auth.uid()); create policy o3 on rooms for update using(host_id=auth.uid());
create policy m1 on messages for select using(true); create policy m2 on messages for insert with check(user_id=auth.uid());
create policy g1 on gifts for select using(true);
create policy gs on gift_sends for select using(true);
create policy l1 on ledger for select using(user_id=auth.uid());
create policy d1 on deposits for select using(user_id=auth.uid() or coalesce((select is_admin from profiles where id=auth.uid()),false));
create policy w1 on withdrawals for select using(user_id=auth.uid() or coalesce((select is_admin from profiles where id=auth.uid()),false));
create policy s1 on shipments for select using(user_id=auth.uid() or coalesce((select is_admin from profiles where id=auth.uid()),false));

-- مداخل المبدعين: مكافآت يومية (عملات مكافأة غير قابلة للسحب ولا تنتج ألماسًا) + إعجابات
create table daily_claims(user_id uuid references profiles, kind text, day date default (now() at time zone 'utc')::date, reward int, primary key(user_id,kind,day));
create table video_likes(video_id bigint references videos on delete cascade, user_id uuid references profiles, primary key(video_id,user_id));
create function claim_daily(p_kind text) returns int language plpgsql security definer set search_path=public as $$
declare r int; begin
if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
r:=case p_kind when 'checkin' then 20 when 'game' then 15 when 'wheel' then 10+floor(random()*41)::int else null end;
if r is null then raise exception 'BAD_KIND'; end if;
begin insert into daily_claims(user_id,kind,reward) values(auth.uid(),p_kind,r);
exception when unique_violation then raise exception 'ALREADY_CLAIMED'; end;
update profiles set bonus=bonus+r where id=auth.uid(); return r; end $$;
alter table daily_claims enable row level security; alter table video_likes enable row level security;
create policy dc1 on daily_claims for select using(user_id=auth.uid());
create policy vl1 on video_likes for select using(true); create policy vl2 on video_likes for insert with check(user_id=auth.uid()); create policy vl3 on video_likes for delete using(user_id=auth.uid());
alter publication supabase_realtime add table messages, gift_sends;

-- بعد التسجيل: حدّث رقمك وخليك أدمن (من SQL Editor فقط):
-- update app_settings set vodafone_number='01XXXXXXXXX' where id=1;
-- update profiles set is_admin=true where username='YOUR_USERNAME';
