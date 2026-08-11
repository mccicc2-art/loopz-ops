// قراءةُ الإحصاءات من دوال ops_* عبر PostgREST.
// المفتاحُ المستعمَل هو المفتاح المجهول (anon) وهو عامٌّ بحكم التصميم،
// ومع ذلك يبقى على الخادم: لا NEXT_PUBLIC_ في الاسم فلا يصل المتصفّح.

import type { Result } from "./types";

const URL_ = process.env.SUPABASE_URL ?? "";
const KEY = process.env.SUPABASE_ANON_KEY ?? "";
const OPS_KEY = process.env.OPS_KEY ?? "";

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<Result<T>> {
  if (!URL_ || !KEY) {
    return { ok: false, error: "SUPABASE_URL أو SUPABASE_ANON_KEY غير مضبوط في Vercel" };
  }
  // لو فُعِّل الإغلاق (ops_02_lockdown.sql) يُمرَّر المفتاح تلقائياً.
  const body = OPS_KEY ? { ...args, p_key: OPS_KEY } : args;
  try {
    const res = await fetch(`${URL_}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) {
      const t = await res.text();
      // 404 على الدالّة = ملفُّ SQL لم يُشغَّل بعد. رسالةٌ صريحة خيرٌ من صفر.
      if (res.status === 404) return { ok: false, error: `الدالّة ${fn} غير موجودة — شغّل sql/ops_01_functions.sql` };
      return { ok: false, error: `${res.status}: ${t.slice(0, 180)}` };
    }
    return { ok: true, data: (await res.json()) as T };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "فشل الاتصال بـSupabase" };
  }
}

export type Overview = {
  users_total: number; users_24h: number; users_7d: number; users_30d: number;
  active_24h: number; active_7d: number; active_30d: number;
  never_returned: number; unconfirmed: number;
  first_user_at: string | null; generated_at: string;
};
export type DayRow = { d: string; n: number };
export type HourRow = { h: number; n: number };
export type Hourly = { source: "audit_log" | "last_sign_in"; events: number; rows: HourRow[] };
export type LocaleRow = { k: string; n: number };
export type DbSize = { db_bytes: number; tables: { name: string; bytes: number; rows: number }[] };
export type StorageUse = { objects: number; bytes: number; buckets: { name: string; objects: number; bytes: number }[] };
export type Content = Record<string, number>;
export type CronRow = { job: string; schedule: string; active: boolean };
export type Snapshot = { source: string; metric: string; value: number | null; limit: number | null; unit: string | null; note: string | null; taken_at: string };

export const getOverview   = () => rpc<Overview>("ops_overview");
export const getSignups    = (days = 30) => rpc<DayRow[]>("ops_signups_daily", { p_days: days });
export const getHourly     = (days = 30) => rpc<Hourly>("ops_logins_hourly", { p_days: days });
export const getLoginsDaily= (days = 30) => rpc<DayRow[]>("ops_logins_daily", { p_days: days });
export const getLocales    = () => rpc<LocaleRow[]>("ops_locales");
export const getDbSize     = () => rpc<DbSize>("ops_db_size");
export const getStorage    = () => rpc<StorageUse>("ops_storage");
export const getContent    = () => rpc<Content>("ops_content");
export const getCron       = () => rpc<CronRow[]>("ops_cron");
export const getSnapshots  = () => rpc<Snapshot[]>("ops_snapshots");
