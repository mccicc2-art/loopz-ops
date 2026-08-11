// نتيجةٌ لا تُسقط اللوحة: مصدرٌ يفشل يقول لماذا، والبقيّة تُرسم.
export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export function unwrap<T>(r: Result<T>): T | null {
  return r.ok ? r.data : null;
}
