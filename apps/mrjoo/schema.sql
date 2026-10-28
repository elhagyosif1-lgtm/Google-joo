-- MR JOO WORLD v3 — شغّله مرة واحدة في Supabase → SQL Editor
-- ملاحظة: في Authentication → Providers → Email عطّل "Confirm email" للبداية السريعة.

create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text, avatar_url text, bio text,
  paid_coins  int not null default 0 check (paid_coins  >= 0),   -- عملات مشتراة (تتحول لنقود للمبدع)
  bonus_coins int not null default 0 check (bonus_coins >= 0),   -- عملات مجانية (تتحول لنقاط في صندوق المبدعين)
  cash_egp numeric(12,2) not null default 0 check (cash_egp >= 0), -- رصيد قابل للسحب
  points int not null default 0,
  followers int not null default 0,
  created_at timestamptz default now()
);
create table if not exists videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  caption text, video_url text not null, thumb_url text, duration numeric default 0,
  views int default 0, likes int default 0, comments int default 0, gifts_coins int default 0,
  created_at timestamptz default now()
);
create index if not exists videos_created on videos (created_at desc);
create index if not exists videos_user on videos (user_id);
create table if not exists likes (video_id uuid references videos(id) on delete cascade, user_id uuid references profiles(id) on delete cascade, created_at timestamptz default now(), primary key (video_id, user_id));
create table if not exists comments (id uuid primary key default gen_random_uuid(), video_id uuid references videos(id) on delete cascade, user_id uuid references profiles(id) on delete cascade, body text not null, created_at timestamptz default now());
create index if not exists comments_video on comments (video_id, created_at desc);
create table if not exists follows (follower_id uuid references profiles(id) on delete cascade, followee_id uuid references profiles(id) on delete cascade, created_at timestamptz default now(), primary key (follower_id, followee_id));
create table if not exists gifts (id uuid primary key default gen_random_uuid(), sender_id uuid references profiles(id), recipient_id uuid references profiles(id), video_id uuid, live_id uuid, gift text not null, coins int not null, paid_part int not null, bonus_part int not null, created_at timestamptz default now());
create table if not exists ledger (id bigserial primary key, user_id uuid references profiles(id) on delete cascade, kind text not null, paid int default 0, bonus int default 0, cash numeric default 0, ref text, created_at timestamptz default now());
create index if not exists ledger_user on ledger (user_id, created_at desc);
create table if not exists game_runs (id uuid primary key default gen_random_uuid(), user_id uuid references profiles(id) on delete cascade, game text not null, ref text, started_at timestamptz default now(), finished_at timestamptz, score int default 0, reward int default 0);
create index if not exists game_runs_user on game_runs (user_id, started_at desc);
create table if not exists trade_accounts (user_id uuid references profiles(id) on delete cascade, season text not null, cash numeric not null default 10000, positions jsonb not null default '{}', version int not null default 0, primary key (user_id, season));
create table if not exists deposits (id uuid primary key default gen_random_uuid(), user_id uuid references profiles(id), amount_egp numeric not null, coins int not null, vf_number text not null, tx_ref text not null unique, status text not null default 'pending', created_at timestamptz default now(), decided_at timestamptz);
create table if not exists withdrawals (id uuid primary key default gen_random_uuid(), user_id uuid references profiles(id), amount_egp numeric not null, vf_number text not null, status text not null default 'pending', note text, created_at timestamptz default now(), decided_at timestamptz);
create table if not exists lives (id uuid primary key default gen_random_uuid(), user_id uuid references profiles(id) on delete cascade, title text, room text unique, status text default 'live', started_at timestamptz default now(), ended_at timestamptz);
create table if not exists pool (id int primary key default 1 check (id = 1), ad_revenue_egp numeric not null default 0, weekly_fund_egp numeric not null default 0);
insert into pool (id) values (1) on conflict do nothing;

-- الوصول للجداول من السيرفر فقط (service role). لا سياسات = ممنوع على anon/authenticated.
do $$ declare t text; begin
  for t in select unnest(array['profiles','videos','likes','comments','follows','gifts','ledger','game_runs','trade_accounts','deposits','withdrawals','lives','pool'])
  loop execute format('alter table %I enable row level security', t); end loop;
end $$;

-- حركة محفظة ذرّية
create or replace function wallet_move(p_user uuid, p_paid int, p_bonus int, p_cash numeric, p_points int, p_kind text, p_ref text)
returns profiles language plpgsql security definer set search_path = public as $$
declare r profiles;
begin
  update profiles set paid_coins = paid_coins + p_paid, bonus_coins = bonus_coins + p_bonus,
         cash_egp = cash_egp + p_cash, points = points + p_points where id = p_user returning * into r;
  if not found then raise exception 'no_user'; end if;
  insert into ledger (user_id, kind, paid, bonus, cash, ref) values (p_user, p_kind, p_paid, p_bonus, p_cash, p_ref);
  return r;
end $$;

-- إرسال هدية: العملات المجانية تُصرف أولاً
create or replace function send_gift(p_sender uuid, p_recipient uuid, p_coins int, p_gift text, p_video uuid, p_live uuid, p_cash_per_paid numeric)
returns json language plpgsql security definer set search_path = public as $$
declare s profiles; b int; pd int; cash numeric;
begin
  select * into s from profiles where id = p_sender for update;
  b := least(s.bonus_coins, p_coins); pd := p_coins - b;
  if s.paid_coins < pd then raise exception 'insufficient'; end if;
  update profiles set paid_coins = paid_coins - pd, bonus_coins = bonus_coins - b where id = p_sender;
  cash := round(pd * p_cash_per_paid, 2);
  update profiles set cash_egp = cash_egp + cash, points = points + b where id = p_recipient;
  insert into gifts (sender_id, recipient_id, video_id, live_id, gift, coins, paid_part, bonus_part) values (p_sender, p_recipient, p_video, p_live, p_gift, p_coins, pd, b);
  insert into ledger (user_id, kind, paid, bonus, ref) values (p_sender, 'gift_sent', -pd, -b, p_gift);
  insert into ledger (user_id, kind, cash, ref) values (p_recipient, 'gift_received', cash, p_gift);
  if p_video is not null then update videos set gifts_coins = gifts_coins + p_coins where id = p_video; end if;
  return json_build_object('paid', s.paid_coins - pd, 'bonus', s.bonus_coins - b);
end $$;

create or replace function toggle_like(p_video uuid, p_user uuid) returns json language plpgsql security definer set search_path = public as $$
declare n int; l boolean;
begin
  if exists (select 1 from likes where video_id = p_video and user_id = p_user) then
    delete from likes where video_id = p_video and user_id = p_user; l := false;
    update videos set likes = greatest(likes - 1, 0) where id = p_video returning likes into n;
  else
    insert into likes (video_id, user_id) values (p_video, p_user); l := true;
    update videos set likes = likes + 1 where id = p_video returning likes into n;
  end if;
  return json_build_object('liked', l, 'likes', n);
end $$;

create or replace function toggle_follow(p_a uuid, p_b uuid) returns boolean language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from follows where follower_id = p_a and followee_id = p_b) then
    delete from follows where follower_id = p_a and followee_id = p_b;
    update profiles set followers = greatest(followers - 1, 0) where id = p_b; return false;
  end if;
  insert into follows (follower_id, followee_id) values (p_a, p_b);
  update profiles set followers = followers + 1 where id = p_b; return true;
end $$;

create or replace function bump_video(p_video uuid, p_views int default 0, p_comments int default 0) returns void language sql security definer set search_path = public as $$
  update videos set views = views + p_views, comments = comments + p_comments where id = p_video;
$$;

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on all functions in schema public to service_role;

-- مخزن الفيديوهات (عام للقراءة، الرفع عبر روابط موقّعة من السيرفر فقط)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('videos', 'videos', true, 52428800, array['video/mp4','video/webm','video/quicktime'])
on conflict (id) do nothing;
