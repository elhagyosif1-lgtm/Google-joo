-- Jo1 v5: التيرمنال الذكي للأدمن + سجل التدقيق. شغّله بعد migration_v4.sql (آمن لو اتشغل تاني).
create table if not exists admin_audit (
  id bigint generated always as identity primary key,
  admin_id uuid references profiles(id) on delete set null,
  input text not null,
  command text,
  params jsonb,
  risk text,
  status text not null,        -- planned | executed | confirmed | rejected | failed | blocked
  result text,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_created on admin_audit(created_at desc);
alter table admin_audit enable row level security;
drop policy if exists "audit_admin_read" on admin_audit;
create policy "audit_admin_read" on admin_audit for select using (is_admin());
-- الكتابة تتم فقط من السيرفر بمفتاح service role، فما فيه سياسة إدراج للمستخدمين.
