import {
  getOverview, getSignups, getHourly, getLoginsDaily, getLocales,
  getDbSize, getStorage, getContent, getCron, getSnapshots,
} from "@/lib/sources/supabase";
import { getRepo, getCommits, getRate } from "@/lib/sources/github";
import { pingSite, pingHome, shaOf } from "@/lib/sources/site";
import { getDeployments, vercelConfigured } from "@/lib/sources/vercel";
import { LIMITS, PROVIDERS, REPO, SITE } from "@/lib/config";
import { Card, Stat, Pill, Meter, Fail, Hours, Days, fmt, bytes } from "@/components/ui";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const LOCALE_NAME: Record<string, string> = { ar: "العربية", en: "English" };

export default async function Page() {
  // كلُّ المصادر بالتوازي: مصدرٌ بطيء لا يؤخّر البقيّة.
  const [
    overview, signups, hourly, loginsDaily, locales,
    dbSize, storage, content, cron, snapshots,
    repo, commits, rate, build, home, deploys,
  ] = await Promise.all([
    getOverview(), getSignups(30), getHourly(30), getLoginsDaily(30), getLocales(),
    getDbSize(), getStorage(), getContent(), getCron(), getSnapshots(),
    getRepo(), getCommits(), getRate(), pingSite(), pingHome(), getDeployments(),
  ]);

  const headSha = commits.ok ? commits.data[0]?.sha ?? null : null;
  const liveSha = build.ok ? shaOf(build.data.build) : null;
  const shaMatch =
    headSha && liveSha ? headSha.startsWith(liveSha) || liveSha.startsWith(headSha) : null;

  const dbBytes = dbSize.ok ? dbSize.data.db_bytes : null;
  const stBytes = storage.ok ? storage.data.bytes : null;
  const dbPct = dbBytes !== null ? (dbBytes / LIMITS.supabaseFree.dbBytes) * 100 : null;
  const stPct = stBytes !== null ? (stBytes / LIMITS.supabaseFree.storageBytes) * 100 : null;
  const activeCron = cron.ok ? cron.data.filter((c) => c.active) : null;

  // ------------------------------------------------------------
  // شريطُ التهديدات: كلُّ سطرٍ هنا شيءٌ يهدّد الاستقرار الآن.
  // ------------------------------------------------------------
  type Alert = { tone: "bad" | "warn" | "ok"; text: string };
  const alerts: Alert[] = [];

  if (!home.ok) alerts.push({ tone: "bad", text: "loopztv.com لا يستجيب" });
  else if (home.data.status >= 500) alerts.push({ tone: "bad", text: `الرئيسية ترجع ${home.data.status}` });
  else if (home.data.ms > 3000) alerts.push({ tone: "warn", text: `الرئيسية بطيئة (${home.data.ms}ms)` });

  if (shaMatch === false)
    alerts.push({ tone: "bad", text: "الإنتاج متأخّر عن رأس main — نشرةٌ انتهت خارج الترتيب. رقِّ الأحدث من Vercel." });
  if (build.ok && !liveSha)
    alerts.push({ tone: "warn", text: "‎/api/build لا يُرجع sha يمكن مقارنته" });

  if (dbPct !== null && dbPct >= 80) alerts.push({ tone: "bad", text: `قاعدة البيانات ${dbPct.toFixed(0)}% من سقف الخطة المجانية` });
  else if (dbPct !== null && dbPct >= 60) alerts.push({ tone: "warn", text: `قاعدة البيانات ${dbPct.toFixed(0)}% من السقف` });

  if (stPct !== null && stPct >= 80) alerts.push({ tone: "bad", text: `المخزن ${stPct.toFixed(0)}% من السقف` });
  else if (stPct !== null && stPct >= 60) alerts.push({ tone: "warn", text: `المخزن ${stPct.toFixed(0)}% من السقف` });

  if (activeCron && activeCron.length !== 1)
    alerts.push({ tone: "warn", text: `وظائف cron الفعّالة = ${activeCron.length} — المتوقّع واحدة (loopz-title-communities)` });

  if (!vercelConfigured())
    alerts.push({ tone: "warn", text: "استهلاكُ Vercel غير مقروء — VERCEL_TOKEN غير مضبوط" });

  const worst = alerts.some((a) => a.tone === "bad") ? "bad" : alerts.some((a) => a.tone === "warn") ? "warn" : "ok";

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      {/* ---------------- الترويسة ---------------- */}
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight">
            Loopz <span className="text-[var(--color-mut)]">— لوحة المتابعة</span>
          </h1>
          <p className="mt-1 text-[12px] text-[var(--color-mut)]">
            كلُّ رقمٍ هنا مقروءٌ الآن من مصدره. ما لا يُقرأ يُقال صراحةً، ولا يُملأ بصفر.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Pill tone={worst === "ok" ? "ok" : worst}>
            {worst === "ok" ? "كل شيء مستقرّ" : `${alerts.length} تنبيه`}
          </Pill>
          <span className="tnum text-[11px] text-[var(--color-mut)]">
            {new Date().toLocaleString("ar-SA", { timeZone: "Asia/Riyadh", dateStyle: "short", timeStyle: "short" })}
          </span>
        </div>
      </header>

      {/* ---------------- التهديدات ---------------- */}
      <section className={`mb-5 rounded-2xl p-4 ring-1 ${
        worst === "bad" ? "bg-[var(--color-bad)]/8 ring-[var(--color-bad)]/40"
        : worst === "warn" ? "bg-[var(--color-warn)]/8 ring-[var(--color-warn)]/35"
        : "bg-[var(--color-ok)]/6 ring-[var(--color-ok)]/25"}`}>
        <h2 className="mb-2 text-sm font-semibold">ما يهدّد الاستقرار الآن</h2>
        {alerts.length === 0 ? (
          <p className="text-[13px] text-[var(--color-ok)]">لا شيء. الموقع يستجيب، والإنتاج على رأس main، والحصص بعيدة عن السقف.</p>
        ) : (
          <ul className="space-y-1.5">
            {alerts.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px] leading-6">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: a.tone === "bad" ? "var(--color-bad)" : "var(--color-warn)" }} />
                <span>{a.text}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* ---------------- المستخدمون ---------------- */}
        <Card title="المستخدمون" hint="من auth.users مباشرةً — أعدادٌ مجمَّعة، بلا إيميلٍ ولا اسم.">
          {!overview.ok ? <Fail error={overview.error} /> : (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stat label="الإجمالي" value={fmt(overview.data.users_total)} />
                <Stat label="نشِط ٢٤ ساعة" value={fmt(overview.data.active_24h)} />
                <Stat label="نشِط ٧ أيام" value={fmt(overview.data.active_7d)} />
                <Stat label="نشِط ٣٠ يوماً" value={fmt(overview.data.active_30d)} />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Stat label="جديد ٢٤ ساعة" value={fmt(overview.data.users_24h)} />
                <Stat label="جديد ٧ أيام" value={fmt(overview.data.users_7d)} />
                <Stat label="جديد ٣٠ يوماً" value={fmt(overview.data.users_30d)} />
              </div>
              {overview.data.users_total > 0 && (
                <p className="mt-3 text-[11px] leading-5 text-[var(--color-mut)]">
                  سجّل ولم يعُد بعد أوّل دخول:{" "}
                  <span className="tnum font-semibold text-[var(--color-txt)]">{fmt(overview.data.never_returned)}</span>
                  {" "}({((overview.data.never_returned / overview.data.users_total) * 100).toFixed(0)}%).
                  هذا مقياسُ الاحتفاظ الحقيقي، وهو أهمُّ من العدد الكلّي.
                </p>
              )}
            </>
          )}
        </Card>

        {/* ---------------- منحنى التسجيل ---------------- */}
        <Card title="التسجيل والدخول — ٣٠ يوماً">
          {!signups.ok ? <Fail error={signups.error} /> : <Days rows={signups.data} label="حسابات جديدة" />}
          <div className="mt-4 border-t border-[var(--color-line)] pt-3">
            {!loginsDaily.ok ? <Fail error={loginsDaily.error} /> : <Days rows={loginsDaily.data} label="مرّات دخول" />}
          </div>
        </Card>

        {/* ---------------- أوقات الدخول ---------------- */}
        <Card
          title="أوقات الدخول خلال اليوم"
          hint={hourly.ok
            ? hourly.data.source === "audit_log"
              ? `من سجلّ تدقيق Supabase — ${fmt(hourly.data.events)} حدث دخول خلال ٣٠ يوماً.`
              : "سجلُّ التدقيق فارغ، فالرسم من «آخر دخول» لكلِّ مستخدم — نقطةٌ واحدة لكلِّ شخص لا كلُّ دخولٍ له."
            : undefined}
        >
          {!hourly.ok ? <Fail error={hourly.error} /> : <Hours rows={hourly.data.rows} />}
        </Card>

        {/* ---------------- المناطق واللغة ---------------- */}
        <Card title="من أين هم" hint="⚠️ البلدُ الحقيقي غيرُ متاح اليوم — اقرأ السطر الأخير.">
          {!locales.ok ? <Fail error={locales.error} /> : (
            <div className="space-y-2">
              {locales.data.map((l) => {
                const tot = locales.data.reduce((s, x) => s + x.n, 0) || 1;
                return (
                  <div key={l.k}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span>{LOCALE_NAME[l.k] ?? l.k}</span>
                      <span className="tnum text-[var(--color-mut)]">{fmt(l.n)} · {((l.n / tot) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-line)]">
                      <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${(l.n / tot) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <p className="mt-4 rounded-xl bg-[var(--color-panel-2)] p-3 text-[11px] leading-5 text-[var(--color-mut)]">
            <span className="font-semibold text-[var(--color-warn)]">التوزيعُ الجغرافي غيرُ مقروءٍ بعد.</span>{" "}
            قاعدةُ البيانات لا تخزّن بلداً، وIP في سجلّ التدقيق بياناتٌ شخصية لا نجمّعها.
            المصدرُ الصحيح هو Vercel Web Analytics — وهو <span className="text-[var(--color-txt)]">حزمة <code dir="ltr">@vercel/analytics</code> وسطرٌ واحد</span> في
            التطبيق الرئيسي (فيه <code dir="ltr">@vercel/speed-insights</code> ولا يوجد فيه analytics).
            هذا تعديلٌ في مستودع meshahed، فهو من نصيب الإيجنت الآخر لا من نصيب هذه اللوحة.
            وحتى ذلك الحين، شارتُ الساعات أعلاه أصدقُ مؤشّرٍ على المنطقة الزمنية للمستخدمين.
          </p>
        </Card>

        {/* ---------------- الطاقة ---------------- */}
        <Card title="الطاقة والحصص" tone={dbPct !== null && dbPct >= 60 ? "warn" : "none"}
              hint="Supabase على الخطة المجانية — تجاوزُ هذه السقوف يوقف الخدمة، لا يفوترها.">
          <Meter label="قاعدة البيانات" used={dbBytes} total={LIMITS.supabaseFree.dbBytes} />
          <Meter label="المخزن (avatars)" used={stBytes} total={LIMITS.supabaseFree.storageBytes} />
          <Meter label="المستخدمون النشطون شهرياً" used={overview.ok ? overview.data.active_30d : null}
                 total={LIMITS.supabaseFree.mau} unit="count" />
          <Meter label="الخروج الشهري (Egress)" used={null} total={LIMITS.supabaseFree.egressBytes}
                 note="لا يُقرأ من داخل القاعدة — يحتاج Supabase Management PAT أو قراءةً يدوية من لوحة Usage." />
          {!dbSize.ok && <Fail error={dbSize.error} />}
        </Card>

        {/* ---------------- أكبر الجداول ---------------- */}
        <Card title="أين تذهب المساحة" hint="أكبر عشرة جداول — أوّلُ مكانٍ ينمو قبل أن يضرب السقف.">
          {!dbSize.ok ? <Fail error={dbSize.error} /> : (
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-[var(--color-mut)]">
                  <th className="pb-1.5 text-start font-normal">الجدول</th>
                  <th className="pb-1.5 text-end font-normal">صفوف</th>
                  <th className="pb-1.5 text-end font-normal">حجم</th>
                </tr>
              </thead>
              <tbody>
                {dbSize.data.tables.slice(0, 10).map((t) => (
                  <tr key={t.name} className="border-t border-[var(--color-line)]">
                    <td dir="ltr" className="py-1.5 text-start font-mono text-[11px]">{t.name}</td>
                    <td className="tnum py-1.5 text-end text-[var(--color-mut)]">{fmt(t.rows)}</td>
                    <td className="tnum py-1.5 text-end">{bytes(t.bytes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        {/* ---------------- النشر والمستودع ---------------- */}
        <Card title="النشر والمستودع" tone={shaMatch === false ? "bad" : "none"}
              hint="«READY» ليست فحصَ الصحّة — المقارنةُ بين ما ينشره الموقع وما في رأس main هي الفحص.">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="الرئيسية"
                  value={home.ok ? <span className={home.data.status === 200 ? "text-[var(--color-ok)]" : "text-[var(--color-bad)]"}>{home.data.status}</span> : "✕"}
                  sub={home.ok ? `${home.data.ms}ms` : "لا تستجيب"} />
            <Stat label="حجم المستودع" value={repo.ok ? bytes(repo.data.size * 1024) : "—"}
                  sub={repo.ok ? (repo.data.private ? "خاص" : "عام") : undefined} />
          </div>
          <div className="mt-3 space-y-2 text-[12px]">
            <div className="flex items-center justify-between gap-2 rounded-xl bg-[var(--color-panel-2)] px-3 py-2">
              <span className="text-[var(--color-mut)]">رأس main</span>
              <code dir="ltr" className="text-[11px]">{headSha ? headSha.slice(0, 7) : "—"}</code>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-xl bg-[var(--color-panel-2)] px-3 py-2">
              <span className="text-[var(--color-mut)]">المنشور حيّاً</span>
              <code dir="ltr" className="text-[11px]">{liveSha ? liveSha.slice(0, 7) : "—"}</code>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[var(--color-mut)]">التطابق</span>
              {shaMatch === null ? <Pill tone="mut">غير معروف</Pill>
                : shaMatch ? <Pill tone="ok">الإنتاج على الرأس</Pill>
                : <Pill tone="bad">الإنتاج متأخّر — رقِّ الأحدث</Pill>}
            </div>
          </div>
          {commits.ok && (
            <ul className="mt-3 space-y-1 border-t border-[var(--color-line)] pt-2.5">
              {commits.data.slice(0, 4).map((c) => (
                <li key={c.sha} className="flex items-baseline gap-2 text-[11px]">
                  <code dir="ltr" className="shrink-0 text-[var(--color-mut)]">{c.sha.slice(0, 7)}</code>
                  <span className="truncate">{c.commit.message.split("\n")[0]}</span>
                </li>
              ))}
            </ul>
          )}
          {!repo.ok && <div className="mt-2"><Fail error={repo.error} /></div>}
        </Card>

        {/* ---------------- استهلاك API ---------------- */}
        <Card title="الطلبات ومَن نطلب منه">
          <div className="space-y-2.5 text-[12px]">
            <div className="rounded-xl bg-[var(--color-panel-2)] p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-medium">GitHub API</span>
                {rate.ok ? <Pill tone={rate.data.rate.remaining < 10 ? "bad" : "ok"}>
                  {rate.data.rate.remaining} / {rate.data.rate.limit}
                </Pill> : <Pill tone="mut">—</Pill>}
              </div>
              <p className="text-[11px] leading-5 text-[var(--color-mut)]">
                تُستهلَك من هذه اللوحة وحدها. بلا توكن الحدُّ {LIMITS.githubApiAnon} نداء/ساعة.
              </p>
            </div>

            <div className="rounded-xl bg-[var(--color-panel-2)] p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-medium">Vercel</span>
                {vercelConfigured()
                  ? deploys.ok ? <Pill tone="ok">{deploys.data.deployments.length} نشرة أخيرة</Pill> : <Pill tone="bad">فشل</Pill>
                  : <Pill tone="warn">غير مفعّل</Pill>}
              </div>
              <p className="text-[11px] leading-5 text-[var(--color-mut)]">
                {vercelConfigured()
                  ? "الاستهلاك والنشرات تُقرأ من واجهة Vercel."
                  : "أضِف VERCEL_TOKEN في متغيّرات هذا المشروع ليظهر الباندويث والدوال والنشرات. الأرقامُ لا تُخمَّن."}
              </p>
            </div>

            <div className="rounded-xl bg-[var(--color-panel-2)] p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-medium">TMDB</span>
                <Pill tone="warn">لا عدّاد</Pill>
              </div>
              <p className="text-[11px] leading-5 text-[var(--color-mut)]">
                TMDB لا تنشر عدّادَ استهلاك، والنداءات تخرج من خادم Loopz لا من هنا.
                قياسُها الحقيقي يحتاج عدّاداً داخل التطبيق الرئيسي — تعديلٌ في meshahed، أي عملُ الإيجنت الآخر.
                <br />
                💡 وD-164 قلّل ~٢٤٠ نداء OMDb لكلِّ رسمة، فالاتجاه للأسفل أصلاً.
              </p>
            </div>
          </div>
        </Card>

        {/* ---------------- المهامّ المجدولة ---------------- */}
        <Card title="المهامّ المجدولة"
              tone={activeCron && activeCron.length !== 1 ? "warn" : "none"}
              hint="الصحيحُ صفٌّ فعّالٌ واحد: loopz-title-communities يومياً ٣:١٧ فجراً UTC (D-140).">
          {!cron.ok ? <Fail error={cron.error} />
            : cron.data.length === 0 ? (
              <p className="text-[12px] text-[var(--color-mut)]">لا صفوف — إمّا لا صلاحية على cron.job من هذا الدور، أو لا وظائف.</p>
            ) : (
              <ul className="space-y-1.5">
                {cron.data.map((c) => (
                  <li key={c.job} className="flex items-center justify-between gap-2 rounded-xl bg-[var(--color-panel-2)] px-3 py-2 text-[12px]">
                    <code dir="ltr" className="text-[11px]">{c.job}</code>
                    <span className="flex items-center gap-2">
                      <code dir="ltr" className="text-[11px] text-[var(--color-mut)]">{c.schedule}</code>
                      <Pill tone={c.active ? "ok" : "mut"}>{c.active ? "فعّالة" : "متوقّفة"}</Pill>
                    </span>
                  </li>
                ))}
              </ul>
            )}
        </Card>

        {/* ---------------- نبض المحتوى ---------------- */}
        <Card title="نبض المحتوى" hint="هل التطبيق يُستعمل فعلاً، أم الحسابات تُفتح وتُترك.">
          {!content.ok ? <Fail error={content.error} /> : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                ["متابَعات", "follows"], ["حلقات مشاهَدة", "watched_episodes"],
                ["أفلام مشاهَدة", "watched_movies"], ["تقييمات", "ratings"],
                ["قوائم", "lists"], ["عناصر القوائم", "list_items"],
                ["مجتمعات", "communities"], ["رسائل", "community_msgs"],
                ["متابعات بين المستخدمين", "user_follows"],
              ].map(([label, k]) => (
                <Stat key={k} label={label} value={fmt(content.data[k])} />
              ))}
            </div>
          )}
        </Card>

        {/* ---------------- الجهات الخارجية ---------------- */}
        <Card wide title="الجهات المرتبطة بالموقع — الخطط والمخاطر"
              hint="منقولةٌ من 18_Project_Context.md. لو تغيّرت خطّةٌ، تُغيَّر في src/lib/config.ts فقط.">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {PROVIDERS.map((p) => (
              <div key={p.id} className="rounded-xl bg-[var(--color-panel-2)] p-3.5">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold">{p.name}</span>
                  <Pill tone={p.planTone === "paid" ? "ok" : p.planTone === "domain" ? "warn" : "mut"}>{p.plan}</Pill>
                </div>
                <p className="text-[11px] leading-5 text-[var(--color-mut)]">{p.what}</p>
                <p className="mt-2 text-[11px] leading-5">
                  <span className="font-semibold text-[var(--color-warn)]">الخطر: </span>
                  <span className="text-[var(--color-mut)]">{p.risk}</span>
                </p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {p.limits.map((l) => (
                    <span key={l.label} className="rounded-md bg-[var(--color-line)] px-1.5 py-0.5 text-[10px] text-[var(--color-mut)]">
                      {l.label}: <span className="tnum text-[var(--color-txt)]">{l.value}</span>
                    </span>
                  ))}
                </div>
                <a href={p.dashboard} target="_blank" rel="noreferrer"
                   className="mt-2.5 inline-block text-[11px] text-[var(--color-accent)] hover:underline">
                  افتح اللوحة ↗
                </a>
              </div>
            ))}
          </div>
        </Card>

        {/* ---------------- اللقطات اليدوية ---------------- */}
        {snapshots.ok && snapshots.data.length > 0 && (
          <Card wide title="قراءاتٌ يدوية" hint="أرقامٌ لا API لها هنا، تُقرأ من اللوحات وتُسجَّل بتاريخها.">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-[var(--color-mut)]">
                  <th className="pb-1.5 text-start font-normal">الجهة</th>
                  <th className="pb-1.5 text-start font-normal">المقياس</th>
                  <th className="pb-1.5 text-end font-normal">القيمة</th>
                  <th className="pb-1.5 text-end font-normal">قُرئت</th>
                </tr>
              </thead>
              <tbody>
                {snapshots.data.map((s, i) => (
                  <tr key={i} className="border-t border-[var(--color-line)]">
                    <td className="py-1.5">{s.source}</td>
                    <td className="py-1.5 text-[var(--color-mut)]">{s.note ?? s.metric}</td>
                    <td className="tnum py-1.5 text-end">
                      {s.value ?? "—"}{s.limit ? ` / ${s.limit}` : ""} {s.unit ?? ""}
                    </td>
                    <td className="tnum py-1.5 text-end text-[var(--color-mut)]">
                      {new Date(s.taken_at).toLocaleDateString("ar-SA", { timeZone: "Asia/Riyadh" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {/* ---------------- ما لا نعرفه ---------------- */}
        <Card wide title="ما لا تعرفه هذه اللوحة بعد — ولماذا"
              hint="صراحةً، حتى لا تُقرأ الفراغاتُ على أنّها اطمئنان.">
          <ul className="space-y-2 text-[12px] leading-6">
            <li className="flex gap-2">
              <span className="text-[var(--color-warn)]">•</span>
              <span><b>بلدُ المستخدمين.</b> يحتاج <code dir="ltr">@vercel/analytics</code> في التطبيق الرئيسي — تعديلٌ في meshahed، لا هنا.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[var(--color-warn)]">•</span>
              <span><b>باندويث Vercel والدوال والخروج من Supabase.</b> يحتاجان <code dir="ltr">VERCEL_TOKEN</code> و<code dir="ltr">SUPABASE_PAT</code> — خانتان تملؤهما أنت متى شئت، ولا أكتب فيهما شيئاً.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[var(--color-warn)]">•</span>
              <span><b>عددُ نداءات TMDB.</b> لا عدّادَ عندهم ولا عندنا. قياسُه يحتاج عدّاداً في meshahed.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[var(--color-warn)]">•</span>
              <span><b>تاريخُ تجديد النطاق في GoDaddy.</b> غيرُ موثّقٍ في ملفّات المشروع أصلاً — وهو أرخصُ سببٍ ممكن لسقوط الموقع كلِّه.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[var(--color-warn)]">•</span>
              <span><b>الأخطاءُ الحيّة.</b> لا تتبّعَ أخطاء في المشروع (لا Sentry). الوحيدُ المتاح سجلّاتُ Vercel وقتَ الحادث.</span>
            </li>
          </ul>
        </Card>
      </div>

      <footer className="mt-6 text-center text-[11px] leading-5 text-[var(--color-mut)]">
        لوحةٌ خارجية للقراءة فقط · لا تكتب حرفاً في قاعدة بيانات Loopz · لا تلمس مستودع{" "}
        <code dir="ltr">{REPO.owner}/{REPO.name}</code> ·{" "}
        <a href={SITE} target="_blank" rel="noreferrer" className="text-[var(--color-accent)] hover:underline">loopztv.com ↗</a>
      </footer>
    </main>
  );
}
