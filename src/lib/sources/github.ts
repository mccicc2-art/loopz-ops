// GitHub — المستودعُ عام، فكلُّ هذا يُقرأ بلا توكن.
// التوكن (GITHUB_TOKEN) اختياريّ: يرفع الحصّة من 60 إلى 5000 نداء/ساعة.

import type { Result } from "./types";
import { REPO } from "../config";

const H: HeadersInit = {
  Accept: "application/vnd.github+json",
  "User-Agent": "loopz-ops",
  ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
};

async function gh<T>(path: string): Promise<Result<T>> {
  try {
    const res = await fetch(`https://api.github.com${path}`, { headers: H, cache: "no-store" });
    if (!res.ok) {
      if (res.status === 403) return { ok: false, error: "حصّةُ GitHub استُهلكت (60 نداء/ساعة بلا توكن)" };
      return { ok: false, error: `GitHub ${res.status}` };
    }
    return { ok: true, data: (await res.json()) as T };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "فشل الاتصال بـGitHub" };
  }
}

export type RepoInfo = {
  size: number;              // بالكيلوبايت
  pushed_at: string;
  open_issues_count: number;
  default_branch: string;
  private: boolean;
};
export type CommitInfo = {
  sha: string;
  commit: { message: string; author: { name: string; date: string } };
};
export type RateInfo = { rate: { limit: number; remaining: number; reset: number } };

export const getRepo    = () => gh<RepoInfo>(`/repos/${REPO.owner}/${REPO.name}`);
export const getCommits = () => gh<CommitInfo[]>(`/repos/${REPO.owner}/${REPO.name}/commits?sha=${REPO.branch}&per_page=10`);
export const getRate    = () => gh<RateInfo>(`/rate_limit`);
