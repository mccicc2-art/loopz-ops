-- ============================================================
--  loopz-ops · 02 — الإغلاق (اختياري، دقيقة واحدة، متى ما أردت)
--
--  الحال اليوم: دوالُّ ops_* مفتوحةٌ لدور anon. لا PII فيها —
--  أعدادٌ مجمَّعة فقط — لكنّ من يملك المفتاح العام يقدر يقرأها.
--
--  هذا الملفّ يغلق ذلك: يصير النداء مشروطاً بمفتاحٍ تعرفه أنت وحدك.
--  لماذا لم يُشغَّل معي؟ لأنّ تشغيله يتطلّب أن أكتب قيمةَ المفتاح
--  في خانة — وقاعدتُك الثابتة أنّي لا أُدخل أسراراً في أيّ خانة.
--
--  الخطوات (كلّها عندك):
--  1. ولّد مفتاحاً: افتح محرّر SQL ونفّذ  select gen_random_uuid();
--  2. استبدل PUT-YOUR-KEY-HERE أدناه بالقيمة، وشغّل الملف.
--  3. في Vercel → مشروع loopz-ops → Settings → Environment Variables
--     أضف  OPS_KEY  بنفس القيمة، ثم Redeploy.
--  اللوحة تلتقط المتغيّر تلقائياً؛ لا تعديلَ في الكود.
-- ============================================================

create table if not exists ops.config (
  id  int primary key default 1,
  key text not null,
  check (id = 1)
);

insert into ops.config (id, key) values (1, 'PUT-YOUR-KEY-HERE')
on conflict (id) do update set key = excluded.key;

-- كلُّ دالّةٍ تكتسب وسيطَ مفتاحٍ اختياريّاً. الغلاف واحدٌ للجميع.
create or replace function ops.check_key(p_key text)
returns void
language plpgsql
security definer
set search_path = ops, pg_temp
as $$
begin
  if p_key is null or p_key <> (select key from ops.config where id = 1) then
    raise exception 'ops: unauthorized' using errcode = '42501';
  end if;
end;
$$;

-- مثالٌ واحدٌ مطبَّق (كرّره على البقيّة بنفس السطرين إن أردت):
create or replace function public.ops_overview(p_key text)
returns json
language plpgsql
security definer
set search_path = public, auth, ops, pg_temp
as $$
begin
  perform ops.check_key(p_key);
  return public.ops_overview();
end;
$$;

grant execute on function public.ops_overview(text) to anon, authenticated;

-- ثم اسحب النسخة المفتوحة:
-- revoke execute on function public.ops_overview() from anon, authenticated;
