// عائلةُ عناصر اللوحة — وصفةٌ واحدة لكلِّ شكل، على قاعدة «One recipe per shape».

import * as React from "react";

export const fmt = (n: number | null | undefined) =>
  n === null || n === undefined || Number.isNaN(n) ? "—" : n.toLocaleString("en-US");

export function bytes(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0, v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v < 10 && i > 0 ? v.toFixed(1) : Math.round(v)} ${u[i]}`;
}

export function Card({
  title, hint, children, tone = "none", wide = false,
}: {
  title: string; hint?: string; children: React.ReactNode;
  tone?: "none" | "ok" | "warn" | "bad"; wide?: boolean;
}) {
  const ring =
    tone === "bad" ? "ring-1 ring-[var(--color-bad)]/40"
    : tone === "warn" ? "ring-1 ring-[var(--color-warn)]/35"
    : tone === "ok" ? "ring-1 ring-[var(--color-ok)]/25"
    : "ring-1 ring-[var(--color-line)]";
  return (
    <section className={`rounded-2xl bg-[var(--color-panel)] ${ring} p-4 sm:p-5 ${wide ? "col-span-full" : ""}`}>
      <header className="mb-3">
        <h2 className="text-sm font-semibold text-[var(--color-txt)]">{title}</h2>
        {hint && <p className="mt-0.5 text-[11px] leading-5 text-[var(--color-mut)]">{hint}</p>}
      </header>
      {children}
    </section>
  );
}

export function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-xl bg-[var(--color-panel-2)] px-3 py-2.5">
      <div className="text-[11px] text-[var(--color-mut)]">{label}</div>
      <div className="tnum mt-0.5 text-xl font-semibold">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-[var(--color-mut)]">{sub}</div>}
    </div>
  );
}

export function Pill({ tone, children }: { tone: "ok" | "warn" | "bad" | "mut"; children: React.ReactNode }) {
  const c = {
    ok: "bg-[var(--color-ok)]/12 text-[var(--color-ok)]",
    warn: "bg-[var(--color-warn)]/12 text-[var(--color-warn)]",
    bad: "bg-[var(--color-bad)]/12 text-[var(--color-bad)]",
    mut: "bg-[var(--color-line)] text-[var(--color-mut)]",
  }[tone];
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${c}`}>{children}</span>;
}

export function Meter({ label, used, total, unit = "bytes", note }: {
  label: string; used: number | null; total: number; unit?: "bytes" | "count"; note?: string;
}) {
  const known = used !== null && !Number.isNaN(used);
  const pct = known ? Math.min(100, (used / total) * 100) : 0;
  const tone = !known ? "mut" : pct >= 85 ? "bad" : pct >= 60 ? "warn" : "ok";
  const color = { ok: "var(--color-ok)", warn: "var(--color-warn)", bad: "var(--color-bad)", mut: "var(--color-line)" }[tone];
  const show = (v: number) => (unit === "bytes" ? bytes(v) : fmt(v));
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-xs text-[var(--color-txt)]">{label}</span>
        <span className="tnum text-xs text-[var(--color-mut)]">
          {known ? `${show(used)} / ${show(total)}` : `؟ / ${show(total)}`}
          {known && <span className="ms-1.5 font-semibold" style={{ color }}>{pct.toFixed(1)}%</span>}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-line)]">
        <div className="h-full rounded-full transition-all" style={{ width: `${known ? Math.max(pct, 0.6) : 0}%`, background: color }} />
      </div>
      {note && <p className="mt-1 text-[11px] text-[var(--color-mut)]">{note}</p>}
    </div>
  );
}

export function Fail({ error }: { error: string }) {
  return (
    <div className="rounded-xl bg-[var(--color-bad)]/8 px-3 py-2.5 text-[12px] leading-5 text-[var(--color-bad)]">
      تعذّرت القراءة — {error}
    </div>
  );
}

// شارتُ أعمدة للساعات (٢٤ عموداً). SVG خالص: لا مكتبة، لا JS في المتصفّح.
export function Hours({ rows }: { rows: { h: number; n: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  const peak = rows.reduce((a, b) => (b.n > a.n ? b : a), rows[0] ?? { h: 0, n: 0 });
  return (
    <div>
      <div dir="ltr" className="flex h-32 items-end gap-[3px]">
        {rows.map((r) => {
          const isPeak = r.n === peak.n && r.n > 0;
          return (
            <div key={r.h} className="group relative flex-1">
              <div
                className="w-full rounded-t-[3px]"
                style={{
                  height: `${Math.max((r.n / max) * 112, r.n > 0 ? 3 : 1)}px`,
                  background: isPeak ? "var(--color-accent)" : "var(--color-line)",
                }}
                title={`${String(r.h).padStart(2, "0")}:00 — ${r.n}`}
              />
            </div>
          );
        })}
      </div>
      <div dir="ltr" className="tnum mt-1.5 flex justify-between text-[10px] text-[var(--color-mut)]">
        <span>00</span><span>06</span><span>12</span><span>18</span><span>23</span>
      </div>
      <p className="mt-2 text-[11px] text-[var(--color-mut)]">
        الذروة الساعة <span className="tnum font-semibold text-[var(--color-accent)]">{String(peak.h).padStart(2, "0")}:00</span> بتوقيت الرياض ({fmt(peak.n)}).
      </p>
    </div>
  );
}

// منحنى يوميّ صغير
export function Days({ rows, label }: { rows: { d: string; n: number }[]; label: string }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  const total = rows.reduce((s, r) => s + r.n, 0);
  return (
    <div>
      <div dir="ltr" className="flex h-20 items-end gap-[2px]">
        {rows.map((r) => (
          <div
            key={r.d}
            className="flex-1 rounded-t-[2px]"
            style={{
              height: `${Math.max((r.n / max) * 72, r.n > 0 ? 3 : 1)}px`,
              background: r.n > 0 ? "var(--color-accent)" : "var(--color-line)",
            }}
            title={`${r.d} — ${r.n}`}
          />
        ))}
      </div>
      <p className="tnum mt-2 text-[11px] text-[var(--color-mut)]">
        {label}: <span className="font-semibold text-[var(--color-txt)]">{fmt(total)}</span> خلال {rows.length} يوماً
      </p>
    </div>
  );
}
