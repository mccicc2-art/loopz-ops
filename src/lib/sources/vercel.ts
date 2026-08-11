// Vercel — يحتاج توكن قراءة (VERCEL_TOKEN) يضيفه أحمد بنفسه.
// بدونه: اللوحة تقول «غير مفعّل» وتشرح الخطوة، ولا تكذب بصفرٍ أو بشرطة.

import type { Result } from "./types";

const TOKEN = process.env.VERCEL_TOKEN ?? "";
const TEAM = process.env.VERCEL_TEAM_ID ?? "team_2yKW4MmxZPLBUAhi1IUCSL8P";
const PROJECT = process.env.VERCEL_PROJECT ?? "meshahed";

export const vercelConfigured = () => Boolean(TOKEN);

async function v<T>(path: string): Promise<Result<T>> {
  if (!TOKEN) return { ok: false, error: "VERCEL_TOKEN غير مضبوط" };
  try {
    const sep = path.includes("?") ? "&" : "?";
    const res = await fetch(`https://api.vercel.com${path}${sep}teamId=${TEAM}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, error: `Vercel ${res.status}` };
    return { ok: true, data: (await res.json()) as T };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "فشل الاتصال بـVercel" };
  }
}

export type Deployment = {
  uid: string; name: string; url: string; state: string; target: string | null;
  created: number; readyState: string;
  meta?: { githubCommitSha?: string; githubCommitMessage?: string };
};

export const getDeployments = () =>
  v<{ deployments: Deployment[] }>(`/v6/deployments?app=${PROJECT}&limit=20`);
