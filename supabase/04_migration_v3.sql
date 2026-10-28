-- Jo1 v3: HLS + بروفايل + إدارة وحظر + إصلاحات أمان. شغّله بعد migration_v2.sql (آمن لو اتشغل تاني).

alter table videos add column if not exists hls_url text;
alter table videos add column if not exists duration real;
alter table videos add column if not exists status text not null default 'ready';
alter table profiles add column if not exists banned bool not null default false;

create or replace function is_admin() returns bool language sql stable security definer set search_path=public as $$
select coalesce((select is_admin from profiles where id=auth.uid()),false) $$;
create or replace function not_banned() returns bool language sql stable security definer set search_path=public as $$
select not coalesce((select banned from profiles where id=auth.uid()),false) $$;

-- إصلاح أمان: المستخدم ما يقدرش يزوّر العدّادات ولا hls_url، ولا يحط رابط من برّة تخزينه
create or replace function videos_guard() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if coalesce(auth.role(),'')<>'service_role' then
  if new.url not like '%/storage/v1/object/public/videos/'||new.user_id::text||'/%' then raise exception 'BAD_VIDEO_URL'; end if;
  new.views:=0; new.likes_count:=0; new.comments_count:=0; new.hls_url:=null; new.duration:=null; new.status:='pending';
 end if; return new; end $$;
drop trigger if exists t_videos_guard on videos;
create trigger t_videos_guard before insert on videos for each row execute function videos_guard();

-- الحظر: المحظور ما ينشرش ولا يعلّق ولا يفتح لايف، وما يقدرش يشيل الحظر عن نفسه
drop policy if exists v2 on videos; create policy v2 on videos for insert with check(user_id=auth.uid() and not_banned());
drop policy if exists c2 on comments; create policy c2 on comments for insert with check(user_id=auth.uid() and not_banned());
drop policy if exists o2 on rooms; create policy o2 on rooms for insert with check(host_id=auth.uid() and not_banned());
drop policy if exists m2 on messages; create policy m2 on messages for insert with check(user_id=auth.uid() and not_banned());
drop policy if exists p2 on profiles; create policy p2 on profiles for insert with check(id=auth.uid() and coins=0 and diamonds=0 and bonus=0 and not is_admin and not banned);
drop policy if exists p3 on profiles;
create policy p3 on profiles for update using(id=auth.uid()) with check(id=auth.uid()
 and coins=(select coins from profiles where id=auth.uid()) and diamonds=(select diamonds from profiles where id=auth.uid())
 and bonus=(select bonus from profiles where id=auth.uid()) and is_admin=(select is_admin from profiles where id=auth.uid())
 and banned=(select banned from profiles where id=auth.uid()));

-- التخزين: ملفات HLS + الأدمن يقدر يحذف أي ملف
update storage.buckets set allowed_mime_types=array['video/mp4','video/webm','video/quicktime','image/jpeg','application/vnd.apple.mpegurl','video/mp2t'] where id='videos';
drop policy if exists videos_delete on storage.objects;
create policy videos_delete on storage.objects for delete to authenticated using(bucket_id='videos' and ((storage.foldername(name))[1]=auth.uid()::text or is_admin()));

-- الأدمن يقدر يمسح البلاغات
drop policy if exists r3 on reports; create policy r3 on reports for delete using(is_admin());

-- الفيد (مع HLS وفيديوهات مبدع معيّن)
drop function if exists feed_videos(text,text,int,int,bigint);
create or replace function feed_videos(p_mode text default 'hot', p_q text default null, p_limit int default 8, p_offset int default 0, p_id bigint default null, p_user uuid default null)
returns table(id bigint,url text,hls_url text,poster text,caption text,created_at timestamptz,user_id uuid,username text,avatar_url text,likes_count int,comments_count int,views int,liked bool,following bool)
language sql stable set search_path=public as $$
select v.id,v.url,v.hls_url,v.poster,v.caption,v.created_at,v.user_id,p.username,p.avatar_url,v.likes_count,v.comments_count,v.views,
 exists(select 1 from video_likes l where l.video_id=v.id and l.user_id=auth.uid()),
 exists(select 1 from follows f where f.follower_id=auth.uid() and f.following_id=v.user_id)
from videos v join profiles p on p.id=v.user_id
where (p_id is null or v.id=p_id) and (p_user is null or v.user_id=p_user)
 and (p_q is null or v.caption ilike '%'||replace(replace(p_q,'%','\%'),'_','\_')||'%')
 and (p_mode<>'following' or exists(select 1 from follows f where f.follower_id=auth.uid() and f.following_id=v.user_id))
order by case when p_mode='hot' then (v.likes_count*3+v.comments_count*5+v.views*0.2+1)/power(extract(epoch from now()-v.created_at)/3600+2,1.3) end desc nulls last, v.id desc
limit least(p_limit,30) offset p_offset $$;

-- إحصائيات البروفايل
create or replace function profile_stats(p_user uuid)
returns table(username text,bio text,avatar_url text,followers bigint,following bigint,videos bigint,likes bigint,is_following bool)
language sql stable set search_path=public as $$
select p.username,p.bio,p.avatar_url,
 (select count(*) from follows where following_id=p.id),(select count(*) from follows where follower_id=p.id),
 (select count(*) from videos where user_id=p.id),coalesce((select sum(likes_count) from videos where user_id=p.id),0)::bigint,
 exists(select 1 from follows where follower_id=auth.uid() and following_id=p.id)
from profiles p where p.id=p_user $$;

-- إدارة
create or replace function admin_set_ban(p_user uuid, p_banned bool) returns void language plpgsql security definer set search_path=public as $$
begin
 if not is_admin() then raise exception 'NOT_ADMIN'; end if;
 if exists(select 1 from profiles where id=p_user and is_admin) then raise exception 'CANNOT_BAN_ADMIN'; end if;
 update profiles set banned=p_banned where id=p_user; end $$;

create or replace function admin_stats() returns json language plpgsql stable security definer set search_path=public as $$
begin
 if not is_admin() then raise exception 'NOT_ADMIN'; end if;
 return json_build_object(
  'users',(select count(*) from profiles),'videos',(select count(*) from videos),
  'views',(select coalesce(sum(views),0) from videos),'comments',(select count(*) from comments),
  'gifts',(select count(*) from gift_sends),'open_reports',(select count(distinct video_id) from reports),
  'pending_deposits',(select count(*) from deposits where status='pending'),'pending_withdrawals',(select count(*) from withdrawals where status='pending'),
  'approved_egp',(select coalesce(sum(amount_egp),0) from deposits where status='approved'),
  'hls_ready',(select count(*) from videos where hls_url is not null),'hls_waiting',(select count(*) from videos where status in ('pending','processing')));
end $$;
revoke execute on function admin_set_ban, admin_stats from anon;
