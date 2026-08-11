// صحّةُ الموقع الحيّ — وأهمُّ فحصٍ في هذه اللوحة كلّها.
//
// 18_Project_Context: «READY ليست فحص الصحّة» — نشراتُ Vercel تنتهي
// خارج الترتيب، فتبقى نشرةٌ أقدمُ إنتاجاً بينما رأسُ main تقدّم.
// هذا الملفّ يقارن ما يقوله /api/build بما يقوله GitHub، ويصرخ عند الفرق.

import type { Result } from "./types";
import { SITE } from "../config";

export type Build = { sha?: string; commit?: string; builtAt?: string; [k: string]: unknown };
export type Ping = { status: number; ms: number; build: Build | null; raw: string | null };

export async function pingSite(): Promise<Result<Ping>> {
  const t0 = Date.now();
  try {
    const res = await fetch(`${SITE}/api/build`, {
      cache: "no-store",
      headers: { "User-Agent": "loopz-ops" },
    });
    const ms = Date.now() - t0;
    const raw = await res.text();
    let build: Build | null = null;
    try { build = JSON.parse(raw) as Build; } catch { build = null; }
    return { ok: true, data: { status: res.status, ms, build, raw: build ? null : raw.slice(0, 200) } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "الموقع لا يستجيب" };
  }
}

// نستخرج أوّلَ سلسلةٍ تشبه sha من ردّ /api/build مهما كان اسمُ الحقل.
export function shaOf(b: Build | null): string | null {
  if (!b) return null;
  for (const v of Object.values(b)) {
    if (typeof v === "string" && /^[0-9a-f]{7,40}$/i.test(v)) return v;
  }
  return null;
}

export async function pingHome(): Promise<Result<{ status: number; ms: number }>> {
  const t0 = Date.now();
  try {
    const res = await fetch(SITE, { cache: "no-store", headers: { "User-Agent": "loopz-ops" } });
    return { ok: true, data: { status: res.status, ms: Date.now() - t0 } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "الصفحة الرئيسية لا تستجيب" };
  }
}
