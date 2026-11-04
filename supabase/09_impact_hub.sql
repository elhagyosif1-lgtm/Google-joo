-- 09 · Read-only directory for the اترك أثراً impact hub.
-- Apply after the existing Jo1 schema and security migrations.
-- No wallet, payment, donation collection, or client-side write access is added here.

begin;

create table if not exists public.impact_charities (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 160),
  description text not null default '' check (length(description) <= 1200),
  category text not null default 'مبادرة مجتمعية' check (length(category) <= 80),
  location text check (location is null or length(location) <= 120),
  impact_label text check (impact_label is null or length(impact_label) <= 100),
  impact_value text check (impact_value is null or length(impact_value) <= 120),
  is_active boolean not null default false,
  sort_order integer not null default 100,
  created_at timestamptz not null default now()
);

alter table public.impact_charities enable row level security;

 drop policy if exists impact_charities_public_read on public.impact_charities;
create policy impact_charities_public_read
  on public.impact_charities
  for select
  to authenticated
  using (is_active = true);

-- Do not grant anon/authenticated insert, update, or delete. Curate records through
-- the trusted Supabase SQL editor or a separately authorized admin service.
revoke all on public.impact_charities from anon, authenticated;
grant select on public.impact_charities to authenticated;

insert into public.impact_charities (name, description, category, location, sort_order)
values
  ('مستشفى 57357 لعلاج سرطان الأطفال', 'مبادرة مقترحة لدعم علاج ورعاية الأطفال. تحقّق من بيانات الجهة ووسائل التبرع الرسمية قبل المساهمة.', 'الصحة ورعاية الأطفال', 'مصر', 10),
  ('مؤسسة مجدي يعقوب لأمراض وأبحاث القلب', 'مبادرة مقترحة لدعم رعاية وأبحاث أمراض القلب. تحقّق من بيانات الجهة ووسائل التبرع الرسمية قبل المساهمة.', 'الصحة والقلب', 'مصر', 20),
  ('مراكز الغسيل الكلوي المجانية', 'مبادرة مقترحة لمساندة المرضى بخدمات الرعاية الصحية. يجب اعتماد الجهة المحلية والتحقق منها قبل نشر تفاصيل الدعم.', 'الرعاية الصحية', null, 30),
  ('كفالة ورعاية الأيتام', 'مبادرة مقترحة لدعم الأطفال والأسر. تحقّق من تسجيل الجهة وقنواتها الرسمية قبل أي مساهمة.', 'رعاية المجتمع', null, 40)
on conflict do nothing;

commit;
