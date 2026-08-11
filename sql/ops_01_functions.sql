-- ============================================================
--  loopz-ops · 01 — دوال القراءة للوحة المتابعة
--  تُشغَّل في نفس مشروع Supabase (uvgmvrdrxzpudoldjxaa)
--
--  ⚠️ قواعد الجيرة مع تطبيق Loopz — اقرأها قبل التشغيل:
--  1. لا جدولَ جديداً في public، ولا سياسةَ RLS واحدة.
--     السبب: فحصُ الصحّة عند الإيجنت الثاني يتوقّع أربع سياسات
--     مفتوحة بالضبط (qual='true')، وأيُّ سياسةٍ خامسة تكسره.
--  2. كلُّ ما هنا دوالُّ قراءةٍ فقط. لا insert ولا update ولا delete
--     على أيِّ جدولٍ يخصُّ التطبيق.
--  3. البادئة ops_ تُعلن المالك. لا تُسمَّ دالّةٌ هنا بلا هذه البادئة.
--  4. الدوالُّ تُعيد أعداداً مجمَّعة فقط — لا إيميل، لا اسم، لا IP.
-- ============================================================

-- سكيما خاصّة للقطات اليدوية. غير معروضة في PostgREST،
-- فلا يصلها anon إطلاقاً — يقرأها الدالُّ صاحبُ الصلاحية وحده.
create schema if not exists ops;

-- ------------------------------------------------------------
-- 1) نظرة عامّة: المستخدمون والنشاط
-- ------------------------------------------------------------
create or replace function public.ops_overview()
returns json
language sql
security definer
set search_path = public, auth, pg_temp
as $$
  select json_build_object(
    'users_total',   (select count(*) from auth.users where deleted_at is null),
    'users_24h',     (select count(*) from auth.users where deleted_at is null and created_at > now() - interval '24 hours'),
    'users_7d',      (select count(*) from auth.users where deleted_at is null and created_at > now() - interval '7 days'),
    'users_30d',     (select count(*) from auth.users where deleted_at is null and created_at > now() - interval '30 days'),
    'active_24h',    (select count(*) from auth.users where deleted_at is null and last_sign_in_at > now() - interval '24 hours'),
    'active_7d',     (select count(*) from auth.users where deleted_at is null and last_sign_in_at > now() - interval '7 days'),
    'active_30d',    (select count(*) from auth.users where deleted_at is null and last_sign_in_at > now() - interval '30 days'),
    'never_returned',(select count(*) from auth.users where deleted_at is null and last_sign_in_at is not null and created_at > last_sign_in_at - interval '2 minutes'),
    'unconfirmed',   (select count(*) from auth.users where deleted_at is null and email_confirmed_at is null),
    'first_user_at', (select min(created_at) from auth.users),
    'generated_at',  now()
  );
$$;

-- ------------------------------------------------------------
-- 2) منحنى التسجيل اليومي
-- ------------------------------------------------------------
create or replace function public.ops_signups_daily(p_days int default 30)
returns json
language sql
security definer
set search_path = public, auth, pg_temp
as $$
  with span as (
    select generate_series(
      (current_date - (greatest(least(p_days, 180), 1) - 1)),
      current_date,
      interval '1 day'
    )::date as d
  )
  select coalesce(json_agg(json_build_object('d', s.d, 'n', coalesce(u.n, 0)) order by s.d), '[]'::json)
  from span s
  left join (
    select (created_at at time zone 'Asia/Riyadh')::date as d, count(*) as n
    from auth.users
    where deleted_at is null
    group by 1
  ) u on u.d = s.d;
$$;

-- ------------------------------------------------------------
-- 3) أوقات الدخول — الساعة بتوقيت الرياض
--    المصدر الأول سجلُّ التدقيق (كلُّ دخولٍ حدث)، وإن كان فارغاً
--    نرجع إلى آخر دخولٍ لكلِّ مستخدم. الحقل source يقول أيَّهما.
-- ------------------------------------------------------------
create or replace function public.ops_logins_hourly(p_days int default 30)
returns json
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_audit  bigint;
  v_rows   json;
  v_source text;
begin
  select count(*) into v_audit
  from auth.audit_log_entries
  where created_at > now() - (greatest(least(p_days, 180), 1) || ' days')::interval
    and payload->>'action' = 'login';

  if v_audit > 0 then
    v_source := 'audit_log';
    select coalesce(json_agg(json_build_object('h', h.h, 'n', coalesce(a.n, 0)) order by h.h), '[]'::json)
      into v_rows
    from generate_series(0, 23) as h(h)
    left join (
      select extract(hour from (created_at at time zone 'Asia/Riyadh'))::int as h, count(*) as n
      from auth.audit_log_entries
      where created_at > now() - (greatest(least(p_days, 180), 1) || ' days')::interval
        and payload->>'action' = 'login'
      group by 1
    ) a on a.h = h.h;
  else
    v_source := 'last_sign_in';
    select coalesce(json_agg(json_build_object('h', h.h, 'n', coalesce(a.n, 0)) order by h.h), '[]'::json)
      into v_rows
    from generate_series(0, 23) as h(h)
    left join (
      select extract(hour from (last_sign_in_at at time zone 'Asia/Riyadh'))::int as h, count(*) as n
      from auth.users
      where deleted_at is null and last_sign_in_at is not null
      group by 1
    ) a on a.h = h.h;
  end if;

  return json_build_object('source', v_source, 'events', v_audit, 'rows', v_rows);
end;
$$;

-- ------------------------------------------------------------
-- 4) الدخول اليومي (نشاطٌ لا تسجيل)
-- ------------------------------------------------------------
create or replace function public.ops_logins_daily(p_days int default 30)
returns json
language sql
security definer
set search_path = public, auth, pg_temp
as $$
  with span as (
    select generate_series(
      (current_date - (greatest(least(p_days, 180), 1) - 1)),
      current_date,
      interval '1 day'
    )::date as d
  )
  select coalesce(json_agg(json_build_object('d', s.d, 'n', coalesce(a.n, 0)) order by s.d), '[]'::json)
  from span s
  left join (
    select (created_at at time zone 'Asia/Riyadh')::date as d, count(*) as n
    from auth.audit_log_entries
    where payload->>'action' = 'login'
    group by 1
  ) a on a.d = s.d;
$$;

-- ------------------------------------------------------------
-- 5) لغةُ الواجهة — أقربُ ما نملكه اليوم عن «من أين هم»
--    (البلدُ الحقيقيّ يحتاج Vercel Web Analytics، انظر README)
-- ------------------------------------------------------------
create or replace function public.ops_locales()
returns json
language sql
security definer
set search_path = public, pg_temp
as $$
  select coalesce(json_agg(json_build_object('k', k, 'n', n) order by n desc), '[]'::json)
  from (
    select coalesce(nullif(locale, ''), 'ar') as k, count(*) as n
    from public.profiles
    group by 1
  ) t;
$$;

-- ------------------------------------------------------------
-- 6) حجمُ قاعدة البيانات والجداول — «الطاقة» مقابل سقف الخطة
-- ------------------------------------------------------------
create or replace function public.ops_db_size()
returns json
language sql
security definer
set search_path = public, pg_temp
as $$
  select json_build_object(
    'db_bytes', pg_database_size(current_database()),
    'tables', (
      select coalesce(json_agg(json_build_object(
        'name',  t.relname,
        'bytes', t.bytes,
        'rows',  t.rows
      ) order by t.bytes desc), '[]'::json)
      from (
        select c.relname,
               pg_total_relation_size(c.oid) as bytes,
               coalesce(s.n_live_tup, 0)     as rows
        from pg_class c
        join pg_namespace ns on ns.oid = c.relnamespace
        left join pg_stat_user_tables s on s.relid = c.oid
        where ns.nspname = 'public' and c.relkind = 'r'
        order by pg_total_relation_size(c.oid) desc
        limit 25
      ) t
    )
  );
$$;

-- ------------------------------------------------------------
-- 7) المخزن (bucket avatars وحده حسب 18_Project_Context)
-- ------------------------------------------------------------
create or replace function public.ops_storage()
returns json
language sql
security definer
set search_path = public, storage, pg_temp
as $$
  select json_build_object(
    'objects', (select count(*) from storage.objects),
    'bytes',   (select coalesce(sum((metadata->>'size')::bigint), 0) from storage.objects),
    'buckets', (
      select coalesce(json_agg(json_build_object('name', b.name, 'objects', o.n, 'bytes', o.b)), '[]'::json)
      from storage.buckets b
      left join lateral (
        select count(*) as n, coalesce(sum((metadata->>'size')::bigint), 0) as b
        from storage.objects where bucket_id = b.id
      ) o on true
    )
  );
$$;

-- ------------------------------------------------------------
-- 8) نبضُ المحتوى — هل التطبيق يُستعمل فعلاً
-- ------------------------------------------------------------
create or replace function public.ops_content()
returns json
language sql
security definer
set search_path = public, pg_temp
as $$
  select json_build_object(
    'follows',          (select count(*) from public.follows),
    'watched_episodes', (select count(*) from public.watched_episodes),
    'watched_movies',   (select count(*) from public.watched_movies),
    'ratings',          (select count(*) from public.ratings),
    'lists',            (select count(*) from public.user_lists),
    'list_items',       (select count(*) from public.user_list_items),
    'communities',      (select count(*) from public.communities),
    'community_msgs',   (select count(*) from public.community_messages),
    'user_follows',     (select count(*) from public.user_follows),
    'imdb_chart',       (select count(*) from public.imdb_chart),
    'imdb_pool',        (select count(*) from public.imdb_pool)
  );
$$;

-- ------------------------------------------------------------
-- 9) وظائفُ pg_cron — صفٌّ واحدٌ فعّال هو الصحيح (D-140)
-- ------------------------------------------------------------
create or replace function public.ops_cron()
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v json;
begin
  select coalesce(json_agg(json_build_object(
    'job', jobname, 'schedule', schedule, 'active', active)), '[]'::json)
    into v
  from cron.job;
  return v;
exception when others then
  return '[]'::json;  -- الامتداد غير مثبَّت أو لا صلاحية: لا نُسقط اللوحة
end;
$$;

-- ------------------------------------------------------------
-- 10) اللقطات اليدوية (Vercel / Supabase quotas التي لا API لها هنا)
-- ------------------------------------------------------------
create table if not exists ops.snapshots (
  id         bigint generated always as identity primary key,
  taken_at   timestamptz not null default now(),
  source     text not null,          -- 'vercel' | 'supabase' | 'godaddy' | ...
  metric     text not null,          -- 'bandwidth_gb' | 'egress_gb' | ...
  value      numeric,
  limit_v    numeric,
  unit       text,
  note       text
);

create index if not exists ops_snapshots_idx on ops.snapshots (source, metric, taken_at desc);

create or replace function public.ops_snapshots()
returns json
language sql
security definer
set search_path = ops, pg_temp
as $$
  select coalesce(json_agg(json_build_object(
    'source', s.source, 'metric', s.metric, 'value', s.value,
    'limit', s.limit_v, 'unit', s.unit, 'note', s.note, 'taken_at', s.taken_at
  ) order by s.source, s.metric), '[]'::json)
  from (
    select distinct on (source, metric) *
    from ops.snapshots
    order by source, metric, taken_at desc
  ) s;
$$;

-- ------------------------------------------------------------
-- الصلاحيات
-- ------------------------------------------------------------
grant usage on schema public to anon, authenticated;

grant execute on function
  public.ops_overview(),
  public.ops_signups_daily(int),
  public.ops_logins_hourly(int),
  public.ops_logins_daily(int),
  public.ops_locales(),
  public.ops_db_size(),
  public.ops_storage(),
  public.ops_content(),
  public.ops_cron(),
  public.ops_snapshots()
to anon, authenticated;

-- ملاحظة أمنية تُقال ولا تُخفى:
-- المفتاح المجهول (anon) عامٌّ بحكم التصميم، فمن يعرف اسم الدالّة يقدر
-- يقرأ هذه الأعداد. لا PII فيها إطلاقاً — أعدادٌ مجمَّعة فقط.
-- الإغلاق الكامل خطوةٌ واحدة عند أحمد: انظر sql/ops_02_lockdown.sql.
