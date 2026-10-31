-- 08 · محفظة MRJOO على مشروع Google Joo الحالي — إضافات فقط (additive). لا حذف ولا تغيير بيانات.
-- الجداول deposits / withdrawals / ledger كانت فاضية وقت التشغيل، فتعديل نوع amount_egp آمن.

alter table profiles add column if not exists paid_coins  int not null default 0 check (paid_coins >= 0);
alter table profiles add column if not exists bonus_coins int not null default 0 check (bonus_coins >= 0);
alter table profiles add column if not exists cash_egp   numeric(12,2) not null default 0 check (cash_egp >= 0);
alter table profiles add column if not exists points     int not null default 0;

alter table ledger add column if not exists paid  int     default 0;
alter table ledger add column if not exists bonus int     default 0;
alter table ledger add column if not exists cash  numeric default 0;
alter table ledger add column if not exists ref   text;

alter table deposits    alter column amount_egp type numeric using amount_egp::numeric;
alter table deposits    add column if not exists decided_at timestamptz;
alter table withdrawals alter column amount_egp type numeric using amount_egp::numeric;
alter table withdrawals add column if not exists decided_at timestamptz;

create table if not exists pool (
  id int primary key default 1 check (id = 1),
  ad_revenue_egp numeric not null default 0,
  weekly_fund_egp numeric not null default 0
);
insert into pool (id) values (1) on conflict do nothing;

create table if not exists trade_accounts (
  user_id uuid references profiles(id) on delete cascade,
  season text not null,
  cash numeric not null default 10000,
  positions jsonb not null default '{}',
  version int not null default 0,
  primary key (user_id, season)
);

alter table pool enable row level security;
alter table trade_accounts enable row level security;
-- لا سياسات: الوصول من السيرفر (service role) بس.

-- حركة محفظة ذرّية (نفس منطق الزيب)
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
