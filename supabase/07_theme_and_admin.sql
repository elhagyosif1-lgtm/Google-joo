-- Jo1 v6: ألوان المنصة من لوحة control. شغّله بعد 06_migration_v5.sql (آمن لو اتشغل تاني).
-- app_settings مقروءة للجميع أصلاً (policy a1)، والكتابة تتم فقط بمفتاح service role من لوحة control.
alter table app_settings add column if not exists theme jsonb not null default '{}'::jsonb;
